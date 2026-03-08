import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { JumpIcon, RotationIcon } from "@/components/icons/DbSymbols";

type DBType = 'jumps' | 'rotations';
type JumpSubGroup = 'turning-leaps' | 'jumps-360';

interface DBForRisk {
  id: string;
  db_group: string;
  group: string | null;
  code: string;
  name: string | null;
  description: string | null;
  value: number | null;
  turn_degrees: string | null;
  symbol_image: string | null;
  extra_value: number | null;
}

// Simplified element for parent component
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
  onSelectDB: (db: DBElement, dbType: DBType, rotationCount?: number) => void;
}

export const DBDuringThrowCatchDialog = ({
  open,
  onOpenChange,
  type,
  onSelectDB,
}: DBDuringThrowCatchDialogProps) => {
  const [selectedGroup, setSelectedGroup] = useState<DBType | null>(null);
  const [selectedJumpSubGroup, setSelectedJumpSubGroup] = useState<JumpSubGroup | null>(null);
  const [searchText, setSearchText] = useState("");
  const [rotationCount, setRotationCount] = useState(1);
  const [selectedRotationId, setSelectedRotationId] = useState<string | null>(null);

  // Fetch all DBs for risks
  const { data: rawDbsForRisks = [], isLoading: isLoadingDbs } = useQuery({
    queryKey: ["dbs-for-risks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dbs_for_risks")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as DBForRisk[];
    },
    enabled: open,
  });

  // Fetch symbol images from jumps and rotations tables to fill missing symbols
  const { data: jumpSymbols = [] } = useQuery({
    queryKey: ["jump-symbols-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jumps")
        .select("code, symbol_image")
        .not("symbol_image", "is", null);
      if (error) throw error;
      return data as { code: string; symbol_image: string | null }[];
    },
    enabled: open,
  });

  const { data: rotationSymbols = [] } = useQuery({
    queryKey: ["rotation-symbols-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rotations")
        .select("code, symbol_image")
        .not("symbol_image", "is", null);
      if (error) throw error;
      return data as { code: string; symbol_image: string | null }[];
    },
    enabled: open,
  });

  // Merge symbol images from jumps/rotations into dbs_for_risks entries
  const dbsForRisks = useMemo(() => {
    const symbolMap = new Map<string, string>();
    jumpSymbols.forEach(j => { if (j.symbol_image) symbolMap.set(j.code, j.symbol_image); });
    rotationSymbols.forEach(r => { if (r.symbol_image) symbolMap.set(r.code, r.symbol_image); });
    
    return rawDbsForRisks.map(db => ({
      ...db,
      symbol_image: db.symbol_image || symbolMap.get(db.code) || null,
    }));
  }, [rawDbsForRisks, jumpSymbols, rotationSymbols]);

  const isLoading = isLoadingDbs;

  // Filter by db_group
  const jumpsDBs = useMemo(() => 
    dbsForRisks.filter(db => db.db_group === 'Jumps'), 
    [dbsForRisks]
  );
  
  const rotationsDBs = useMemo(() => 
    dbsForRisks.filter(db => db.db_group === 'Rotations'), 
    [dbsForRisks]
  );

  // Filter jumps by sub-group
  const turningLeaps = useMemo(() => 
    jumpsDBs.filter(db => db.group === 'Turning Leaps'),
    [jumpsDBs]
  );

  const jumps360 = useMemo(() => 
    jumpsDBs.filter(db => db.group === 'Jumps with rotation of 360° or more, and with a value of 0.20 p'),
    [jumpsDBs]
  );

  const handleClose = () => {
    setSelectedGroup(null);
    setSelectedJumpSubGroup(null);
    setSearchText("");
    setRotationCount(1);
    setSelectedRotationId(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (selectedJumpSubGroup) {
      setSelectedJumpSubGroup(null);
      setSearchText("");
    } else {
      setSelectedGroup(null);
      setSearchText("");
      setRotationCount(1);
      setSelectedRotationId(null);
    }
  };

  // Calculate total value for rotations with extra value logic (same as Elements module)
  const calculateRotationValue = (db: DBForRisk, count: number): number => {
    const baseValue = db.value || 0;
    const extraValue = db.extra_value || 0;
    
    // Check if it's a 180-degree rotation
    const is180Degrees = db.turn_degrees === "180" || (db.turn_degrees && db.turn_degrees.includes("180"));
    
    if (is180Degrees) {
      // For 180°: add extra_value for each additional 0.5 after the first 0.5
      const additionalHalfRotations = (count - 0.5) / 0.5;
      return baseValue + (additionalHalfRotations * extraValue);
    } else {
      // For other rotations: add extra_value only for full extra circles
      const additionalFullRotations = Math.floor(count) - 1;
      return baseValue + (Math.max(0, additionalFullRotations) * extraValue);
    }
  };

  const handleSelectDB = (db: DBForRisk, customRotationCount?: number) => {
    // Calculate final value for rotations with extra value logic
    const finalValue = selectedGroup === 'rotations' && customRotationCount
      ? calculateRotationValue(db, customRotationCount)
      : db.value || 0;
    
    const element: DBElement = {
      id: db.id,
      code: db.code,
      name: db.name,
      description: db.description || '',
      value: finalValue,
      symbol_image: db.symbol_image,
      turn_degrees: db.turn_degrees,
    };
    onSelectDB(element, selectedGroup!, customRotationCount);
    handleClose();
  };

  const getSymbolUrl = (symbolImage: string | null): string | null => {
    if (!symbolImage) return null;
    if (symbolImage.startsWith('http')) return symbolImage;
    const { data } = supabase.storage.from('jump-symbols').getPublicUrl(symbolImage);
    return data.publicUrl;
  };

  // Get current list based on selection
  const getCurrentList = (): DBForRisk[] => {
    if (selectedGroup === 'jumps' && selectedJumpSubGroup) {
      return selectedJumpSubGroup === 'turning-leaps' ? turningLeaps : jumps360;
    }
    if (selectedGroup === 'rotations') {
      return rotationsDBs;
    }
    return [];
  };

  // Filter by search
  const filteredList = useMemo(() => {
    const list = getCurrentList();
    if (!searchText) return list;
    return list.filter(item => 
      item.code.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.name && item.name.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [selectedGroup, selectedJumpSubGroup, turningLeaps, jumps360, rotationsDBs, searchText]);

  const getDialogTitle = () => {
    if (selectedGroup === 'jumps' && selectedJumpSubGroup === 'turning-leaps') {
      return 'Turning Leaps';
    }
    if (selectedGroup === 'jumps' && selectedJumpSubGroup === 'jumps-360') {
      return 'Jumps with rotation of 360° or more';
    }
    if (selectedGroup === 'rotations') {
      return 'Select Rotation Element';
    }
    return type === 'throw' ? 'Throw during DB' : 'Catch during DB';
  };

  // Check if we should show the elements table
  const showElementsTable = (selectedGroup === 'jumps' && selectedJumpSubGroup) || selectedGroup === 'rotations';

  // Get the selected rotation element for rotation count UI
  const selectedRotation = selectedRotationId ? rotationsDBs.find(r => r.id === selectedRotationId) : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${showElementsTable ? 'max-w-3xl' : 'sm:max-w-md'} max-h-[85vh] flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(selectedGroup || selectedJumpSubGroup) && (
              <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 mr-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {selectedGroup === 'jumps' && selectedJumpSubGroup && <JumpIcon className="!h-6 !w-6" />}
            {selectedGroup === 'rotations' && <RotationIcon className="!h-6 !w-6" />}
            {getDialogTitle()}
          </DialogTitle>
        </DialogHeader>

        {!selectedGroup ? (
          // Main selection: Jumps or Rotations
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
        ) : selectedGroup === 'jumps' && !selectedJumpSubGroup ? (
          // Jump sub-categories
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-4">
              Select jump category:
            </p>
            <div className="space-y-2">
              {/* Turning Leaps */}
              <div
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedJumpSubGroup('turning-leaps')}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <JumpIcon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <span className="text-base font-medium text-foreground">Turning Leaps</span>
                  <p className="text-sm text-muted-foreground">{turningLeaps.length} elements</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Note: This section allows to select only one turning leap. To add a risk with a series of turning jumps, go one step back to the "Standard Risks" section and choose a risk with three turning leaps.
                  </p>
                </div>
              </div>

              {/* Jumps with rotation 360° */}
              <div
                className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedJumpSubGroup('jumps-360')}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <JumpIcon className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <span className="text-base font-medium text-foreground">Jumps with rotation of 360° or more, and with a value of 0.20</span>
                  <p className="text-sm text-muted-foreground">{jumps360.length} elements</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Element selection table (Jumps sub-group or Rotations)
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search Section */}
            <div className="space-y-2">
              <Label htmlFor="search">Search by name or code</Label>
              <Input
                id="search"
                placeholder="Type to search..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            {/* Rotation Count UI - only for rotations */}
            {selectedGroup === 'rotations' && selectedRotation && (
              <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Number of circles in selected rotation</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRotation.name || selectedRotation.code}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const is180 = selectedRotation.turn_degrees === "180" || (selectedRotation.turn_degrees && selectedRotation.turn_degrees.includes("180"));
                        const step = is180 ? 0.5 : 1;
                        const min = is180 ? 0.5 : 1;
                        setRotationCount(prev => Math.max(min, prev - step));
                      }}
                      disabled={selectedRotation.code === '3.1704'}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold">{rotationCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const is180 = selectedRotation.turn_degrees === "180" || (selectedRotation.turn_degrees && selectedRotation.turn_degrees.includes("180"));
                        const step = is180 ? 0.5 : 1;
                        setRotationCount(prev => prev + step);
                      }}
                      disabled={selectedRotation.code === '3.1704'}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {selectedRotation.code === '3.1704' && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">(1 rotation only)</p>
                )}
                <div className="mt-2 flex justify-end">
                  <Button 
                    size="sm"
                    onClick={() => handleSelectDB(selectedRotation, rotationCount)}
                  >
                    Confirm Selection
                  </Button>
                </div>
              </div>
            )}

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2 mb-2">
              <span>
                {isLoading ? "Loading..." : `${filteredList.length} element${filteredList.length !== 1 ? 's' : ''} found`}
              </span>
            </div>

            {/* Elements Table */}
            <div className="border rounded-md flex-1 min-h-0 overflow-hidden">
              <div className="max-h-[45vh] overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-background">
                    <TableRow>
                      <TableHead className="w-20">Symbol</TableHead>
                      <TableHead className="flex-1">Name</TableHead>
                      <TableHead className="w-24 text-center">Value</TableHead>
                      <TableHead className="w-24 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading elements...
                        </TableCell>
                      </TableRow>
                    ) : filteredList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No elements found matching your search
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredList.map(item => {
                        const symbolUrl = getSymbolUrl(item.symbol_image);
                        const isSelected = selectedRotationId === item.id;
                        
                        return (
                          <TableRow 
                            key={item.id}
                            className={`hover:bg-accent/50 cursor-pointer ${isSelected ? 'bg-accent' : ''}`}
                            onClick={() => {
                              if (selectedGroup === 'rotations') {
                                // For rotations, select and show rotation count UI
                                setSelectedRotationId(item.id);
                                const is180 = item.turn_degrees === "180" || (item.turn_degrees && item.turn_degrees.includes("180"));
                                setRotationCount(is180 ? 0.5 : 1);
                              } else {
                                // For jumps, select immediately
                                handleSelectDB(item);
                              }
                            }}
                          >
                            <TableCell className="p-3">
                              <div className="w-12 h-12 bg-muted/50 rounded flex items-center justify-center">
                                {symbolUrl ? (
                                  <img
                                    src={symbolUrl}
                                    alt={item.name || item.code}
                                    className="h-10 w-10 object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<span class="text-xs text-muted-foreground">${item.code}</span>`;
                                      }
                                    }}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">{item.code}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.name || item.description || item.code}
                              {item.turn_degrees && item.turn_degrees !== "NA" && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({item.turn_degrees}°)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold text-primary">
                                {(item.value || 0).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                size="sm" 
                                variant={isSelected ? "default" : "outline"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedGroup === 'rotations') {
                                    setSelectedRotationId(item.id);
                                    const is180 = item.turn_degrees === "180" || (item.turn_degrees && item.turn_degrees.includes("180"));
                                    setRotationCount(is180 ? 0.5 : 1);
                                  } else {
                                    handleSelectDB(item);
                                  }
                                }}
                              >
                                {selectedGroup === 'rotations' ? (isSelected ? 'Selected' : 'Select') : 'Select'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
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
