import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

const getFunctionsUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const projectId = supabaseUrl?.match(/https:\/\/([^.]+)/)?.[1];
  return projectId 
    ? `https://${projectId}.supabase.co/functions/v1`
    : `${supabaseUrl}/functions/v1`;
};

const PdfViewer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const filePath = searchParams.get("path");
  const fileName = searchParams.get("name") || "document.pdf";

  useEffect(() => {
    if (!filePath) {
      setError("No file specified");
      setLoading(false);
      return;
    }

    const loadPdf = async () => {
      try {
        setLoading(true);
        
        // Try direct storage access first
        const { data: blob, error: storageError } = await supabase.storage
          .from("rulebooks")
          .download(filePath);

        let pdfBlob: Blob;

        if (storageError || !blob) {
          console.log("Direct storage failed, using proxy...");
          
          // Fallback to proxy
          const functionsUrl = getFunctionsUrl();
          const proxyUrl = `${functionsUrl}/serve-rulebook?path=${encodeURIComponent(filePath)}`;
          
          const response = await fetch(proxyUrl);
          if (!response.ok) throw new Error("Failed to load PDF");
          
          pdfBlob = await response.blob();
        } else {
          pdfBlob = blob;
        }

        // Create blob URL
        const blobUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(blobUrl);

        // Trigger download
        const downloadLink = document.createElement("a");
        downloadLink.href = blobUrl;
        downloadLink.download = fileName;
        downloadLink.click();

        setLoading(false);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF");
        setLoading(false);
      }
    };

    loadPdf();

    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [filePath, fileName]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{error || "Failed to load PDF"}</p>
          <Button onClick={() => navigate("/code-of-points")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Code of Points
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b p-4 flex items-center gap-4">
        <Button onClick={() => navigate("/code-of-points")} variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold truncate">{fileName}</h1>
      </div>
      <iframe
        src={pdfUrl}
        className="flex-1 w-full border-0"
        title={fileName}
      />
    </div>
  );
};

export default PdfViewer;
