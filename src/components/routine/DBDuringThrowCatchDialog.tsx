import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type DBType = 'jumps' | 'balances' | 'rotations';

interface DBElement {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  symbol_image: string | null;
}

interface DBDuringThrowCatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'throw' | 'catch';
  onSelectDB: (db: DBElement, dbType: DBType) => void;
  standardThrowSymbol?: string | null;
  standardCatchSymbol?: string | null;
}

export const DBDuringThrowCatchDialog = ({
  open,
  onOpenChange,
  type,
  onSelectDB,
  standardThrowSymbol,
  standardCatchSymbol,
}: DBDuringThrowCatchDialogProps) => {
  const [selectedGroup, setSelectedGroup] = useState<DBType | null>(null);
  const [searchText, setSearchText] = useState("");

  // Fetch jumps
  const { data: jumps = [] } = useQuery({
    queryKey: ["jumps-for-db-selection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jumps")
        .select("id, code, name, description, value, symbol_image")
        .order("code");
      if (error) throw error;
      return data as DBElement[];
    },
    enabled: open && selectedGroup === 'jumps',
  });

  // Fetch balances
  const { data: balances = [] } = useQuery({
    queryKey: ["balances-for-db-selection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("balances")
        .select("id, code, name, description, value, symbol_image")
        .order("code");
      if (error) throw error;
      return data as DBElement[];
    },
    enabled: open && selectedGroup === 'balances',
  });

  // Fetch rotations
  const { data: rotations = [] } = useQuery({
    queryKey: ["rotations-for-db-selection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rotations")
        .select("id, code, name, description, value, symbol_image")
        .order("code");
      if (error) throw error;
      return data as DBElement[];
    },
    enabled: open && selectedGroup === 'rotations',
  });

  const handleClose = () => {
    setSelectedGroup(null);
    setSearchText("");
    onOpenChange(false);
  };

  const handleBack = () => {
    setSelectedGroup(null);
    setSearchText("");
  };

  const handleSelectDB = (db: DBElement) => {
    onSelectDB(db, selectedGroup!);
    handleClose();
  };

  const getCurrentList = (): DBElement[] => {
    switch (selectedGroup) {
      case 'jumps':
        return jumps;
      case 'balances':
        return balances;
      case 'rotations':
        return rotations;
      default:
        return [];
    }
  };

  const filteredList = getCurrentList().filter(item => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      item.code.toLowerCase().includes(searchLower) ||
      item.name?.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower)
    );
  });

  const getSymbolUrl = (symbolImage: string | null): string | null => {
    if (!symbolImage) return null;
    if (symbolImage.startsWith('http')) return symbolImage;
    
    // Determine bucket based on selected group
    const bucketMap: Record<DBType, string> = {
      jumps: 'jump-symbols',
      balances: 'jump-symbols', // Use same bucket or adjust as needed
      rotations: 'jump-symbols',
    };
    
    const bucket = bucketMap[selectedGroup!] || 'jump-symbols';
    const { data } = supabase.storage.from(bucket).getPublicUrl(symbolImage);
    return data.publicUrl;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedGroup && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle>
              {type === 'throw' ? 'Throw during DB' : 'Catch during DB'}
              {selectedGroup && ` - ${selectedGroup.charAt(0).toUpperCase() + selectedGroup.slice(1)}`}
            </DialogTitle>
          </div>
        </DialogHeader>

        {!selectedGroup ? (
          // Group selection view
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select the type of Difficulty Body element:
            </p>
            <Button
              variant="outline"
              className="w-full h-16 text-lg justify-start px-6 hover:bg-primary/5 hover:border-primary"
              onClick={() => setSelectedGroup('jumps')}
            >
              <span className="text-2xl mr-4">🦘</span>
              Jumps
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 text-lg justify-start px-6 hover:bg-primary/5 hover:border-primary"
              onClick={() => setSelectedGroup('balances')}
            >
              <span className="text-2xl mr-4">🧘</span>
              Balances
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 text-lg justify-start px-6 hover:bg-primary/5 hover:border-primary"
              onClick={() => setSelectedGroup('rotations')}
            >
              <span className="text-2xl mr-4">🔄</span>
              Rotations
            </Button>
          </div>
        ) : (
          // DB selection table view
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Results count */}
            <p className="text-sm text-muted-foreground mb-2">
              {filteredList.length} elements found
            </p>

            {/* Table */}
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="min-w-full">
                {/* Header */}
                <div className="grid grid-cols-[60px_1fr_60px] gap-2 px-3 py-2 bg-muted border-b text-sm font-medium text-muted-foreground sticky top-0">
                  <span>Symbol</span>
                  <span>Name</span>
                  <span className="text-right">Value</span>
                </div>

                {/* Rows */}
                {filteredList.map((item) => {
                  const symbolUrl = getSymbolUrl(item.symbol_image);
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[60px_1fr_60px] gap-2 px-3 py-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer items-center"
                      onClick={() => handleSelectDB(item)}
                    >
                      <div className="flex justify-center">
                        {symbolUrl ? (
                          <img
                            src={symbolUrl}
                            alt={item.name || item.code}
                            className="h-10 w-10 object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            {item.code}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {item.name || item.description}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.code}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-primary">{item.value}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredList.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No elements found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
