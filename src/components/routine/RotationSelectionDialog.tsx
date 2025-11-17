import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotationIcon } from "@/components/icons/DbSymbols";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Rotation {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
  symbol_image: string | null;
}

interface RotationSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRotation: (rotation: Rotation) => void;
}

export const RotationSelectionDialog = ({
  open,
  onOpenChange,
  onSelectRotation
}: RotationSelectionDialogProps) => {
  const [searchText, setSearchText] = useState("");
  const [selectedRotations, setSelectedRotations] = useState<Set<string>>(new Set());

  const {
    data: rotations,
    isLoading
  } = useQuery({
    queryKey: ["rotations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rotations")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return data as Rotation[];
    }
  });

  const parseRotationCode = (code: string) => {
    const parts = code.split('.');
    if (parts.length !== 2 || parts[0] !== '3') return null;
    const afterDot = parts[1];
    if (afterDot.length < 3) return null;
    const rowNumber = parseInt(afterDot.slice(0, -2));
    const valueCode = afterDot.slice(-2);
    const value = parseFloat(`0.${valueCode}`);
    return { rowNumber, value };
  };

  const { matrix, rowNumbers, values } = useMemo(() => {
    if (!rotations) return { matrix: new Map(), rowNumbers: [], values: [] };

    const filtered = rotations.filter(rotation => {
      if (searchText === "") return true;
      return rotation.code.toLowerCase().includes(searchText.toLowerCase()) ||
        rotation.description.toLowerCase().includes(searchText.toLowerCase()) ||
        (rotation.name && rotation.name.toLowerCase().includes(searchText.toLowerCase()));
    });

    const matrixMap = new Map<number, Map<number, Rotation>>();
    const valueSet = new Set<number>();

    filtered.forEach(rotation => {
      const parsed = parseRotationCode(rotation.code);
      if (!parsed) return;
      const { rowNumber, value } = parsed;
      if (!matrixMap.has(rowNumber)) {
        matrixMap.set(rowNumber, new Map());
      }
      matrixMap.get(rowNumber)!.set(value, rotation);
      valueSet.add(value);
    });

    const sortedRows = Array.from(matrixMap.keys()).sort((a, b) => a - b);
    const sortedValues = Array.from(valueSet).sort((a, b) => a - b);

    return { matrix: matrixMap, rowNumbers: sortedRows, values: sortedValues };
  }, [rotations, searchText]);

  const getRowDescription = (rowNumber: number) => {
    const rowRotations = matrix.get(rowNumber);
    if (!rowRotations) return "";
    const firstRotation = Array.from(rowRotations.values())[0] as Rotation | undefined;
    return firstRotation?.description || "";
  };

  const handleRotationToggle = (rotation: Rotation) => {
    setSelectedRotations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rotation.id)) {
        newSet.delete(rotation.id);
      } else {
        newSet.add(rotation.id);
      }
      return newSet;
    });
  };

  const handleConfirmSelection = () => {
    const selectedRotationObjects = rotations?.filter(r => selectedRotations.has(r.id)) || [];
    selectedRotationObjects.forEach(rotation => onSelectRotation(rotation));
    setSelectedRotations(new Set());
    setSearchText("");
    onOpenChange(false);
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedRotations(new Set());
      setSearchText("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-7xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotationIcon className="!h-6 !w-6" />
            Select Rotation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="search">Search by rotation name or value</Label>
          <Input
            id="search"
            placeholder="Type to search..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isLoading ? "Loading..." : `${rowNumbers.length} rotation type${rowNumbers.length !== 1 ? 's' : ''} found`}
          </span>
          {selectedRotations.size > 0 && (
            <span className="font-medium text-foreground">
              {selectedRotations.size} rotation{selectedRotations.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        <div className="border rounded-md flex-1 min-h-0 relative">
          <div className="h-[50vh] overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-background">
                <TableRow>
                  <TableHead className="sticky left-0 z-30 bg-background min-w-[300px] border-r">
                    Types of rotations
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
                      Loading rotations...
                    </TableCell>
                  </TableRow>
                ) : rowNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={values.length + 1} className="text-center py-8 text-muted-foreground">
                      No rotations found matching your search
                    </TableCell>
                  </TableRow>
                ) : (
                  rowNumbers.map(rowNumber => (
                    <TableRow key={rowNumber}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium border-r text-sm">
                        {getRowDescription(rowNumber)}
                      </TableCell>
                      {values.map(value => {
                        const rotation = matrix.get(rowNumber)?.get(value);
                        const isSelected = rotation ? selectedRotations.has(rotation.id) : false;
                        return (
                          <TableCell
                            key={`${rowNumber}-${value}`}
                            className={`text-center p-3 relative ${
                              rotation
                                ? `cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-primary/20 hover:bg-primary/30 ring-2 ring-primary ring-inset'
                                      : 'hover:bg-accent/50'
                                  }`
                                : 'bg-muted/30'
                            }`}
                            onClick={() => rotation && handleRotationToggle(rotation)}
                          >
                            {rotation ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-16 h-16 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground mb-1 relative">
                                  Symbol
                                  {isSelected && (
                                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                                <Badge variant={isSelected ? "default" : "secondary"} className="font-mono text-xs">
                                  {rotation.code}
                                </Badge>
                                {rotation.turn_degrees && rotation.turn_degrees !== "NA" && (
                                  <span className="text-xs text-muted-foreground">
                                    {rotation.turn_degrees}°
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

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleDialogChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSelection} disabled={selectedRotations.size === 0}>
            Add {selectedRotations.size > 0 ? `${selectedRotations.size} ` : ''}Rotation{selectedRotations.size !== 1 ? 's' : ''} to Routine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
