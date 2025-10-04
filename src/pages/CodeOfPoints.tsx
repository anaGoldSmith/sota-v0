import { ArrowLeft, FileText, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CodeOfPoints = () => {
  const navigate = useNavigate();

  // Fetch FIG Code of Points files
  const { data: figCOPFiles } = useQuery({
    queryKey: ["rulebooks", "FIG Code of Points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rulebooks")
        .select("*")
        .eq("category", "FIG Code of Points")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch other COPs
  const { data: otherCOPs } = useQuery({
    queryKey: ["rulebooks", "other"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rulebooks")
        .select("*")
        .neq("category", "FIG Code of Points")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleFileClick = (filePath: string) => {
    const { data } = supabase.storage.from("rulebooks").getPublicUrl(filePath);
    window.open(data.publicUrl, "_blank");
  };

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
          Rule Books
        </h1>
        <Button 
          variant="default" 
          size="icon" 
          className="rounded-full"
          onClick={() => navigate("/admin")}
        >
          <Upload className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* FIG Code of Points Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">FIG Code of Points</h2>
          <div className="space-y-4">
            {figCOPFiles && figCOPFiles.length > 0 ? (
              figCOPFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-6 border-2 border-primary rounded-xl hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleFileClick(file.file_path)}
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{file.title}</h3>
                      {file.description && (
                        <p className="text-sm text-muted-foreground">{file.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 border-2 border-muted rounded-xl bg-muted/50">
                <p className="text-muted-foreground">No files uploaded yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Other COPs Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Other COPs</h2>
          <div className="space-y-4">
            {otherCOPs && otherCOPs.length > 0 ? (
              otherCOPs.map((file) => (
                <div
                  key={file.id}
                  className="p-6 border-2 border-muted rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
                  onClick={() => handleFileClick(file.file_path)}
                >
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{file.title}</h3>
                      {file.description && (
                        <p className="text-sm text-muted-foreground">{file.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 border-2 border-muted rounded-xl bg-muted/50">
                <h3 className="text-lg font-semibold mb-2 text-muted-foreground">Additional Resources</h3>
                <p className="text-muted-foreground">Other code of points files will be added here</p>
              </div>
            )}
          </div>
        </section>

        {/* Search Bar Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Search</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search in Code of Points..." 
              className="pl-10 h-12 text-lg"
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default CodeOfPoints;

