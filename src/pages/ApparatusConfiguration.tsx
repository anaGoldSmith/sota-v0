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
import { ApparatusType } from "@/types/apparatus";

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

  // DA tables upload states
  const [daTablesFiles, setDaTablesFiles] = useState<File[]>([]);
  const [uploadingDaTables, setUploadingDaTables] = useState(false);
  const daTablesInputRef = useRef<HTMLInputElement>(null);

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

  // TE Symbol upload states
  const [ballTeSymbolFiles, setBallTeSymbolFiles] = useState<File[]>([]);
  const [hoopTeSymbolFiles, setHoopTeSymbolFiles] = useState<File[]>([]);
  const [clubsTeSymbolFiles, setClubsTeSymbolFiles] = useState<File[]>([]);
  const [ribbonTeSymbolFiles, setRibbonTeSymbolFiles] = useState<File[]>([]);
  const [uploadingTeSymbol, setUploadingTeSymbol] = useState<string | null>(null);
  const ballTeSymbolInputRef = useRef<HTMLInputElement>(null);
  const hoopTeSymbolInputRef = useRef<HTMLInputElement>(null);
  const clubsTeSymbolInputRef = useRef<HTMLInputElement>(null);
  const ribbonTeSymbolInputRef = useRef<HTMLInputElement>(null);

  // DA Comments CSV import states
  const [daCommentsCsvFile, setDaCommentsCsvFile] = useState<File | null>(null);
  const [daCommentsApparatus, setDaCommentsApparatus] = useState<string>("hoop");
  const [importingDaCommentsCsv, setImportingDaCommentsCsv] = useState(false);
  const daCommentsCsvInputRef = useRef<HTMLInputElement>(null);


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

  const handleDaTablesUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (daTablesFiles.length === 0) {
      toast.error("Please select at least one CSV file");
      return;
    }

    setUploadingDaTables(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let successCount = 0;
      let failCount = 0;

      for (const file of daTablesFiles) {
        const fileName = file.name.toLowerCase().replace('.csv', '');
        
        const tableMap: Record<string, string> = {
          'hoop_da': 'import-hoop-bases-csv',
          'ball_da': 'import-ball-bases-csv',
          'clubs_da': 'import-clubs-bases-csv',
          'ribbon_da': 'import-ribbon-bases-csv',
        };

        const functionName = tableMap[fileName];
        
        if (!functionName) {
          console.warn(`Skipping ${file.name} - filename must match: hoop_da.csv, ball_da.csv, clubs_da.csv, or ribbon_da.csv`);
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
        toast.success(`Successfully imported ${successCount} DA table${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Imported ${successCount} tables, ${failCount} failed`);
      } else {
        toast.error("All imports failed");
      }

      setDaTablesFiles([]);
      if (daTablesInputRef.current) daTablesInputRef.current.value = '';

    } catch (error: any) {
      console.error('DA tables upload error:', error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingDaTables(false);
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

      const tableMap: Record<'ball' | 'hoop' | 'clubs' | 'ribbon', string> = {
        ball: 'ball_technical_elements',
        hoop: 'hoop_technical_elements',
        clubs: 'clubs_technical_elements',
        ribbon: 'ribbon_technical_elements'
      };

      const bucket = bucketMap[apparatus];
      const table = tableMap[apparatus];
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
            .from(table as any)
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

  const handleTeSymbolUpload = async (
    apparatus: 'ball' | 'hoop' | 'clubs' | 'ribbon',
    files: File[],
    inputRef: React.RefObject<HTMLInputElement>,
    setFiles: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    if (files.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    setUploadingTeSymbol(apparatus);

    try {
      const bucketMap = {
        ball: 'ball-technical-elements-symbols',
        hoop: 'hoop-technical-elements-symbols',
        clubs: 'clubs-technical-elements-symbols',
        ribbon: 'ribbon-technical-elements-symbols'
      };

      const tableMap: Record<string, 'ball_technical_elements' | 'hoop_technical_elements' | 'clubs_technical_elements' | 'ribbon_technical_elements'> = {
        ball: 'ball_technical_elements',
        hoop: 'hoop_technical_elements',
        clubs: 'clubs_technical_elements',
        ribbon: 'ribbon_technical_elements'
      };

      const bucket = bucketMap[apparatus];
      const table = tableMap[apparatus] as 'ball_technical_elements' | 'hoop_technical_elements' | 'clubs_technical_elements' | 'ribbon_technical_elements';
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
      setUploadingTeSymbol(null);
    }
  };

  const handleDaCommentsCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!daCommentsCsvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setImportingDaCommentsCsv(true);

    try {
      const csvContent = await daCommentsCsvFile.text();
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('import-da-comments-csv', {
        body: { csvContent, apparatus: daCommentsApparatus },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setDaCommentsCsvFile(null);
        if (daCommentsCsvInputRef.current) daCommentsCsvInputRef.current.value = '';
      } else {
        toast.error(data.error || "Import failed");
      }
      
    } catch (error: any) {
      console.error('DA Comments CSV import error:', error);
      toast.error(`Import failed: ${error.message || "Unknown error"}`);
    } finally {
      setImportingDaCommentsCsv(false);
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
              
              {/* Upload DA Tables */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload DA Tables</CardTitle>
                  <CardDescription>
                    Upload CSV files for all four apparatus DA tables. You can select multiple files at once (recommended: 4 files).
                    <br />
                    File names must match: hoop_da.csv, ball_da.csv, clubs_da.csv, ribbon_da.csv
                    <br />
                    Required columns: code, name, description, value, Cr1V, Cr2H, Cr3L, Cr7R, Cr4F, Cr5W, Cr6DB
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDaTablesUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="da-tables-input">CSV Files</Label>
                      <Input
                        id="da-tables-input"
                        ref={daTablesInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        multiple
                        onChange={(e) => setDaTablesFiles(Array.from(e.target.files || []))}
                      />
                      {daTablesFiles.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {daTablesFiles.length} file{daTablesFiles.length > 1 ? 's' : ''} selected:
                          <ul className="list-disc list-inside mt-1">
                            {daTablesFiles.map((f, i) => <li key={i}>{f.name}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <Button type="submit" disabled={uploadingDaTables} className="w-full">
                      {uploadingDaTables ? "Uploading..." : "Upload DA Tables"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* DA Comments CSV Import */}
              <Card>
                <CardHeader>
                  <CardTitle>Import DA Comments from CSV</CardTitle>
                  <CardDescription>
                    Upload a CSV file to import DA-specific comments. This will replace all existing comments for the selected apparatus.
                    <br />
                    Required columns: code, comment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDaCommentsCsvImport} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="da-apparatus">Apparatus</Label>
                      <select
                        id="da-apparatus"
                        value={daCommentsApparatus}
                        onChange={(e) => setDaCommentsApparatus(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="hoop">Hoop</option>
                        <option value="ball">Ball</option>
                        <option value="clubs">Clubs</option>
                        <option value="ribbon">Ribbon</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="da-comments-csv-input">CSV File</Label>
                      <Input
                        id="da-comments-csv-input"
                        ref={daCommentsCsvInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        onChange={(e) => setDaCommentsCsvFile(e.target.files?.[0] || null)}
                        required
                      />
                      {daCommentsCsvFile && (
                        <p className="text-sm text-muted-foreground">{daCommentsCsvFile.name}</p>
                      )}
                    </div>
                    
                    <Button type="submit" disabled={importingDaCommentsCsv} className="w-full">
                      {importingDaCommentsCsv ? "Importing..." : "Import CSV"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

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

              {/* Ball TE Symbols */}
              <Card>
                <CardHeader>
                  <CardTitle>Import Symbols for Ball Technical Elements</CardTitle>
                  <CardDescription>
                    Upload PNG symbol images for ball technical elements. File names must match the code column (e.g., B01.png for code B01)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ball-te-symbol-input">PNG Images</Label>
                      <Input
                        id="ball-te-symbol-input"
                        ref={ballTeSymbolInputRef}
                        type="file"
                        accept=".png,image/png"
                        multiple
                        onChange={(e) => setBallTeSymbolFiles(Array.from(e.target.files || []))}
                      />
                      {ballTeSymbolFiles.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {ballTeSymbolFiles.length} file{ballTeSymbolFiles.length > 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleTeSymbolUpload('ball', ballTeSymbolFiles, ballTeSymbolInputRef, setBallTeSymbolFiles)} 
                      disabled={uploadingTeSymbol === 'ball'} 
                      className="w-full"
                    >
                      {uploadingTeSymbol === 'ball' ? "Uploading..." : "Upload Ball TE Symbols"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Hoop TE Symbols */}
              <Card>
                <CardHeader>
                  <CardTitle>Import Symbols for Hoop Technical Elements</CardTitle>
                  <CardDescription>
                    Upload PNG symbol images for hoop technical elements. File names must match the code column (e.g., H01.png for code H01)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hoop-te-symbol-input">PNG Images</Label>
                      <Input
                        id="hoop-te-symbol-input"
                        ref={hoopTeSymbolInputRef}
                        type="file"
                        accept=".png,image/png"
                        multiple
                        onChange={(e) => setHoopTeSymbolFiles(Array.from(e.target.files || []))}
                      />
                      {hoopTeSymbolFiles.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {hoopTeSymbolFiles.length} file{hoopTeSymbolFiles.length > 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleTeSymbolUpload('hoop', hoopTeSymbolFiles, hoopTeSymbolInputRef, setHoopTeSymbolFiles)} 
                      disabled={uploadingTeSymbol === 'hoop'} 
                      className="w-full"
                    >
                      {uploadingTeSymbol === 'hoop' ? "Uploading..." : "Upload Hoop TE Symbols"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Clubs TE Symbols */}
              <Card>
                <CardHeader>
                  <CardTitle>Import Symbols for Clubs Technical Elements</CardTitle>
                  <CardDescription>
                    Upload PNG symbol images for clubs technical elements. File names must match the code column (e.g., C01.png for code C01)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clubs-te-symbol-input">PNG Images</Label>
                      <Input
                        id="clubs-te-symbol-input"
                        ref={clubsTeSymbolInputRef}
                        type="file"
                        accept=".png,image/png"
                        multiple
                        onChange={(e) => setClubsTeSymbolFiles(Array.from(e.target.files || []))}
                      />
                      {clubsTeSymbolFiles.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {clubsTeSymbolFiles.length} file{clubsTeSymbolFiles.length > 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleTeSymbolUpload('clubs', clubsTeSymbolFiles, clubsTeSymbolInputRef, setClubsTeSymbolFiles)} 
                      disabled={uploadingTeSymbol === 'clubs'} 
                      className="w-full"
                    >
                      {uploadingTeSymbol === 'clubs' ? "Uploading..." : "Upload Clubs TE Symbols"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Ribbon TE Symbols */}
              <Card>
                <CardHeader>
                  <CardTitle>Import Symbols for Ribbon Technical Elements</CardTitle>
                  <CardDescription>
                    Upload PNG symbol images for ribbon technical elements. File names must match the code column (e.g., R01.png for code R01)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ribbon-te-symbol-input">PNG Images</Label>
                      <Input
                        id="ribbon-te-symbol-input"
                        ref={ribbonTeSymbolInputRef}
                        type="file"
                        accept=".png,image/png"
                        multiple
                        onChange={(e) => setRibbonTeSymbolFiles(Array.from(e.target.files || []))}
                      />
                      {ribbonTeSymbolFiles.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {ribbonTeSymbolFiles.length} file{ribbonTeSymbolFiles.length > 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={() => handleTeSymbolUpload('ribbon', ribbonTeSymbolFiles, ribbonTeSymbolInputRef, setRibbonTeSymbolFiles)} 
                      disabled={uploadingTeSymbol === 'ribbon'} 
                      className="w-full"
                    >
                      {uploadingTeSymbol === 'ribbon' ? "Uploading..." : "Upload Ribbon TE Symbols"}
                    </Button>
                  </div>
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
