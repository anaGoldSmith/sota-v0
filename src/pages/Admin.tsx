import { useState, useRef } from "react";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Admin = () => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("FIG Code of Points");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

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

      const { error: uploadError } = await supabase.storage
        .from('rulebooks')
        .upload(filePath, file, { contentType: 'application/pdf', upsert: false });
      if (uploadError) throw uploadError;

      // Insert metadata into database
      const { error: dbError } = await supabase
        .from('rulebooks')
        .insert({
          title,
          description: description || null,
          file_path: filePath,
          file_size: file.size,
          category,
        });

      if (dbError) throw dbError;

      toast.success("File uploaded successfully!");
      
      // Reset form
      setTitle("");
      setDescription("");
      setCategory("FIG Code of Points");
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
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
          Admin - Upload Files
        </h1>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
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
      </main>
    </div>
  );
};

export default Admin;
