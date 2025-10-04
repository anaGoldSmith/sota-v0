import { ArrowLeft, Search, Upload } from "lucide-react";
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

  const handleFileClick = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("rulebooks")
        .download(filePath);

      if (error) throw error;

      // Create a blob URL and open it
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      
      // Clean up the blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Error accessing file:", error);
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {figCOPFiles && figCOPFiles.length > 0 ? (
              figCOPFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-primary text-primary-foreground rounded-xl p-6 flex flex-col items-center text-center shadow-lg"
                >
                  <h3 className="text-sm font-medium mb-2">Rhythmic</h3>
                  <h4 className="text-lg font-bold mb-1">{file.title}</h4>
                  <p className="text-sm opacity-90 mb-4">(PDF)</p>
                  {file.description && (
                    <p className="text-sm opacity-80 mb-4">{file.description}</p>
                  )}
                  <Button
                    variant="secondary"
                    className="mt-auto w-full max-w-[150px]"
                    onClick={() => handleFileClick(file.file_path)}
                  >
                    Access
                  </Button>
                </div>
              ))
            ) : (
              <div className="col-span-full p-6 border-2 border-muted rounded-xl bg-muted/50">
                <p className="text-muted-foreground">No files uploaded yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Other COPs Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Other COPs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherCOPs && otherCOPs.length > 0 ? (
              otherCOPs.map((file) => (
                <div
                  key={file.id}
                  className="bg-secondary text-secondary-foreground rounded-xl p-6 flex flex-col items-center text-center shadow-lg"
                >
                  <h3 className="text-sm font-medium mb-2">Code of Points</h3>
                  <h4 className="text-lg font-bold mb-1">{file.title}</h4>
                  <p className="text-sm opacity-90 mb-4">(PDF)</p>
                  {file.description && (
                    <p className="text-sm opacity-80 mb-4">{file.description}</p>
                  )}
                  <Button
                    variant="outline"
                    className="mt-auto w-full max-w-[150px]"
                    onClick={() => handleFileClick(file.file_path)}
                  >
                    Access
                  </Button>
                </div>
              ))
            ) : (
              <div className="col-span-full p-6 border-2 border-muted rounded-xl bg-muted/50">
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

