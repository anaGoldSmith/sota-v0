import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JumpIcon } from "@/components/icons/DbSymbols";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Jump {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
  symbol_image: string | null;
}

interface JumpSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectJump: (jump: Jump) => void;
}

export const JumpSelectionDialog = ({ open, onOpenChange, onSelectJump }: JumpSelectionDialogProps) => {
  const [searchText, setSearchText] = useState("");

  // Fetch all jumps
  const { data: jumps, isLoading } = useQuery({
    queryKey: ["jumps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jumps")
        .select("*")
        .order("code", { ascending: true });
      
      if (error) throw error;
      return data as Jump[];
    },
  });

  // Parse jump code to extract row number and value
  const parseJumpCode = (code: string) => {
    const parts = code.split('.');
    if (parts.length !== 2 || parts[0] !== '1') return null;
    
    const afterDot = parts[1];
    if (afterDot.length < 3) return null;
    
    const rowNumber = parseInt(afterDot.slice(0, -2));
    const valueCode = afterDot.slice(-2);
    const value = parseFloat(`0.${valueCode}`);
    
    return { rowNumber, value };
  };

  // Build matrix structure and filter based on search
  const { matrix, rowNumbers, values } = useMemo(() => {
    if (!jumps) return { matrix: new Map(), rowNumbers: [], values: [] };

    // Filter jumps based on search text
    const filtered = jumps.filter((jump) => {
      if (searchText === "") return true;
      return (
        jump.code.toLowerCase().includes(searchText.toLowerCase()) ||
        jump.description.toLowerCase().includes(searchText.toLowerCase()) ||
        (jump.name && jump.name.toLowerCase().includes(searchText.toLowerCase()))
      );
    });

    const matrixMap = new Map<number, Map<number, Jump>>();
    const valueSet = new Set<number>();

    filtered.forEach((jump) => {
      const parsed = parseJumpCode(jump.code);
      if (!parsed) return;

      const { rowNumber, value } = parsed;
      
      if (!matrixMap.has(rowNumber)) {
        matrixMap.set(rowNumber, new Map());
      }
      matrixMap.get(rowNumber)!.set(value, jump);
      valueSet.add(value);
    });

    const sortedRows = Array.from(matrixMap.keys()).sort((a, b) => a - b);
    const sortedValues = Array.from(valueSet).sort((a, b) => a - b);

    return { 
      matrix: matrixMap, 
      rowNumbers: sortedRows, 
      values: sortedValues 
    };
  }, [jumps, searchText]);

  // Get description for a row (from the first jump in that row)
  const getRowDescription = (rowNumber: number) => {
    const rowJumps = matrix.get(rowNumber);
    if (!rowJumps) return "";
    
    const firstJump = Array.from(rowJumps.values())[0] as Jump | undefined;
    return firstJump?.description || "";
  };

  const handleJumpSelect = (jump: Jump) => {
    onSelectJump(jump);
    onOpenChange(false);
    setSearchText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <JumpIcon className="!h-6 !w-6" />
            Select Jump
          </DialogTitle>
        </DialogHeader>

        {/* Search Section */}
        <div className="space-y-2">
          <Label htmlFor="search">Search by Code or Description</Label>
          <Input
            id="search"
            placeholder="Type to search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${rowNumbers.length} jump type${rowNumbers.length !== 1 ? 's' : ''} found`}
        </div>

        {/* Matrix Table */}
        <div className="border rounded-md overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background min-w-[300px] border-r">
                  Types of jumps/leaps
                </TableHead>
                {values.map((value) => (
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
                    Loading jumps...
                  </TableCell>
                </TableRow>
              ) : rowNumbers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={values.length + 1} className="text-center py-8 text-muted-foreground">
                    No jumps found matching your search
                  </TableCell>
                </TableRow>
              ) : (
                rowNumbers.map((rowNumber) => (
                  <TableRow key={rowNumber}>
                    <TableCell className="sticky left-0 z-10 bg-background font-medium border-r text-sm">
                      {getRowDescription(rowNumber)}
                    </TableCell>
                    {values.map((value) => {
                      const jump = matrix.get(rowNumber)?.get(value);
                      return (
                        <TableCell
                          key={`${rowNumber}-${value}`}
                          className={`text-center p-3 ${
                            jump 
                              ? 'cursor-pointer hover:bg-accent/50 transition-colors' 
                              : 'bg-muted/30'
                          }`}
                          onClick={() => jump && handleJumpSelect(jump)}
                        >
                          {jump ? (
                            <div className="flex flex-col items-center gap-1">
                              {/* Placeholder for symbol image */}
                              <div className="w-16 h-16 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground mb-1">
                                Symbol
                              </div>
                              <Badge variant="default" className="font-mono text-xs">
                                {jump.code}
                              </Badge>
                              {jump.turn_degrees && jump.turn_degrees !== "NA" && (
                                <span className="text-xs text-muted-foreground">
                                  {jump.turn_degrees}°
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
      </DialogContent>
    </Dialog>
  );
};
