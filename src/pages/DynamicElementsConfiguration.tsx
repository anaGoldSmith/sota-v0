import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Upload, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DynamicElementsConfiguration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploadingCatches, setUploadingCatches] = useState(false);
  const [uploadingThrows, setUploadingThrows] = useState(false);
  const [uploadingGeneralCriteria, setUploadingGeneralCriteria] = useState(false);
  const [uploadingCatchesSymbols, setUploadingCatchesSymbols] = useState(false);
  const [uploadingThrowsSymbols, setUploadingThrowsSymbols] = useState(false);
  const [uploadingGeneralCriteriaSymbols, setUploadingGeneralCriteriaSymbols] = useState(false);
  
  const catchesInputRef = useRef<HTMLInputElement>(null);
  const throwsInputRef = useRef<HTMLInputElement>(null);
  const generalCriteriaInputRef = useRef<HTMLInputElement>(null);
  const catchesSymbolsInputRef = useRef<HTMLInputElement>(null);
  const throwsSymbolsInputRef = useRef<HTMLInputElement>(null);
  const generalCriteriaSymbolsInputRef = useRef<HTMLInputElement>(null);

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

  const handleCsvUpload = async (
    file: File, 
    functionName: string, 
    setUploading: (val: boolean) => void,
    entityName: string
  ) => {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to upload CSV files");
        return;
      }

      const csvContent = await file.text();
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { csvContent },
      });

      if (error) {
        console.error(`Error uploading ${entityName}:`, error);
        toast.error(`Failed to upload ${entityName}: ${error.message}`);
        return;
      }

      if (data?.success) {
        toast.success(data.message || `Successfully imported ${entityName}`);
      } else {
        toast.error(data?.error || `Failed to import ${entityName}`);
      }
    } catch (error) {
      console.error(`Error uploading ${entityName}:`, error);
      toast.error(`Failed to upload ${entityName}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSymbolsUpload = async (
    files: FileList,
    tableName: 'dynamic_catches' | 'dynamic_throws' | 'dynamic_general_criteria',
    setUploading: (val: boolean) => void,
    entityName: string
  ) => {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to upload symbols");
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const file of Array.from(files)) {
        const fileName = file.name;
        const code = fileName.replace(/\.[^/.]+$/, ""); // Remove extension to get code

        // Check if a record with this code exists
        const { data: existingRecord, error: queryError } = await supabase
          .from(tableName)
          .select('id, code')
          .eq('code', code)
          .maybeSingle();

        if (queryError) {
          console.error(`Error checking for ${code}:`, queryError);
          errorCount++;
          continue;
        }

        if (!existingRecord) {
          console.warn(`No ${entityName} found with code: ${code}`);
          errorCount++;
          continue;
        }

        // Upload to storage
        const filePath = `${tableName}/${code}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('dynamic-element-symbols')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error(`Error uploading symbol for ${code}:`, uploadError);
          errorCount++;
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('dynamic-element-symbols')
          .getPublicUrl(filePath);

        // Update the record with the symbol URL
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ symbol_image: publicUrl })
          .eq('code', code);

        if (updateError) {
          console.error(`Error updating ${code} with symbol:`, updateError);
          errorCount++;
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} ${entityName} symbol(s)`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} symbol(s) could not be matched or uploaded`);
      }
    } catch (error) {
      console.error(`Error uploading ${entityName} symbols:`, error);
      toast.error(`Failed to upload ${entityName} symbols`);
    } finally {
      setUploading(false);
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
          Dynamic Elements Configuration
        </h1>
        <div className="w-10" />
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* CSV Upload Section */}
        <h2 className="text-xl font-semibold mb-4 text-foreground">CSV Data Import</h2>
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          {/* Catches CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>Catches</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: code, apparatus, extra criteria, name, notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={catchesInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-dynamic-catches-csv', setUploadingCatches, 'catches');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => catchesInputRef.current?.click()}
                disabled={uploadingCatches}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingCatches ? "Uploading..." : "Upload Catches CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* Throws CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>Throws</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: code, apparatus, name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={throwsInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-dynamic-throws-csv', setUploadingThrows, 'throws');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => throwsInputRef.current?.click()}
                disabled={uploadingThrows}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingThrows ? "Uploading..." : "Upload Throws CSV"}
              </Button>
            </CardContent>
          </Card>

          {/* General Criteria CSV Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <CardTitle>General Criteria</CardTitle>
              </div>
              <CardDescription>
                Upload CSV with columns: code, name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                ref={generalCriteriaInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvUpload(file, 'import-dynamic-general-criteria-csv', setUploadingGeneralCriteria, 'general criteria');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => generalCriteriaInputRef.current?.click()}
                disabled={uploadingGeneralCriteria}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingGeneralCriteria ? "Uploading..." : "Upload General Criteria CSV"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Symbols Upload Section */}
        <h2 className="text-xl font-semibold mb-4 text-foreground">Symbol Images Upload</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upload symbol images with filenames matching the code (e.g., "C1.png" for code "C1"). 
          Multiple files can be selected at once.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Catches Symbols Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Image className="h-8 w-8 text-primary" />
                <CardTitle>Catches Symbols</CardTitle>
              </div>
              <CardDescription>
                Upload images named by code (e.g., C1.png)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={catchesSymbolsInputRef}
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleSymbolsUpload(files, 'dynamic_catches', setUploadingCatchesSymbols, 'catches');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => catchesSymbolsInputRef.current?.click()}
                disabled={uploadingCatchesSymbols}
                className="w-full"
                variant="outline"
              >
                <Image className="h-4 w-4 mr-2" />
                {uploadingCatchesSymbols ? "Uploading..." : "Upload Catches Symbols"}
              </Button>
            </CardContent>
          </Card>

          {/* Throws Symbols Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Image className="h-8 w-8 text-primary" />
                <CardTitle>Throws Symbols</CardTitle>
              </div>
              <CardDescription>
                Upload images named by code (e.g., T1.png)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={throwsSymbolsInputRef}
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleSymbolsUpload(files, 'dynamic_throws', setUploadingThrowsSymbols, 'throws');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => throwsSymbolsInputRef.current?.click()}
                disabled={uploadingThrowsSymbols}
                className="w-full"
                variant="outline"
              >
                <Image className="h-4 w-4 mr-2" />
                {uploadingThrowsSymbols ? "Uploading..." : "Upload Throws Symbols"}
              </Button>
            </CardContent>
          </Card>

          {/* General Criteria Symbols Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Image className="h-8 w-8 text-primary" />
                <CardTitle>General Criteria Symbols</CardTitle>
              </div>
              <CardDescription>
                Upload images named by code (e.g., GC1.png)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={generalCriteriaSymbolsInputRef}
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleSymbolsUpload(files, 'dynamic_general_criteria', setUploadingGeneralCriteriaSymbols, 'general criteria');
                    e.target.value = '';
                  }
                }}
              />
              <Button
                onClick={() => generalCriteriaSymbolsInputRef.current?.click()}
                disabled={uploadingGeneralCriteriaSymbols}
                className="w-full"
                variant="outline"
              >
                <Image className="h-4 w-4 mr-2" />
                {uploadingGeneralCriteriaSymbols ? "Uploading..." : "Upload General Criteria Symbols"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DynamicElementsConfiguration;
