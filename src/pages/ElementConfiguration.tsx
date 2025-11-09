import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ElementConfiguration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
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

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setImportingCsv(true);

    try {
      const csvContent = await csvFile.text();
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

  const handleSymbolUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbolFile || !symbolCode) {
      toast.error("Please provide both an image and jump code");
      return;
    }

    setUploadingSymbol(true);

    try {
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
      
      setSymbolCode("");
      setSymbolFile(null);
      if (symbolInputRef.current) symbolInputRef.current.value = '';
      
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message || "Unknown error"}`);
    } finally {
      setUploadingSymbol(false);
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
          Element Configuration
        </h1>
        <div className="w-10" />
      </header>

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

        {/* DA Comments CSV Import Section */}
        <Card className="mb-8">
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
      </main>
    </div>
  );
};

export default ElementConfiguration;
