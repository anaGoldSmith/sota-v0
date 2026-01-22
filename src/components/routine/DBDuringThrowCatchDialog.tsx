import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { JumpIcon, BalanceIcon, RotationIcon } from "@/components/icons/DbSymbols";

type DBType = 'jumps' | 'balances' | 'rotations';

interface DBElement {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  symbol_image: string | null;
  turn_degrees?: string | null;
}

interface DBDuringThrowCatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'throw' | 'catch';
  onSelectDB: (db: DBElement, dbType: DBType) => void;
}

export const DBDuringThrowCatchDialog = ({
  open,
  onOpenChange,
  type,
  onSelectDB,
}: DBDuringThrowCatchDialogProps) => {
  const [selectedGroup, setSelectedGroup] = useState<DBType | null>(null);
  const [searchText, setSearchText] = useState("");

  // Fetch jumps
  const { data: jumps = [], isLoading: jumpsLoading } = useQuery({
    queryKey: ["jumps-for-db-selection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jumps")
        .select("id, code, name, description, value, symbol_image, turn_degrees")
        .order("code");
      if (error) throw error;
      return data as DBElement[];
    },
    enabled: open && selectedGroup === 'jumps',
  });

  // Fetch balances
  const { data: balances = [], isLoading: balancesLoading } = useQuery({
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
  const { data: rotations = [], isLoading: rotationsLoading } = useQuery({
    queryKey: ["rotations-for-db-selection"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rotations")
        .select("id, code, name, description, value, symbol_image, turn_degrees")
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

  const isLoading = selectedGroup === 'jumps' ? jumpsLoading : 
                    selectedGroup === 'balances' ? balancesLoading : 
                    selectedGroup === 'rotations' ? rotationsLoading : false;

  // Parse code to extract row number and value (matching Elements module logic)
  const parseCode = (code: string, prefix: string) => {
    const parts = code.split('.');
    if (parts.length !== 2 || parts[0] !== prefix) return null;
    const afterDot = parts[1];
    if (afterDot.length < 3) return null;
    const rowNumber = parseInt(afterDot.slice(0, -2));
    const valueCode = parseInt(afterDot.slice(-2));
    const value = valueCode / 10;
    return { rowNumber, value };
  };

  // Build matrix structure matching Elements module
  const { matrix, rowNumbers, values } = useMemo(() => {
    const list = getCurrentList();
    if (!list.length) return { matrix: new Map(), rowNumbers: [], values: [] };

    const prefix = selectedGroup === 'jumps' ? '1' : selectedGroup === 'balances' ? '2' : '3';

    const filtered = list.filter(item => {
      if (searchText === "") return true;
      return item.code.toLowerCase().includes(searchText.toLowerCase()) ||
        item.description.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.name && item.name.toLowerCase().includes(searchText.toLowerCase()));
    });

    const matrixMap = new Map<number, Map<number, DBElement>>();
    const valueSet = new Set<number>();

    filtered.forEach(item => {
      const parsed = parseCode(item.code, prefix);
      if (!parsed) return;
      const { rowNumber, value } = parsed;
      if (!matrixMap.has(rowNumber)) {
        matrixMap.set(rowNumber, new Map());
      }
      matrixMap.get(rowNumber)!.set(value, item);
      valueSet.add(value);
    });

    const sortedRows = Array.from(matrixMap.keys()).sort((a, b) => a - b);
    const sortedValues = Array.from(valueSet).sort((a, b) => a - b);

    return { matrix: matrixMap, rowNumbers: sortedRows, values: sortedValues };
  }, [selectedGroup, jumps, balances, rotations, searchText]);

  const getRowDescription = (rowNumber: number) => {
    const rowItems = matrix.get(rowNumber);
    if (!rowItems) return "";
    const firstItem = Array.from(rowItems.values())[0] as DBElement | undefined;
    return firstItem?.description || "";
  };

  const getSymbolUrl = (symbolImage: string | null): string | null => {
    if (!symbolImage) return null;
    if (symbolImage.startsWith('http')) return symbolImage;
    const { data } = supabase.storage.from('jump-symbols').getPublicUrl(symbolImage);
    return data.publicUrl;
  };

  const getGroupTitle = () => {
    switch (selectedGroup) {
      case 'jumps':
        return 'Types of jumps/leaps';
      case 'balances':
        return 'Types of balances';
      case 'rotations':
        return 'Types of rotations';
      default:
        return '';
    }
  };

  const getGroupIcon = () => {
    switch (selectedGroup) {
      case 'jumps':
        return <JumpIcon className="!h-6 !w-6" />;
      case 'balances':
        return <BalanceIcon className="!h-6 !w-6" />;
      case 'rotations':
        return <RotationIcon className="!h-6 !w-6" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${selectedGroup ? 'max-w-7xl' : 'sm:max-w-md'} max-h-[85vh] flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedGroup && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 mr-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {selectedGroup ? (
              <>
                {getGroupIcon()}
                Select {selectedGroup.charAt(0).toUpperCase() + selectedGroup.slice(1).replace(/s$/, '')}
              </>
            ) : (
              type === 'throw' ? 'Throw during DB' : 'Catch during DB'
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedGroup ? (
          // Group selection view - matching Elements module style with proper icons
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-4">
              Select the type of Difficulty Body element:
            </p>
            <div className="space-y-2">
              {/* Jumps */}
              <div
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedGroup('jumps')}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <JumpIcon className="h-8 w-8" />
                </div>
                <span className="text-base font-medium text-foreground">Jumps</span>
              </div>

              {/* Balances */}
              <div
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedGroup('balances')}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <BalanceIcon className="h-8 w-8" />
                </div>
                <span className="text-base font-medium text-foreground">Balances</span>
              </div>

              {/* Rotations */}
              <div
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedGroup('rotations')}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <RotationIcon className="h-8 w-8" />
                </div>
                <span className="text-base font-medium text-foreground">Rotations</span>
              </div>
            </div>
          </div>
        ) : (
          // Matrix table view - matching Elements module exactly
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search Section */}
            <div className="space-y-2">
              <Label htmlFor="search">Search by name or value</Label>
              <Input
                id="search"
                placeholder="Type to search..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2 mb-2">
              <span>
                {isLoading ? "Loading..." : `${rowNumbers.length} ${selectedGroup?.slice(0, -1) || 'element'} type${rowNumbers.length !== 1 ? 's' : ''} found`}
              </span>
            </div>

            {/* Matrix Table - matching Elements module exactly */}
            <div className="border rounded-md flex-1 min-h-0 overflow-hidden">
              <div className="max-h-[45vh] overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-background">
                    <TableRow>
                      <TableHead className="sticky left-0 z-30 bg-background min-w-[300px] border-r">
                        {getGroupTitle()}
                      </TableHead>
                      {values.map(value => (
                        <TableHead key={value} className="text-center min-w-[120px]">
                          {value.toFixed(2)} p.
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={values.length + 1} className="text-center py-8">
                          Loading {selectedGroup}...
                        </TableCell>
                      </TableRow>
                    ) : rowNumbers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={values.length + 1} className="text-center py-8 text-muted-foreground">
                          No {selectedGroup} found matching your search
                        </TableCell>
                      </TableRow>
                    ) : (
                      rowNumbers.map(rowNumber => (
                        <TableRow key={rowNumber}>
                          <TableCell className="sticky left-0 z-10 bg-background font-medium border-r text-sm">
                            {getRowDescription(rowNumber)}
                          </TableCell>
                          {values.map(value => {
                            const item = matrix.get(rowNumber)?.get(value);
                            const symbolUrl = item?.symbol_image ? getSymbolUrl(item.symbol_image) : null;
                            
                            return (
                              <TableCell
                                key={`${rowNumber}-${value}`}
                                className={`text-center p-3 relative ${
                                  item ? 'hover:bg-accent/50 cursor-pointer' : 'bg-muted/30'
                                }`}
                                onClick={() => item && handleSelectDB(item)}
                              >
                                {item ? (
                                  <div className="flex flex-col items-center gap-2">
                                    {/* Symbol image */}
                                    <div className="w-16 h-16 bg-muted/50 rounded flex items-center justify-center mb-1">
                                      {symbolUrl ? (
                                        <img
                                          src={symbolUrl}
                                          alt={item.name || item.code}
                                          className="h-14 w-14 object-contain"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const parent = e.currentTarget.parentElement;
                                            if (parent) {
                                              parent.innerHTML = `<span class="text-xs text-muted-foreground">${item.code.slice(0, 6)}</span>`;
                                            }
                                          }}
                                        />
                                      ) : (
                                        <span className="text-xs text-muted-foreground">{item.code.slice(0, 6)}</span>
                                      )}
                                    </div>
                                    {/* Turn degrees for jumps/rotations */}
                                    {item.turn_degrees && item.turn_degrees !== "NA" && (
                                      <span className="text-xs text-muted-foreground">
                                        {item.turn_degrees}°
                                      </span>
                                    )}
                                  </div>
                                ) : null}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
