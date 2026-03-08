import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Search, AlertTriangle, Upload, Image } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StorageFile {
  name: string;
  id: string;
  publicUrl: string;
}

interface SymbolStatus {
  file: StorageFile;
  linkedCode: string | null;
  status: 'synced' | 'orphaned' | 'missing';
}

const SYMBOL_CATEGORIES = [
  { name: 'Jumps', bucket: 'jump-symbols', table: 'jumps', folder: null, uploadable: true },
  { name: 'Rotations', bucket: 'jump-symbols', table: 'rotations', folder: 'rotations', uploadable: true },
  { name: 'Balances', bucket: 'jump-symbols', table: 'balances', folder: 'balances', uploadable: true },
  { name: 'Criteria', bucket: 'criteria-symbols', table: 'criteria', folder: null, uploadable: false },
  { name: 'Ball Bases', bucket: 'ball-bases-symbols', table: 'ball_technical_elements', folder: null, uploadable: false },
  { name: 'Ball Technical Elements', bucket: 'ball-technical-elements-symbols', table: 'ball_technical_elements', folder: null, uploadable: false },
  { name: 'Hoop Bases', bucket: 'hoop-bases-symbols', table: 'hoop_technical_elements', folder: null, uploadable: false },
  { name: 'Hoop Technical Elements', bucket: 'hoop-technical-elements-symbols', table: 'hoop_technical_elements', folder: null, uploadable: false },
  { name: 'Clubs Bases', bucket: 'clubs-bases-symbols', table: 'clubs_technical_elements', folder: null, uploadable: false },
  { name: 'Clubs Technical Elements', bucket: 'clubs-technical-elements-symbols', table: 'clubs_technical_elements', folder: null, uploadable: false },
  { name: 'Ribbon Bases', bucket: 'ribbon-bases-symbols', table: 'ribbon_technical_elements', folder: null, uploadable: false },
  { name: 'Ribbon Technical Elements', bucket: 'ribbon-technical-elements-symbols', table: 'ribbon_technical_elements', folder: null, uploadable: false },
];

const DYNAMIC_ELEMENTS_CATEGORIES = [
  { name: 'Catches', bucket: 'dynamic-element-symbols', table: 'dynamic_catches' as string | null, folder: 'dynamic_catches' },
  { name: 'Throws', bucket: 'dynamic-element-symbols', table: 'dynamic_throws' as string | null, folder: 'dynamic_throws' },
  { name: 'General Criteria', bucket: 'dynamic-element-symbols', table: 'dynamic_general_criteria' as string | null, folder: 'dynamic_general_criteria' },
  { name: 'Prerecorded Risk Components', bucket: 'dynamic-element-symbols', table: 'prerecorded_risk_components' as string | null, folder: 'prerecorded_risks' },
  { name: 'Prerecorded Risks', bucket: 'dynamic-element-symbols', table: 'prerecorded_risks' as string | null, folder: 'prerecorded_risks_main' },
  { name: 'Other Risks Symbols', bucket: 'dynamic-element-symbols', table: null as string | null, folder: 'other_risks' },
];

export default function SymbolManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [symbolData, setSymbolData] = useState<Record<string, SymbolStatus[]>>({});
  const [dynamicSymbolData, setDynamicSymbolData] = useState<Record<string, SymbolStatus[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ bucket: string; file: StorageFile; code: string | null; folder?: string | null } | null>(null);
  const [cleanupTarget, setCleanupTarget] = useState<{ bucket: string; category: string; folder?: string | null } | null>(null);
  const [uploadingDynamic, setUploadingDynamic] = useState<Record<string, boolean>>({});
  const [uploadingRegular, setUploadingRegular] = useState<Record<string, boolean>>({});
  
  const dynamicInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const regularInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    checkAuth();
    loadAllSymbols();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: hasAdminRole } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access this page.",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const loadAllSymbols = async () => {
    setLoading(true);
    const allData: Record<string, SymbolStatus[]> = {};
    const dynamicData: Record<string, SymbolStatus[]> = {};

    for (const category of SYMBOL_CATEGORIES) {
      const symbols = await loadSymbolsForCategory(category.bucket, category.table, category.folder);
      const key = category.folder ? `${category.bucket}/${category.folder}` : category.bucket;
      allData[key] = symbols;
    }

    for (const category of DYNAMIC_ELEMENTS_CATEGORIES) {
      const symbols = await loadSymbolsForCategory(category.bucket, category.table, category.folder);
      dynamicData[category.folder] = symbols;
    }

    setSymbolData(allData);
    setDynamicSymbolData(dynamicData);
    setLoading(false);
  };

  const loadSymbolsForCategory = async (bucket: string, table: string | null, folder: string | null): Promise<SymbolStatus[]> => {
    try {
      // Get all files from storage bucket (with folder path if specified)
      const { data: files, error: storageError } = await supabase.storage
        .from(bucket)
        .list(folder || undefined);

      if (storageError) throw storageError;

      // Get all records from database table (only if table exists)
      let dbRecords: any[] = [];
      if (table) {
        // Use risk_component_code for prerecorded_risk_components, risk_code for prerecorded_risks, code for others
        const codeColumn = table === 'prerecorded_risk_components' 
          ? 'risk_component_code' 
          : table === 'prerecorded_risks' 
            ? 'risk_code' 
            : 'code';
        const { data, error: dbError } = await supabase
          .from(table as any)
          .select(`${codeColumn}, symbol_image`);

        if (dbError) throw dbError;
        // Normalize to use 'code' key for consistency
        dbRecords = (data || []).map((record: any) => ({
          code: record[codeColumn],
          symbol_image: record.symbol_image
        }));
      }

      // Map files to their status
      const symbolStatuses: SymbolStatus[] = (files || [])
        .filter(file => file.name !== '.emptyFolderPlaceholder')
        .map(file => {
          const filePath = folder ? `${folder}/${file.name}` : file.name;
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          // Match by symbol_image URL/filename OR by code matching filename (without extension)
          const fileCodeWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
          const linkedRecord = dbRecords.find((record: any) => 
            record.symbol_image === publicUrl || 
            record.symbol_image === file.name ||
            record.code === fileCodeWithoutExtension
          );

          return {
            file: {
              name: file.name,
              id: file.id || file.name,
              publicUrl
            },
            linkedCode: linkedRecord?.code || null,
            // If no table, treat as synced (standalone files)
            status: table ? (linkedRecord ? 'synced' : 'orphaned') : 'synced'
          };
        });

      return symbolStatuses;
    } catch (error) {
      console.error(`Error loading symbols for ${bucket}:`, error);
      return [];
    }
  };

  const handleDynamicSymbolUpload = async (
    files: FileList,
    category: typeof DYNAMIC_ELEMENTS_CATEGORIES[number]
  ) => {
    setUploadingDynamic(prev => ({ ...prev, [category.folder]: true }));
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const file of Array.from(files)) {
        const fileName = file.name;
        const code = fileName.replace(/\.[^/.]+$/, ""); // Remove extension to get code

        // If category has a table, check if a record exists and update it
        if (category.table) {
          // Use risk_component_code for prerecorded_risk_components, risk_code for prerecorded_risks, code for others
          const codeColumn = category.table === 'prerecorded_risk_components' 
            ? 'risk_component_code' 
            : category.table === 'prerecorded_risks' 
              ? 'risk_code' 
              : 'code';
          
          // Check if a record with this code exists (use limit(1) to handle duplicates)
          const { data: existingRecords, error: queryError } = await supabase
            .from(category.table as any)
            .select(`id, ${codeColumn}`)
            .eq(codeColumn, code)
            .limit(1);
          
          const existingRecord = existingRecords?.[0] || null;

          if (queryError) {
            console.error(`Error checking for ${code}:`, queryError);
            errorCount++;
            continue;
          }

          if (!existingRecord) {
            console.warn(`No ${category.name} found with code: ${code}`);
            errorCount++;
            continue;
          }

          // Upload to storage
          const filePath = `${category.folder}/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from(category.bucket)
            .upload(filePath, file, { upsert: true });

          if (uploadError) {
            console.error(`Error uploading symbol for ${code}:`, uploadError);
            errorCount++;
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from(category.bucket)
            .getPublicUrl(filePath);

          // Update the record with the symbol URL
          const { error: updateError } = await supabase
            .from(category.table as any)
            .update({ symbol_image: publicUrl })
            .eq(codeColumn, code);

          if (updateError) {
            console.error(`Error updating ${code} with symbol:`, updateError);
            errorCount++;
            continue;
          }

          successCount++;
        } else {
          // No table - just upload to storage without linking
          const filePath = `${category.folder}/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from(category.bucket)
            .upload(filePath, file, { upsert: true });

          if (uploadError) {
            console.error(`Error uploading symbol ${fileName}:`, uploadError);
            errorCount++;
            continue;
          }

          successCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Upload successful",
          description: `Successfully uploaded ${successCount} ${category.name.toLowerCase()} symbol(s)`,
        });
      }
      if (errorCount > 0) {
        toast({
          title: "Some uploads failed",
          description: `${errorCount} symbol(s) could not be matched or uploaded`,
          variant: "destructive",
        });
      }

      await loadAllSymbols();
    } catch (error) {
      console.error(`Error uploading ${category.name} symbols:`, error);
      toast({
        title: "Upload failed",
        description: `Failed to upload ${category.name} symbols`,
        variant: "destructive",
      });
    } finally {
      setUploadingDynamic(prev => ({ ...prev, [category.folder]: false }));
    }
  };

  const handleRegularSymbolUpload = async (
    files: FileList,
    category: typeof SYMBOL_CATEGORIES[number]
  ) => {
    const key = category.folder ? `${category.bucket}/${category.folder}` : category.bucket;
    setUploadingRegular(prev => ({ ...prev, [key]: true }));
    try {
      let successCount = 0;
      let errorCount = 0;
      const skippedCodes: string[] = [];

      for (const file of Array.from(files)) {
        const fileName = file.name;
        const code = fileName.replace(/\.[^/.]+$/, ""); // Remove extension to get code

        // Check if a record with this code exists
        const { data: existingRecords, error: queryError } = await supabase
          .from(category.table as any)
          .select('id, code')
          .eq('code', code)
          .limit(1);

        const existingRecord = existingRecords?.[0] || null;

        if (queryError) {
          console.error(`Error checking for ${code}:`, queryError);
          errorCount++;
          continue;
        }

        if (!existingRecord) {
          console.warn(`No ${category.name} found with code: ${code}`);
          skippedCodes.push(code);
          errorCount++;
          continue;
        }

        // Upload to storage (with folder path if specified)
        const filePath = category.folder ? `${category.folder}/${fileName}` : fileName;
        const { error: uploadError } = await supabase.storage
          .from(category.bucket)
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error(`Error uploading symbol for ${code}:`, uploadError);
          errorCount++;
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(category.bucket)
          .getPublicUrl(filePath);

        // Update the record with the symbol URL
        const { error: updateError } = await supabase
          .from(category.table as any)
          .update({ symbol_image: publicUrl })
          .eq('code', code);

        if (updateError) {
          console.error(`Error updating ${code} with symbol:`, updateError);
          errorCount++;
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast({
          title: "Upload successful",
          description: `Successfully uploaded ${successCount} ${category.name.toLowerCase()} symbol(s)`,
        });
      }
      if (errorCount > 0) {
        toast({
          title: "Some uploads failed",
          description: `${errorCount} symbol(s) could not be matched or uploaded${skippedCodes.length > 0 ? `. No match for: ${skippedCodes.slice(0, 5).join(', ')}${skippedCodes.length > 5 ? '...' : ''}` : ''}`,
          variant: "destructive",
        });
      }

      await loadAllSymbols();
    } catch (error) {
      console.error(`Error uploading ${category.name} symbols:`, error);
      toast({
        title: "Upload failed",
        description: `Failed to upload ${category.name} symbols`,
        variant: "destructive",
      });
    } finally {
      setUploadingRegular(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDeleteSymbol = async () => {
    if (!deleteTarget) {
      console.error('handleDeleteSymbol called but deleteTarget is null');
      return;
    }

    console.log('Deleting symbol:', JSON.stringify(deleteTarget));

    try {
      // Build the file path (include folder for dynamic elements)
      const filePath = deleteTarget.folder 
        ? `${deleteTarget.folder}/${deleteTarget.file.name}` 
        : deleteTarget.file.name;

      console.log('Removing from bucket:', deleteTarget.bucket, 'path:', filePath);

      // Delete from storage
      const { data: removeData, error: storageError } = await supabase.storage
        .from(deleteTarget.bucket)
        .remove([filePath]);

      console.log('Storage remove result:', JSON.stringify(removeData), 'error:', storageError);

      if (storageError) throw storageError;

      // Update database if linked to a code
      if (deleteTarget.code) {
        // Check if it's a dynamic element category
        const dynamicCategory = DYNAMIC_ELEMENTS_CATEGORIES.find(c => c.folder === deleteTarget.folder);
        const regularCategory = SYMBOL_CATEGORIES.find(c => 
          c.bucket === deleteTarget.bucket && c.folder === deleteTarget.folder
        );
        const category = dynamicCategory || regularCategory;
        
        if (category && category.table) {
          const codeColumn = category.table === 'prerecorded_risk_components' 
            ? 'risk_component_code' 
            : category.table === 'prerecorded_risks'
              ? 'risk_code'
              : 'code';
          await supabase
            .from(category.table as any)
            .update({ symbol_image: null })
            .eq(codeColumn, deleteTarget.code);
        }
      }

      toast({
        title: "Symbol deleted",
        description: `Successfully deleted ${deleteTarget.file.name}`,
      });

      // Reload symbols
      await loadAllSymbols();
    } catch (error) {
      console.error('Error deleting symbol:', error);
      toast({
        title: "Error",
        description: `Failed to delete symbol: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCleanupOrphaned = async () => {
    if (!cleanupTarget) return;

    try {
      // Determine if this is a dynamic element category or a regular one
      const isDynamicCategory = DYNAMIC_ELEMENTS_CATEGORIES.some(c => c.folder === cleanupTarget.folder);
      
      let symbolsData: SymbolStatus[] | undefined;
      if (isDynamicCategory) {
        symbolsData = dynamicSymbolData[cleanupTarget.folder!];
      } else {
        // Regular categories use bucket or bucket/folder as key
        const key = cleanupTarget.folder 
          ? `${cleanupTarget.bucket}/${cleanupTarget.folder}` 
          : cleanupTarget.bucket;
        symbolsData = symbolData[key];
      }

      const orphanedFiles = (symbolsData || [])
        .filter(s => s.status === 'orphaned')
        .map(s => cleanupTarget.folder ? `${cleanupTarget.folder}/${s.file.name}` : s.file.name);

      if (orphanedFiles.length === 0) {
        toast({
          title: "No orphaned files",
          description: "All files are linked to database records.",
        });
        setCleanupTarget(null);
        return;
      }

      const { error } = await supabase.storage
        .from(cleanupTarget.bucket)
        .remove(orphanedFiles);

      if (error) throw error;

      toast({
        title: "Cleanup complete",
        description: `Removed ${orphanedFiles.length} orphaned file(s)`,
      });

      await loadAllSymbols();
    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      toast({
        title: "Error",
        description: "Failed to clean up orphaned files",
        variant: "destructive",
      });
    } finally {
      setCleanupTarget(null);
    }
  };

  const filteredSymbolData = Object.entries(symbolData).reduce((acc, [key, symbols]) => {
    const filtered = symbols.filter(s => 
      s.file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.linkedCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[key] = filtered;
    }
    return acc;
  }, {} as Record<string, SymbolStatus[]>);

  const filteredDynamicSymbolData = Object.entries(dynamicSymbolData).reduce((acc, [folder, symbols]) => {
    const filtered = symbols.filter(s => 
      s.file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.linkedCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[folder] = filtered;
    }
    return acc;
  }, {} as Record<string, SymbolStatus[]>);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">Symbol Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage all symbol images across storage buckets
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by filename or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Loading symbols...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Accordion type="multiple" className="space-y-4">
              {SYMBOL_CATEGORIES.map(category => {
                const key = category.folder ? `${category.bucket}/${category.folder}` : category.bucket;
                const symbols = filteredSymbolData[key] || [];
                const orphanedCount = symbols.filter(s => s.status === 'orphaned').length;
                const isUploading = uploadingRegular[key] || false;
                
                return (
                  <AccordionItem key={key} value={key} className="border rounded-lg bg-card">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{category.name}</span>
                          <Badge variant="secondary">{symbols.length} files</Badge>
                          {orphanedCount > 0 && (
                            <Badge variant="destructive">{orphanedCount} orphaned</Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      {/* Upload Section for uploadable categories */}
                      {category.uploadable && (
                        <div className="mb-4 p-4 bg-muted/50 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Image className="h-4 w-4 text-primary" />
                              <span className="text-sm">Upload {category.name} Symbols (PNG files named by code, e.g. "1.101.png")</span>
                            </div>
                            <input
                              type="file"
                              accept="image/png"
                              multiple
                              ref={(el) => { regularInputRefs.current[key] = el; }}
                              className="hidden"
                              onChange={(e) => {
                                const files = e.target.files;
                                if (files && files.length > 0) {
                                  handleRegularSymbolUpload(files, category);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => regularInputRefs.current[key]?.click()}
                              disabled={isUploading}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {isUploading ? "Uploading..." : "Upload Symbols"}
                            </Button>
                          </div>
                        </div>
                      )}
                      {orphanedCount > 0 && (
                        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-sm">
                              {orphanedCount} orphaned file(s) not linked to any database record
                            </span>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setCleanupTarget({ bucket: category.bucket, category: category.name, folder: category.folder })}
                          >
                            Cleanup Orphaned
                          </Button>
                        </div>
                      )}
                      
                      {symbols.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No symbols found</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {symbols.map(symbol => (
                            <Card key={symbol.file.id} className="overflow-hidden">
                              <CardContent className="p-4">
                                <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                  <img
                                    src={symbol.file.publicUrl}
                                    alt={symbol.file.name}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-xs font-mono truncate" title={symbol.file.name}>
                                    {symbol.file.name}
                                  </p>
                                  {symbol.linkedCode ? (
                                    <Badge variant="default" className="w-full justify-center">
                                      {symbol.linkedCode}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="w-full justify-center">
                                      No code
                                    </Badge>
                                  )}
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setDeleteTarget({ 
                                      bucket: category.bucket, 
                                      file: symbol.file,
                                      code: symbol.linkedCode,
                                      folder: category.folder
                                    })}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* Dynamic Elements Symbols Section */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Dynamic Elements Symbols</h2>
              <p className="text-muted-foreground mb-4">
                Upload symbol images with filenames matching the code (e.g., "C1.png" for code "C1").
              </p>
              <Accordion type="multiple" className="space-y-4">
                {DYNAMIC_ELEMENTS_CATEGORIES.map(category => {
                  const symbols = filteredDynamicSymbolData[category.folder] || [];
                  const orphanedCount = symbols.filter(s => s.status === 'orphaned').length;
                  const isUploading = uploadingDynamic[category.folder] || false;
                  
                  return (
                    <AccordionItem key={category.folder} value={category.folder} className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-6 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{category.name}</span>
                            <Badge variant="secondary">{symbols.length} files</Badge>
                            {orphanedCount > 0 && (
                              <Badge variant="destructive">{orphanedCount} orphaned</Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        {/* Upload Section */}
                        <div className="mb-4 p-4 bg-muted/50 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Image className="h-4 w-4 text-primary" />
                              <span className="text-sm">Upload {category.name} Symbols</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              ref={(el) => { dynamicInputRefs.current[category.folder] = el; }}
                              className="hidden"
                              onChange={(e) => {
                                const files = e.target.files;
                                if (files && files.length > 0) {
                                  handleDynamicSymbolUpload(files, category);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => dynamicInputRefs.current[category.folder]?.click()}
                              disabled={isUploading}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {isUploading ? "Uploading..." : "Upload Symbols"}
                            </Button>
                          </div>
                        </div>

                        {orphanedCount > 0 && (
                          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              <span className="text-sm">
                                {orphanedCount} orphaned file(s) not linked to any database record
                              </span>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setCleanupTarget({ bucket: category.bucket, category: category.name, folder: category.folder })}
                            >
                              Cleanup Orphaned
                            </Button>
                          </div>
                        )}
                        
                        {symbols.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">No symbols found</p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {symbols.map(symbol => (
                              <Card key={symbol.file.id} className="overflow-hidden">
                                <CardContent className="p-4">
                                  <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                    <img
                                      src={symbol.file.publicUrl}
                                      alt={symbol.file.name}
                                      className="max-w-full max-h-full object-contain"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-xs font-mono truncate" title={symbol.file.name}>
                                      {symbol.file.name}
                                    </p>
                                    {symbol.linkedCode ? (
                                      <Badge variant="default" className="w-full justify-center">
                                        {symbol.linkedCode}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="w-full justify-center">
                                        No code
                                      </Badge>
                                    )}
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => setDeleteTarget({ 
                                        bucket: category.bucket, 
                                        file: symbol.file,
                                        code: symbol.linkedCode,
                                        folder: category.folder
                                      })}
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Symbol</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.file.name}"?
              {deleteTarget?.code && (
                <span className="block mt-2 font-semibold">
                  This will also remove the symbol reference from code: {deleteTarget.code}
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteSymbol();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cleanupTarget} onOpenChange={(open) => { if (!open) setCleanupTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cleanup Orphaned Files</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all orphaned symbol files from the "{cleanupTarget?.category}" storage bucket.
              Orphaned files are those not linked to any database record.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCleanupOrphaned();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cleanup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
