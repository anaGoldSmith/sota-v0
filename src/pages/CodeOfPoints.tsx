import { ArrowLeft, Search, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CodeOfPoints = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
    // Open blank tab immediately (synchronous) to avoid popup blocker
    const newTab = window.open('about:blank', '_blank');
    
    try {
      const { data } = supabase.storage
        .from("rulebooks")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;
      if (newTab && publicUrl) {
        newTab.location.href = publicUrl;
      }
    } catch (error) {
      console.error("Error accessing file:", error);
      if (newTab) newTab.close();
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to access the file. Please try downloading instead.",
      });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    // Force a download in a synchronously opened tab to preserve user gesture
    const newTab = window.open('about:blank', '_blank');

    try {
      const { data } = supabase.storage
        .from("rulebooks")
        .getPublicUrl(filePath);

      const baseUrl = data.publicUrl;
      if (newTab && baseUrl) {
        const url = baseUrl + (baseUrl.includes("?") ? "&" : "?") + "download=1";
        newTab.location.href = url;
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if (newTab) newTab.close();
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to download the file. Please try again.",
      });
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
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => handleFileClick(file.file_path)}
                    >
                      Access
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => handleDownload(file.file_path, `${file.title}.pdf`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
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
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleFileClick(file.file_path)}
                    >
                      Access
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDownload(file.file_path, `${file.title}.pdf`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
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

