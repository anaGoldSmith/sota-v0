import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Search, AlertTriangle } from "lucide-react";
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
  { name: 'Jumps', bucket: 'jump-symbols', table: 'jumps' },
  { name: 'Criteria', bucket: 'criteria-symbols', table: 'criteria' },
  { name: 'Ball Bases', bucket: 'ball-bases-symbols', table: 'ball_technical_elements' },
  { name: 'Ball Technical Elements', bucket: 'ball-technical-elements-symbols', table: 'ball_technical_elements' },
  { name: 'Hoop Bases', bucket: 'hoop-bases-symbols', table: 'hoop_technical_elements' },
  { name: 'Hoop Technical Elements', bucket: 'hoop-technical-elements-symbols', table: 'hoop_technical_elements' },
  { name: 'Clubs Bases', bucket: 'clubs-bases-symbols', table: 'clubs_technical_elements' },
  { name: 'Clubs Technical Elements', bucket: 'clubs-technical-elements-symbols', table: 'clubs_technical_elements' },
  { name: 'Ribbon Bases', bucket: 'ribbon-bases-symbols', table: 'ribbon_technical_elements' },
  { name: 'Ribbon Technical Elements', bucket: 'ribbon-technical-elements-symbols', table: 'ribbon_technical_elements' },
];

export default function SymbolManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [symbolData, setSymbolData] = useState<Record<string, SymbolStatus[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ bucket: string; file: StorageFile; code: string | null } | null>(null);
  const [cleanupTarget, setCleanupTarget] = useState<{ bucket: string; category: string } | null>(null);

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

    for (const category of SYMBOL_CATEGORIES) {
      const symbols = await loadSymbolsForCategory(category.bucket, category.table);
      allData[category.bucket] = symbols;
    }

    setSymbolData(allData);
    setLoading(false);
  };

  const loadSymbolsForCategory = async (bucket: string, table: string): Promise<SymbolStatus[]> => {
    try {
      // Get all files from storage bucket
      const { data: files, error: storageError } = await supabase.storage
        .from(bucket)
        .list();

      if (storageError) throw storageError;

      // Get all records from database table
      const { data: dbRecords, error: dbError } = await supabase
        .from(table as any)
        .select('code, symbol_image');

      if (dbError) throw dbError;

      // Map files to their status
      const symbolStatuses: SymbolStatus[] = (files || []).map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(file.name);

        const linkedRecord = (dbRecords || []).find((record: any) => record.symbol_image === file.name);

        return {
          file: {
            name: file.name,
            id: file.id || file.name,
            publicUrl
          },
          linkedCode: (linkedRecord as any)?.code || null,
          status: linkedRecord ? 'synced' : 'orphaned'
        };
      });

      return symbolStatuses;
    } catch (error) {
      console.error(`Error loading symbols for ${bucket}:`, error);
      return [];
    }
  };

  const handleDeleteSymbol = async () => {
    if (!deleteTarget) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(deleteTarget.bucket)
        .remove([deleteTarget.file.name]);

      if (storageError) throw storageError;

      // Update database if linked to a code
      if (deleteTarget.code) {
        const category = SYMBOL_CATEGORIES.find(c => c.bucket === deleteTarget.bucket);
        if (category) {
          await supabase
            .from(category.table as any)
            .update({ symbol_image: null })
            .eq('code', deleteTarget.code);
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
        description: "Failed to delete symbol",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCleanupOrphaned = async () => {
    if (!cleanupTarget) return;

    try {
      const orphanedFiles = symbolData[cleanupTarget.bucket]
        .filter(s => s.status === 'orphaned')
        .map(s => s.file.name);

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

  const filteredSymbolData = Object.entries(symbolData).reduce((acc, [bucket, symbols]) => {
    const filtered = symbols.filter(s => 
      s.file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.linkedCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[bucket] = filtered;
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
          <Accordion type="multiple" className="space-y-4">
            {SYMBOL_CATEGORIES.map(category => {
              const symbols = filteredSymbolData[category.bucket] || [];
              const orphanedCount = symbols.filter(s => s.status === 'orphaned').length;
              
              return (
                <AccordionItem key={category.bucket} value={category.bucket} className="border rounded-lg bg-card">
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
                          onClick={() => setCleanupTarget({ bucket: category.bucket, category: category.name })}
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
                                    code: symbol.linkedCode 
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
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
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
            <AlertDialogAction onClick={handleDeleteSymbol} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cleanupTarget} onOpenChange={() => setCleanupTarget(null)}>
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
            <AlertDialogAction onClick={handleCleanupOrphaned} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cleanup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
