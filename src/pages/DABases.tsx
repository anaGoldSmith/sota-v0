import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DABases = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
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
          onClick={() => navigate("/admin/apparatus-configuration")}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          DA Bases
        </h1>
        <div className="w-10" />
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
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
      </main>
    </div>
  );
};

export default DABases;
