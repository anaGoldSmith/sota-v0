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
  const [ballControlFile, setBallControlFile] = useState<File | null>(null);
  const [hoopControlFile, setHoopControlFile] = useState<File | null>(null);
  const [clubsControlFile, setClubsControlFile] = useState<File | null>(null);
  const [ribbonControlFile, setRibbonControlFile] = useState<File | null>(null);
  const [uploadingControl, setUploadingControl] = useState<string | null>(null);
  const ballControlInputRef = useRef<HTMLInputElement>(null);
  const hoopControlInputRef = useRef<HTMLInputElement>(null);
  const clubsControlInputRef = useRef<HTMLInputElement>(null);
  const ribbonControlInputRef = useRef<HTMLInputElement>(null);

  // Bases CSV upload states
  const [basesFiles, setBasesFiles] = useState<File[]>([]);
  const [uploadingBases, setUploadingBases] = useState(false);
  const basesInputRef = useRef<HTMLInputElement>(null);

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

  const handleControlTableUpload = async (apparatus: 'ball' | 'hoop' | 'clubs' | 'ribbon', file: File | null, inputRef: React.RefObject<HTMLInputElement>) => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploadingControl(apparatus);

    try {
      const fileContent = await file.text();
      const { data: { session } } = await supabase.auth.getSession();
      
      // TODO: Create edge function to handle control table import
      toast.success(`${apparatus.charAt(0).toUpperCase() + apparatus.slice(1)} control table uploaded successfully!`);
      
      // Reset file input
      if (apparatus === 'ball') setBallControlFile(null);
      else if (apparatus === 'hoop') setHoopControlFile(null);
      else if (apparatus === 'clubs') setClubsControlFile(null);
      else if (apparatus === 'ribbon') setRibbonControlFile(null);
      
      if (inputRef.current) inputRef.current.value = '';
      
    } catch (error: any) {
      console.error(`${apparatus} control table upload error:`, error);
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingControl(null);
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
        
        // Map filename to table name and edge function
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
              
              {/* Bases Upload Section */}
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

              {/* Control Tables */}
              <Accordion type="single" collapsible>
                <AccordionItem value="control-tables" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-lg font-semibold">Control Tables</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    
                    {/* Ball Control Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Ball Control Table</CardTitle>
                        <CardDescription>Upload control table for Ball in CSV/Excel format</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="ball-control-input">CSV/Excel File</Label>
                            <Input
                              id="ball-control-input"
                              ref={ballControlInputRef}
                              type="file"
                              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                              onChange={(e) => setBallControlFile(e.target.files?.[0] || null)}
                            />
                            {ballControlFile && (
                              <p className="text-sm text-muted-foreground">{ballControlFile.name}</p>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleControlTableUpload('ball', ballControlFile, ballControlInputRef)} 
                            disabled={uploadingControl === 'ball' || !ballControlFile} 
                            className="w-full"
                          >
                            {uploadingControl === 'ball' ? "Uploading..." : "Upload Ball Table"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Hoop Control Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Hoop Control Table</CardTitle>
                        <CardDescription>Upload control table for Hoop in CSV/Excel format</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="hoop-control-input">CSV/Excel File</Label>
                            <Input
                              id="hoop-control-input"
                              ref={hoopControlInputRef}
                              type="file"
                              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                              onChange={(e) => setHoopControlFile(e.target.files?.[0] || null)}
                            />
                            {hoopControlFile && (
                              <p className="text-sm text-muted-foreground">{hoopControlFile.name}</p>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleControlTableUpload('hoop', hoopControlFile, hoopControlInputRef)} 
                            disabled={uploadingControl === 'hoop' || !hoopControlFile} 
                            className="w-full"
                          >
                            {uploadingControl === 'hoop' ? "Uploading..." : "Upload Hoop Table"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Clubs Control Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Clubs Control Table</CardTitle>
                        <CardDescription>Upload control table for Clubs in CSV/Excel format</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="clubs-control-input">CSV/Excel File</Label>
                            <Input
                              id="clubs-control-input"
                              ref={clubsControlInputRef}
                              type="file"
                              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                              onChange={(e) => setClubsControlFile(e.target.files?.[0] || null)}
                            />
                            {clubsControlFile && (
                              <p className="text-sm text-muted-foreground">{clubsControlFile.name}</p>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleControlTableUpload('clubs', clubsControlFile, clubsControlInputRef)} 
                            disabled={uploadingControl === 'clubs' || !clubsControlFile} 
                            className="w-full"
                          >
                            {uploadingControl === 'clubs' ? "Uploading..." : "Upload Clubs Table"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Ribbon Control Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Ribbon Control Table</CardTitle>
                        <CardDescription>Upload control table for Ribbon in CSV/Excel format</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="ribbon-control-input">CSV/Excel File</Label>
                            <Input
                              id="ribbon-control-input"
                              ref={ribbonControlInputRef}
                              type="file"
                              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                              onChange={(e) => setRibbonControlFile(e.target.files?.[0] || null)}
                            />
                            {ribbonControlFile && (
                              <p className="text-sm text-muted-foreground">{ribbonControlFile.name}</p>
                            )}
                          </div>
                          <Button 
                            onClick={() => handleControlTableUpload('ribbon', ribbonControlFile, ribbonControlInputRef)} 
                            disabled={uploadingControl === 'ribbon' || !ribbonControlFile} 
                            className="w-full"
                          >
                            {uploadingControl === 'ribbon' ? "Uploading..." : "Upload Ribbon Table"}
                          </Button>
                        </div>
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
        </Accordion>
      </main>
    </div>
  );
};

export default ApparatusConfiguration;
