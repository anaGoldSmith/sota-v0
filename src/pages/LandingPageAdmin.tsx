import { useState, useEffect } from "react";
import { ArrowLeft, Upload, Image, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LandingPageAdmin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [eventsUploading, setEventsUploading] = useState(false);
  const [imagesUploading, setImagesUploading] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data } = await supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' });
      if (!data) { toast.error("Access denied."); navigate("/"); return; }
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    // Load event count
    const { count } = await supabase.from("events").select("*", { count: "exact", head: true });
    setEventCount(count || 0);

    // Load images from bucket
    const { data: files } = await supabase.storage.from("landing-page-images").list("", { limit: 100 });
    if (files) {
      const imgs = files.map(f => ({
        name: f.name,
        url: supabase.storage.from("landing-page-images").getPublicUrl(f.name).data.publicUrl,
      }));
      setImages(imgs);
    }
  };

  const handleEventsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEventsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/import-events-csv`,
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success(`Successfully imported ${result.count} events`);
        loadData();
      } else {
        toast.error(result.error || "Failed to import events");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setEventsUploading(false);
      e.target.value = "";
    }
  };

  const handleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImagesUploading(true);
    try {
      let uploaded = 0;
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
          .from("landing-page-images")
          .upload(fileName, file, { contentType: file.type });
        if (error) {
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
        } else {
          uploaded++;
        }
      }
      toast.success(`Uploaded ${uploaded} image(s)`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setImagesUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteImage = async (name: string) => {
    const { error } = await supabase.storage.from("landing-page-images").remove([name]);
    if (error) {
      toast.error("Failed to delete image");
    } else {
      toast.success("Image deleted");
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/admin")}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Landing Page</h1>
        <div className="w-10" />
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Events Upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Events</CardTitle>
                <CardDescription>
                  Upload a CSV/Excel file with columns: ID, Dates, Title, City, Disciplines, Status, Link
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleEventsUpload}
                  disabled={eventsUploading}
                />
                <Button asChild variant="outline" disabled={eventsUploading}>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {eventsUploading ? "Uploading..." : "Upload Events File"}
                  </span>
                </Button>
              </label>
              <span className="text-sm text-muted-foreground">
                {eventCount} event(s) currently loaded
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Images Upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Image className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Front Page Images</CardTitle>
                <CardDescription>
                  Upload JPG images to display on the landing page
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImagesUpload}
                disabled={imagesUploading}
              />
              <Button asChild variant="outline" disabled={imagesUploading}>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {imagesUploading ? "Uploading..." : "Upload Images"}
                </span>
              </Button>
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {images.map((img) => (
                  <div key={img.name} className="relative group rounded-lg overflow-hidden border border-border">
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-32 object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteImage(img.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <div className="p-1 text-xs text-muted-foreground truncate">{img.name}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LandingPageAdmin;
