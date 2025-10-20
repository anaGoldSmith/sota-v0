import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Admin = () => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("FIG Code of Points");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rulebooks, setRulebooks] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Jump symbol upload states
  const [symbolFile, setSymbolFile] = useState<File | null>(null);
  const [symbolCode, setSymbolCode] = useState("");
  const [uploadingSymbol, setUploadingSymbol] = useState(false);
  const symbolInputRef = useRef<HTMLInputElement>(null);
  
  // CSV import states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  // Balance CSV import states
  const [balanceCsvFile, setBalanceCsvFile] = useState<File | null>(null);
  const [importingBalanceCsv, setImportingBalanceCsv] = useState(false);
  const balanceCsvInputRef = useRef<HTMLInputElement>(null);
  
  // Rotation CSV import states
  const [rotationCsvFile, setRotationCsvFile] = useState<File | null>(null);
  const [importingRotationCsv, setImportingRotationCsv] = useState(false);
  const rotationCsvInputRef = useRef<HTMLInputElement>(null);
  
  // Criteria CSV import states
  const [criteriaCsvFile, setCriteriaCsvFile] = useState<File | null>(null);
  const [importingCriteriaCsv, setImportingCriteriaCsv] = useState(false);
  const criteriaCsvInputRef = useRef<HTMLInputElement>(null);
  
  // Criteria symbol upload states
  const [criteriaSymbolFiles, setCriteriaSymbolFiles] = useState<File[]>([]);
  const [uploadingCriteriaSymbol, setUploadingCriteriaSymbol] = useState(false);
  const criteriaSymbolInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

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
      fetchRulebooks();
    };

    checkAdminStatus();
  }, [navigate]);

  const fetchRulebooks = async () => {
    const { data, error } = await supabase
      .from('rulebooks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error("Failed to load rulebooks");
      return;
    }
    
    setRulebooks(data || []);
  };

  const handleDelete = async (filePath: string, id: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    
    setDeleting(id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('delete-rulebook', {
        body: { file_path: filePath },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;

      toast.success("File deleted successfully!");
      fetchRulebooks();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || "Failed to delete file");
    } finally {
      setDeleting(null);
    }
  };

  const handleFileSelect = (f: File | null) => {
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      toast.error("Please select a PDF file");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error("File is too large (max 20MB)");
      return;
    }
    setFile(f);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] || null);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0] || null;
    handleFileSelect(f);
  };
  const testStoragePermissions = async () => {
    try {
      console.log("🧪 Testing storage upload permissions...");
      const testFile = new Blob(["test"], { type: "text/plain" });
      const testPath = `test-permissions-${Date.now()}.txt`;
      
      const { data, error } = await supabase.storage
        .from('rulebooks')
        .upload(testPath, testFile);

      if (error) {
        console.error("❌ Storage test FAILED:", {
          message: error.message,
          name: error.name,
          status: (error as any).status,
          statusCode: (error as any).statusCode,
          fullError: error
        });
        toast.error(`Storage test failed: ${error.message}`);
        return;
      }

      console.log("✅ Storage test PASSED:", data);
      toast.success("Storage write permissions OK!");
      
      // Clean up test file
      await supabase.storage.from('rulebooks').remove([testPath]);
    } catch (error: any) {
      console.error("❌ Storage test exception:", error);
      toast.error(`Test exception: ${error.message}`);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setImportingCsv(true);

    try {
      // Read CSV file content
      const csvContent = await csvFile.text();
      
      // Call edge function to import
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('import-jumps-csv', {
        body: { csvContent },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setCsvFile(null);
        if (csvInputRef.current) csvInputRef.current.value = '';
      } else {
        toast.error(data.error || "Import failed");
      }
      
    } catch (error: any) {
      console.error('CSV import error:', error);
      toast.error(`Import failed: ${error.message || "Unknown error"}`);
    } finally {
      setImportingCsv(false);
    }
  };

  const handleBalanceCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!balanceCsvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setImportingBalanceCsv(true);

    try {
      const csvContent = await balanceCsvFile.text();
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('import-balances-csv', {
        body: { csvContent },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setBalanceCsvFile(null);
        if (balanceCsvInputRef.current) balanceCsvInputRef.current.value = '';
      } else {
        toast.error(data.error || "Import failed");
      }
      
    } catch (error: any) {
      console.error('Balance CSV import error:', error);
      toast.error(`Import failed: ${error.message || "Unknown error"}`);
    } finally {
      setImportingBalanceCsv(false);
    }
  };

  const handleRotationCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rotationCsvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setImportingRotationCsv(true);

    try {
      const csvContent = await rotationCsvFile.text();
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('import-rotations-csv', {
        body: { csvContent },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setRotationCsvFile(null);
        if (rotationCsvInputRef.current) rotationCsvInputRef.current.value = '';
      } else {
        toast.error(data.error || "Import failed");
      }
      
    } catch (error: any) {
      console.error('Rotation CSV import error:', error);
      toast.error(`Import failed: ${error.message || "Unknown error"}`);
    } finally {
      setImportingRotationCsv(false);
    }
  };

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

  const handleSymbolUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbolFile || !symbolCode) {
      toast.error("Please provide both an image and jump code");
      return;
    }

    setUploadingSymbol(true);

    try {
      // Upload image to jump-symbols bucket
      const fileExt = symbolFile.name.split('.').pop();
      const fileName = `${symbolCode}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('jump-symbols')
        .upload(fileName, symbolFile, { 
          contentType: symbolFile.type,
          upsert: true 
        });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        setUploadingSymbol(false);
        return;
      }

      // Update jump record with symbol filename
      const { error: updateError } = await supabase
        .from('jumps')
        .update({ symbol_image: fileName })
        .eq('code', symbolCode);

      if (updateError) {
        toast.error(`Database update failed: ${updateError.message}`);
        setUploadingSymbol(false);
        return;
      }

      toast.success(`Symbol for ${symbolCode} uploaded successfully!`);
      
      // Reset form
      setSymbolCode("");
      setSymbolFile(null);
      if (symbolInputRef.current) symbolInputRef.current.value = '';
      
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingSymbol(false);
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
        // Extract code from filename (remove extension)
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const code = fileNameWithoutExt;

        try {
          // Upload image to criteria-symbols bucket
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

          // Update criteria record with symbol filename
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
      
      // Show result toast
      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully uploaded ${successCount} symbol${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(`Uploaded ${successCount} symbols, ${failCount} failed`);
      } else {
        toast.error("All uploads failed");
      }
      
      // Reset form
      setCriteriaSymbolFiles([]);
      if (criteriaSymbolInputRef.current) criteriaSymbolInputRef.current.value = '';
      
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingCriteriaSymbol(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !title) {
      toast.error("Please provide both a file and title");
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log("📤 Starting storage upload:", { filePath, fileSize: file.size, fileType: file.type });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rulebooks')
        .upload(filePath, file, { contentType: 'application/pdf', upsert: false });

      if (uploadError) {
        console.error("❌ Storage upload FAILED:", {
          message: uploadError.message,
          name: uploadError.name,
          status: (uploadError as any).status,
          statusCode: (uploadError as any).statusCode,
          fullError: uploadError
        });
        toast.error(`Storage upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      console.log("✅ Storage upload SUCCESS:", uploadData);

      // Insert metadata into database
      console.log("📝 Starting database insert:", { title, category, filePath });

      const { data: dbData, error: dbError } = await supabase
        .from('rulebooks')
        .insert({
          title,
          description: description || null,
          file_path: filePath,
          file_size: file.size,
          category,
        })
        .select();

      if (dbError) {
        console.error("❌ Database insert FAILED:", {
          message: dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint,
          fullError: dbError
        });
        toast.error(`Database insert failed: ${dbError.message}`);
        setUploading(false);
        return;
      }

      console.log("✅ Database insert SUCCESS:", dbData);
      toast.success("File uploaded successfully!");
      
      // Reset form
      setTitle("");
      setDescription("");
      setCategory("FIG Code of Points");
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Refresh the list
      fetchRulebooks();
      
    } catch (error: any) {
      console.error("❌ Upload exception:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        fullError: error
      });
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
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
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Admin - Upload Files
        </h1>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* CSV Import Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Import Jumps from CSV</CardTitle>
            <CardDescription>
              Upload a CSV file to import jump data. This will replace all existing jumps.
              <br />
              Required columns: code, name, description, value, turn_degrees, symbol_image
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCsvImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-input">CSV File</Label>
                <Input
                  id="csv-input"
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  required
                />
                {csvFile && (
                  <p className="text-sm text-muted-foreground">{csvFile.name}</p>
                )}
              </div>
              
              <Button type="submit" disabled={importingCsv} className="w-full">
                {importingCsv ? "Importing..." : "Import CSV"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Balance CSV Import Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Import Balances from CSV</CardTitle>
            <CardDescription>
              Upload a CSV file to import balance data. This will replace all existing balances.
              <br />
              Required columns: code, name, description, value, symbol_image
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBalanceCsvImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="balance-csv-input">CSV File</Label>
                <Input
                  id="balance-csv-input"
                  ref={balanceCsvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setBalanceCsvFile(e.target.files?.[0] || null)}
                  required
                />
                {balanceCsvFile && (
                  <p className="text-sm text-muted-foreground">{balanceCsvFile.name}</p>
                )}
              </div>
              
              <Button type="submit" disabled={importingBalanceCsv} className="w-full">
                {importingBalanceCsv ? "Importing..." : "Import CSV"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Rotation CSV Import Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Import Rotations from CSV</CardTitle>
            <CardDescription>
              Upload a CSV file to import rotation data. This will replace all existing rotations.
              <br />
              Required columns: code, name, description, value, turn_degrees, symbol_image
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRotationCsvImport} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rotation-csv-input">CSV File</Label>
                <Input
                  id="rotation-csv-input"
                  ref={rotationCsvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setRotationCsvFile(e.target.files?.[0] || null)}
                  required
                />
                {rotationCsvFile && (
                  <p className="text-sm text-muted-foreground">{rotationCsvFile.name}</p>
                )}
              </div>
              
              <Button type="submit" disabled={importingRotationCsv} className="w-full">
                {importingRotationCsv ? "Importing..." : "Import CSV"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Criteria CSV Import Section */}
        <Card className="mb-8">
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

        {/* Jump Symbol Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Jump Symbol</CardTitle>
            <CardDescription>Upload symbol images for jumps and link them to jump codes</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSymbolUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbol-code">Jump Code</Label>
                <Input
                  id="symbol-code"
                  value={symbolCode}
                  onChange={(e) => setSymbolCode(e.target.value)}
                  placeholder="e.g., 1.101"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="symbol-input">Symbol Image (PNG/JPG)</Label>
                <Input
                  id="symbol-input"
                  ref={symbolInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={(e) => setSymbolFile(e.target.files?.[0] || null)}
                  required
                />
                {symbolFile && (
                  <p className="text-sm text-muted-foreground">{symbolFile.name}</p>
                )}
              </div>
              
              <Button type="submit" disabled={uploadingSymbol} className="w-full">
                {uploadingSymbol ? "Uploading..." : "Upload Symbol"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Criteria Symbol Upload Section */}
        <Card className="mb-8">
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

        {/* PDF Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Rulebook PDF</CardTitle>
            <CardDescription>Upload PDF rulebooks and documentation</CardDescription>
          </CardHeader>
          <CardContent>
        <form onSubmit={handleFileUpload} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file-input">PDF File</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-primary bg-accent/30' : 'border-border hover:border-primary'}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <Input
                id="file-input"
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={onInputChange}
                className="hidden"
              />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                {file ? file.name : "Drag & drop a PDF here, or select from your device"}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Select PDF
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={testStoragePermissions}>
                  Test Upload
                </Button>
                {file && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value=''; }}>
                    Clear
                  </Button>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Max 20MB. PDF only.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 2025-2028 Code of Points"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIG Code of Points">FIG Code of Points</SelectItem>
                <SelectItem value="National COP">National COP</SelectItem>
                <SelectItem value="Regional COP">Regional COP</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={uploading} className="w-full">
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
        </form>
          </CardContent>
        </Card>

        {/* Existing Files Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4">Uploaded Files</h2>
          {rulebooks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No files uploaded yet</p>
          ) : (
            <div className="space-y-4">
              {rulebooks.map((book) => (
                <Card key={book.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{book.title}</CardTitle>
                        {book.description && (
                          <CardDescription className="mt-1">{book.description}</CardDescription>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          Category: {book.category} • {new Date(book.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(book.file_path, book.id)}
                        disabled={deleting === book.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
