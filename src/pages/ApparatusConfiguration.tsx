import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ApparatusConfiguration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Criteria CSV import states
  const [criteriaCsvFile, setCriteriaCsvFile] = useState<File | null>(null);
  const [importingCriteriaCsv, setImportingCriteriaCsv] = useState(false);
  const criteriaCsvInputRef = useRef<HTMLInputElement>(null);
  
  // Criteria symbol upload states
  const [criteriaSymbolFiles, setCriteriaSymbolFiles] = useState<File[]>([]);
  const [uploadingCriteriaSymbol, setUploadingCriteriaSymbol] = useState(false);
  const criteriaSymbolInputRef = useRef<HTMLInputElement>(null);

  // Control tables upload states
  const [controlFiles, setControlFiles] = useState<File[]>([]);
  const [uploadingControl, setUploadingControl] = useState(false);
  const controlInputRef = useRef<HTMLInputElement>(null);

  // Bases CSV upload states
  const [basesFiles, setBasesFiles] = useState<File[]>([]);
  const [uploadingBases, setUploadingBases] = useState(false);
  const basesInputRef = useRef<HTMLInputElement>(null);

  // Base symbols upload states
  const [ballBasesSymbolFiles, setBallBasesSymbolFiles] = useState<File[]>([]);
  const [hoopBasesSymbolFiles, setHoopBasesSymbolFiles] = useState<File[]>([]);
  const [clubsBasesSymbolFiles, setClubsBasesSymbolFiles] = useState<File[]>([]);
  const [ribbonBasesSymbolFiles, setRibbonBasesSymbolFiles] = useState<File[]>([]);
  const [uploadingBaseSymbol, setUploadingBaseSymbol] = useState<string | null>(null);
  const ballBasesSymbolInputRef = useRef<HTMLInputElement>(null);
  const hoopBasesSymbolInputRef = useRef<HTMLInputElement>(null);
  const clubsBasesSymbolInputRef = useRef<HTMLInputElement>(null);
  const ribbonBasesSymbolInputRef = useRef<HTMLInputElement>(null);

  // TE Config upload states
  const [teFiles, setTeFiles] = useState<File[]>([]);
  const [uploadingTe, setUploadingTe] = useState(false);
  const teInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });

      if (error || !data) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAdminStatus();
  }, [navigate]);

  const handleCriteriaCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!criteriaCsvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setImportingCriteriaCsv(true);

    try {
      const csvContent = await criteriaCsvFile.text();
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('import-criteria-csv', {
        body: { csvContent },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setCriteriaCsvFile(null);
        if (criteriaCsvInputRef.current) criteriaCsvInputRef.current.value = '';
      } else {
        toast.error(data.error || "Import failed");
      }
      
    } catch (error: any) {
      console.error('Criteria CSV import error:', error);
      toast.error(`Import failed: ${error.message || "Unknown error"}`);
    } finally {
      setImportingCriteriaCsv(false);
    }
  };

  const handleCriteriaSymbolUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (criteriaSymbolFiles.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    setUploadingCriteriaSymbol(true);

    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const file of criteriaSymbolFiles) {
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const code = fileNameWithoutExt;

        try {
          const { error: uploadError } = await supabase.storage
            .from('criteria-symbols')
            .upload(file.name, file, { 
              contentType: file.type,
              upsert: true 
            });

          if (uploadError) {
            console.error(`Upload failed for ${file.name}:`, uploadError);
            failCount++;
            continue;
          }

          const { error: updateError } = await supabase
            .from('criteria')
            .update({ symbol_image: file.name })
            .eq('code', code);

          if (updateError) {
            console.error(`Database update failed for ${code}:`, updateError);
            failCount++;
          } else {
            successCount++;
          }
        } catch (error: any) {
          console.error(`Error processing ${file.name}:`, error);
          failCount++;
        }
      }
      
      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully uploaded ${successCount} symbol${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Uploaded ${successCount} symbols, ${failCount} failed`);
      } else {
        toast.error("All uploads failed");
      }
      
      setCriteriaSymbolFiles([]);
      if (criteriaSymbolInputRef.current) criteriaSymbolInputRef.current.value = '';
      
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingCriteriaSymbol(false);
    }
  };

  const handleControlTablesUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (controlFiles.length === 0) {
      toast.error("Please select at least one CSV file");
      return;
    }

    setUploadingControl(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let successCount = 0;
      let failCount = 0;

      for (const file of controlFiles) {
        const fileName = file.name.toLowerCase().replace('.csv', '');
        
        const tableMap: Record<string, string> = {
          'ball_control': 'ball_control',
          'hoop_control': 'hoop_control',
          'clubs_control': 'clubs_control',
          'ribbon_control': 'ribbon_control',
        };

        const tableName = tableMap[fileName];
        
        if (!tableName) {
          console.warn(`Skipping ${file.name} - filename must match: ball_control.csv, hoop_control.csv, clubs_control.csv, or ribbon_control.csv`);
          failCount++;
          continue;
        }

        try {
          const csvContent = await file.text();
          
          const { data, error } = await supabase.functions.invoke('import-control-tables-csv', {
            body: { csvContent, tableName },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            }
          });

          if (error) throw error;

          if (data.success) {
            successCount++;
            console.log(`Successfully imported ${file.name}`);
          } else {
            failCount++;
            console.error(`Failed to import ${file.name}:`, data.error);
          }
        } catch (error: any) {
          console.error(`Error importing ${file.name}:`, error);
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully imported ${successCount} control table${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Imported ${successCount} tables, ${failCount} failed`);
      } else {
        toast.error("All imports failed");
      }

      setControlFiles([]);
      if (controlInputRef.current) controlInputRef.current.value = '';

    } catch (error: any) {
      console.error('Control tables upload error:', error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingControl(false);
    }
  };

  const handleBasesUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (basesFiles.length === 0) {
      toast.error("Please select at least one CSV file");
      return;
    }

    setUploadingBases(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let successCount = 0;
      let failCount = 0;

      for (const file of basesFiles) {
        const fileName = file.name.toLowerCase().replace('.csv', '');
        
        const tableMap: Record<string, string> = {
          'hoop_bases': 'import-hoop-bases-csv',
          'ball_bases': 'import-ball-bases-csv',
          'clubs_bases': 'import-clubs-bases-csv',
          'ribbon_bases': 'import-ribbon-bases-csv',
        };

        const functionName = tableMap[fileName];
        
        if (!functionName) {
          console.warn(`Skipping ${file.name} - filename must match: hoop_bases.csv, ball_bases.csv, clubs_bases.csv, or ribbon_bases.csv`);
          failCount++;
          continue;
        }

        try {
          const csvContent = await file.text();
          
          const { data, error } = await supabase.functions.invoke(functionName, {
            body: { csvContent },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            }
          });

          if (error) throw error;

          if (data.success) {
            successCount++;
            console.log(`Successfully imported ${file.name}`);
          } else {
            failCount++;
            console.error(`Failed to import ${file.name}:`, data.error);
          }
        } catch (error: any) {
          console.error(`Error importing ${file.name}:`, error);
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully imported ${successCount} file${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Imported ${successCount} files, ${failCount} failed`);
      } else {
        toast.error("All imports failed");
      }

      setBasesFiles([]);
      if (basesInputRef.current) basesInputRef.current.value = '';

    } catch (error: any) {
      console.error('Bases upload error:', error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingBases(false);
    }
  };

  const handleBaseSymbolUpload = async (
    apparatus: 'ball' | 'hoop' | 'clubs' | 'ribbon',
    files: File[],
    inputRef: React.RefObject<HTMLInputElement>,
    setFiles: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    if (files.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    setUploadingBaseSymbol(apparatus);

    try {
      const bucketMap = {
        ball: 'ball-bases-symbols',
        hoop: 'hoop-bases-symbols',
        clubs: 'clubs-bases-symbols',
        ribbon: 'ribbon-bases-symbols'
      };

      const tableMap: Record<string, 'ball_bases' | 'hoop_bases' | 'clubs_bases' | 'ribbon_bases'> = {
        ball: 'ball_bases',
        hoop: 'hoop_bases',
        clubs: 'clubs_bases',
        ribbon: 'ribbon_bases'
      };

      const bucket = bucketMap[apparatus];
      const table = tableMap[apparatus] as 'ball_bases' | 'hoop_bases' | 'clubs_bases' | 'ribbon_bases';
      let successCount = 0;
      let failCount = 0;
      
      for (const file of files) {
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const code = fileNameWithoutExt;

        try {
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(file.name, file, { 
              contentType: file.type,
              upsert: true 
            });

          if (uploadError) {
            console.error(`Upload failed for ${file.name}:`, uploadError);
            failCount++;
            continue;
          }

          const { error: updateError } = await supabase
            .from(table)
            .update({ symbol_image: file.name })
            .eq('code', code);

          if (updateError) {
            console.error(`Database update failed for ${code}:`, updateError);
            failCount++;
          } else {
            successCount++;
          }
        } catch (error: any) {
          console.error(`Error processing ${file.name}:`, error);
          failCount++;
        }
      }
      
      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully uploaded ${successCount} ${apparatus} symbol${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Uploaded ${successCount} symbols, ${failCount} failed`);
      } else {
        toast.error("All uploads failed");
      }
      
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingBaseSymbol(null);
    }
  };

  const handleTeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (teFiles.length === 0) {
      toast.error("Please select at least one CSV file");
      return;
    }

    setUploadingTe(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let successCount = 0;
      let failCount = 0;

      for (const file of teFiles) {
        const fileName = file.name.toLowerCase().replace('.csv', '');
        
        const tableMap: Record<string, string> = {
          'hoop_technical_elements': 'import-hoop-technical-elements-csv',
          'ball_technical_elements': 'import-ball-technical-elements-csv',
          'clubs_technical_elements': 'import-clubs-technical-elements-csv',
          'ribbon_technical_elements': 'import-ribbon-technical-elements-csv',
        };

        const functionName = tableMap[fileName];
        
        if (!functionName) {
          console.warn(`Skipping ${file.name} - filename must match: hoop_technical_elements.csv, ball_technical_elements.csv, clubs_technical_elements.csv, or ribbon_technical_elements.csv`);
          failCount++;
          continue;
        }

        try {
          const csvContent = await file.text();
          
          const { data, error } = await supabase.functions.invoke(functionName, {
            body: { csvContent },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            }
          });

          if (error) throw error;

          if (data.success) {
            successCount++;
            console.log(`Successfully imported ${file.name}`);
          } else {
            failCount++;
            console.error(`Failed to import ${file.name}:`, data.error);
          }
        } catch (error: any) {
          console.error(`Error importing ${file.name}:`, error);
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully imported ${successCount} file${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Imported ${successCount} files, ${failCount} failed`);
      } else {
        toast.error("All imports failed");
      }

      setTeFiles([]);
      if (teInputRef.current) teInputRef.current.value = '';

    } catch (error: any) {
      console.error('TE upload error:', error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingTe(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Apparatus Configuration
        </h1>
        <div className="w-10" />
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Accordion type="single" collapsible className="space-y-4">
          {/* DAs Config Section */}
          <AccordionItem value="das-config" className="border rounded-lg px-4">
            <AccordionTrigger className="text-xl font-semibold">DAs Config</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              
              {/* DA Bases */}
              <Accordion type="single" collapsible>
                <AccordionItem value="da-bases" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-lg font-semibold">DA Bases</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Import Bases from CSV</CardTitle>
                        <CardDescription>
                          Upload CSV files for hoop, ball, clubs, and ribbon bases. You can select multiple files at once.
                          <br />
                          File names must match: hoop_bases.csv, ball_bases.csv, clubs_bases.csv, ribbon_bases.csv
                          <br />
                          Required columns: code, name, description, value
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleBasesUpload} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="bases-input">CSV Files</Label>
                            <Input
                              id="bases-input"
                              ref={basesInputRef}
                              type="file"
                              accept=".csv,text/csv"
                              multiple
                              onChange={(e) => setBasesFiles(Array.from(e.target.files || []))}
                            />
                            {basesFiles.length > 0 && (
                              <div className="text-sm text-muted-foreground">
                                {basesFiles.length} file{basesFiles.length > 1 ? 's' : ''} selected:
                                <ul className="list-disc list-inside mt-1">
                                  {basesFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          <Button type="submit" disabled={uploadingBases} className="w-full">
                            {uploadingBases ? "Uploading..." : "Upload Bases CSV"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Ball Bases Symbols */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Ball Bases Symbols</CardTitle>
                        <CardDescription>
                          Upload PNG symbol images for ball bases. File names must match the code column (e.g., B01.png for code B01)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="ball-bases-symbol-input">PNG Images</Label>
                            <Input
                              id="ball-bases-symbol-input"
                              ref={ballBasesSymbolInputRef}
                              type="file"
                              accept=".png,image/png"
                              multiple
                              onChange={(e) => setBallBasesSymbolFiles(Array.from(e.target.files || []))}
                            />
                            {ballBasesSymbolFiles.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {ballBasesSymbolFiles.length} file{ballBasesSymbolFiles.length > 1 ? 's' : ''} selected
                              </p>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleBaseSymbolUpload('ball', ballBasesSymbolFiles, ballBasesSymbolInputRef, setBallBasesSymbolFiles)} 
                            disabled={uploadingBaseSymbol === 'ball'} 
                            className="w-full"
                          >
                            {uploadingBaseSymbol === 'ball' ? "Uploading..." : "Upload Ball Symbols"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Hoop Bases Symbols */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Hoop Bases Symbols</CardTitle>
                        <CardDescription>
                          Upload PNG symbol images for hoop bases. File names must match the code column (e.g., H01.png for code H01)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="hoop-bases-symbol-input">PNG Images</Label>
                            <Input
                              id="hoop-bases-symbol-input"
                              ref={hoopBasesSymbolInputRef}
                              type="file"
                              accept=".png,image/png"
                              multiple
                              onChange={(e) => setHoopBasesSymbolFiles(Array.from(e.target.files || []))}
                            />
                            {hoopBasesSymbolFiles.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {hoopBasesSymbolFiles.length} file{hoopBasesSymbolFiles.length > 1 ? 's' : ''} selected
                              </p>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleBaseSymbolUpload('hoop', hoopBasesSymbolFiles, hoopBasesSymbolInputRef, setHoopBasesSymbolFiles)} 
                            disabled={uploadingBaseSymbol === 'hoop'} 
                            className="w-full"
                          >
                            {uploadingBaseSymbol === 'hoop' ? "Uploading..." : "Upload Hoop Symbols"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Clubs Bases Symbols */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Clubs Bases Symbols</CardTitle>
                        <CardDescription>
                          Upload PNG symbol images for clubs bases. File names must match the code column (e.g., C01.png for code C01)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="clubs-bases-symbol-input">PNG Images</Label>
                            <Input
                              id="clubs-bases-symbol-input"
                              ref={clubsBasesSymbolInputRef}
                              type="file"
                              accept=".png,image/png"
                              multiple
                              onChange={(e) => setClubsBasesSymbolFiles(Array.from(e.target.files || []))}
                            />
                            {clubsBasesSymbolFiles.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {clubsBasesSymbolFiles.length} file{clubsBasesSymbolFiles.length > 1 ? 's' : ''} selected
                              </p>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleBaseSymbolUpload('clubs', clubsBasesSymbolFiles, clubsBasesSymbolInputRef, setClubsBasesSymbolFiles)} 
                            disabled={uploadingBaseSymbol === 'clubs'} 
                            className="w-full"
                          >
                            {uploadingBaseSymbol === 'clubs' ? "Uploading..." : "Upload Clubs Symbols"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ribbon Bases Symbols */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Ribbon Bases Symbols</CardTitle>
                        <CardDescription>
                          Upload PNG symbol images for ribbon bases. File names must match the code column (e.g., R01.png for code R01)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="ribbon-bases-symbol-input">PNG Images</Label>
                            <Input
                              id="ribbon-bases-symbol-input"
                              ref={ribbonBasesSymbolInputRef}
                              type="file"
                              accept=".png,image/png"
                              multiple
                              onChange={(e) => setRibbonBasesSymbolFiles(Array.from(e.target.files || []))}
                            />
                            {ribbonBasesSymbolFiles.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {ribbonBasesSymbolFiles.length} file{ribbonBasesSymbolFiles.length > 1 ? 's' : ''} selected
                              </p>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleBaseSymbolUpload('ribbon', ribbonBasesSymbolFiles, ribbonBasesSymbolInputRef, setRibbonBasesSymbolFiles)} 
                            disabled={uploadingBaseSymbol === 'ribbon'} 
                            className="w-full"
                          >
                            {uploadingBaseSymbol === 'ribbon' ? "Uploading..." : "Upload Ribbon Symbols"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Control Tables */}
              <Accordion type="single" collapsible>
                <AccordionItem value="control-tables" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-lg font-semibold">Control Tables</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Import Control Tables from CSV</CardTitle>
                        <CardDescription>
                          Upload CSV files for ball, hoop, clubs, and ribbon control tables. You can select multiple files at once.
                          <br />
                          File names must match: ball_control.csv, hoop_control.csv, clubs_control.csv, ribbon_control.csv
                          <br />
                          Required columns: code, Cr1V, Cr2H, Cr3L, Cr7R, Cr4F, Cr5W, Cr6DB (values must be Y or N)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleControlTablesUpload} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="control-input">CSV Files</Label>
                            <Input
                              id="control-input"
                              ref={controlInputRef}
                              type="file"
                              accept=".csv,text/csv"
                              multiple
                              onChange={(e) => setControlFiles(Array.from(e.target.files || []))}
                            />
                            {controlFiles.length > 0 && (
                              <div className="text-sm text-muted-foreground">
                                {controlFiles.length} file{controlFiles.length > 1 ? 's' : ''} selected:
                                <ul className="list-disc list-inside mt-1">
                                  {controlFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          <Button type="submit" disabled={uploadingControl} className="w-full">
                            {uploadingControl ? "Uploading..." : "Upload Control Tables"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* DA Criteria */}
              <Accordion type="single" collapsible>
                <AccordionItem value="da-criteria" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-lg font-semibold">DA Criteria</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    
                    {/* Criteria CSV Import */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Import Criteria from CSV</CardTitle>
                        <CardDescription>
                          Upload a CSV file to import criteria symbols. This will replace all existing criteria.
                          <br />
                          Required columns: code, name, description, symbol_image
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCriteriaCsvImport} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="criteria-csv-input">CSV File</Label>
                            <Input
                              id="criteria-csv-input"
                              ref={criteriaCsvInputRef}
                              type="file"
                              accept=".csv,text/csv"
                              onChange={(e) => setCriteriaCsvFile(e.target.files?.[0] || null)}
                              required
                            />
                            {criteriaCsvFile && (
                              <p className="text-sm text-muted-foreground">{criteriaCsvFile.name}</p>
                            )}
                          </div>
                          
                          <Button type="submit" disabled={importingCriteriaCsv} className="w-full">
                            {importingCriteriaCsv ? "Importing..." : "Import CSV"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                    {/* Criteria Symbol Upload */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Upload Criteria Symbols</CardTitle>
                        <CardDescription>Upload multiple symbol images for criteria. Image filenames must match the criteria codes (e.g., Cr1V.png for code Cr1V)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleCriteriaSymbolUpload} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="criteria-symbol-input">Symbol Images (PNG)</Label>
                            <Input
                              id="criteria-symbol-input"
                              ref={criteriaSymbolInputRef}
                              type="file"
                              accept="image/png"
                              multiple
                              onChange={(e) => setCriteriaSymbolFiles(Array.from(e.target.files || []))}
                              required
                            />
                            {criteriaSymbolFiles.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {criteriaSymbolFiles.length} file{criteriaSymbolFiles.length > 1 ? 's' : ''} selected
                              </p>
                            )}
                          </div>
                          
                          <Button type="submit" disabled={uploadingCriteriaSymbol} className="w-full">
                            {uploadingCriteriaSymbol ? "Uploading..." : `Upload ${criteriaSymbolFiles.length > 0 ? criteriaSymbolFiles.length : ''} Symbol${criteriaSymbolFiles.length !== 1 ? 's' : ''}`}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>

                  </AccordionContent>
                </AccordionItem>
              </Accordion>

            </AccordionContent>
          </AccordionItem>

          {/* TE Config Section */}
          <AccordionItem value="te-config" className="border rounded-lg px-4">
            <AccordionTrigger className="text-xl font-semibold">TE Config</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Import Technical Elements from CSV</CardTitle>
                  <CardDescription>
                    Upload CSV files for hoop, ball, clubs, and ribbon technical elements. You can select multiple files at once.
                    <br />
                    File names must match: hoop_technical_elements.csv, ball_technical_elements.csv, clubs_technical_elements.csv, ribbon_technical_elements.csv
                    <br />
                    Required columns: parentGroup, parentGroupCode, technicalElement, DA, specialCode, code, name, description, dataInformationAboutTE (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTeUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="te-input">CSV Files</Label>
                      <Input
                        id="te-input"
                        ref={teInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        multiple
                        onChange={(e) => setTeFiles(Array.from(e.target.files || []))}
                      />
                      {teFiles.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {teFiles.length} file{teFiles.length > 1 ? 's' : ''} selected:
                          <ul className="list-disc list-inside mt-1">
                            {teFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <Button type="submit" disabled={uploadingTe} className="w-full">
                      {uploadingTe ? "Uploading..." : "Upload Technical Elements CSV"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  );
};

export default ApparatusConfiguration;
