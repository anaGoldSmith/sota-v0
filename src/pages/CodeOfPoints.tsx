import { ArrowLeft, Search, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Helper to derive functions URL
const getFunctionsUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return supabaseUrl.replace('.supabase.co', '.functions.supabase.co');
};

// Helper to open a viewer tab with loading message
const openViewerTab = () => {
  const newTab = window.open('about:blank', '_blank');
  if (newTab) {
    newTab.document.write('<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;">Loading PDF...</body></html>');
  }
  return newTab;
};

// Helper to render a blob in a new tab
const renderBlobInTab = (tab: Window | null, blob: Blob, title: string) => {
  if (!tab) return;
  const blobUrl = URL.createObjectURL(blob);
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          iframe { width: 100vw; height: 100vh; border: none; }
        </style>
      </head>
      <body>
        <iframe src="${blobUrl}" type="application/pdf"></iframe>
      </body>
    </html>
  `;
  tab.document.open();
  tab.document.write(html);
  tab.document.close();
  
  // Revoke blob URL after a delay to avoid memory leaks
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
};

// Helper to download a blob
const downloadBlob = (blob: Blob, filename: string) => {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Revoke blob URL after download
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
};

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

  const handleFileClick = async (filePath: string, fileName: string) => {
    const newTab = openViewerTab();
    
    try {
      // First, try direct storage download
      const { data, error } = await supabase.storage
        .from("rulebooks")
        .download(filePath);

      if (error) throw error;

      renderBlobInTab(newTab, data, fileName);
    } catch (error) {
      console.error("Error accessing file via storage:", error);
      
      // Fallback: use backend proxy
      try {
        const functionsUrl = getFunctionsUrl();
        const response = await fetch(
          `${functionsUrl}/serve-rulebook?path=${encodeURIComponent(filePath)}&dl=0`
        );
        
        if (!response.ok) throw new Error('Proxy fetch failed');
        
        const blob = await response.blob();
        renderBlobInTab(newTab, blob, fileName);
      } catch (fallbackError) {
        console.error("Error accessing file via proxy:", fallbackError);
        if (newTab) newTab.close();
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to access the file. Please try downloading instead.",
        });
      }
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      // First, try direct storage download
      const { data, error } = await supabase.storage
        .from("rulebooks")
        .download(filePath);

      if (error) throw error;

      downloadBlob(data, fileName);
    } catch (error) {
      console.error("Error downloading file via storage:", error);
      
      // Fallback: use backend proxy
      try {
        const functionsUrl = getFunctionsUrl();
        const response = await fetch(
          `${functionsUrl}/serve-rulebook?path=${encodeURIComponent(filePath)}&dl=1`
        );
        
        if (!response.ok) throw new Error('Proxy fetch failed');
        
        const blob = await response.blob();
        downloadBlob(blob, fileName);
      } catch (fallbackError) {
        console.error("Error downloading file via proxy:", fallbackError);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Unable to download the file. Please try again.",
        });
      }
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
                      onClick={() => handleFileClick(file.file_path, file.title)}
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
                      onClick={() => handleFileClick(file.file_path, file.title)}
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

