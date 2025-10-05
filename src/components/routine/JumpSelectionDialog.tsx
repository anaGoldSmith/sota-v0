import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JumpIcon } from "@/components/icons/DbSymbols";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useState as useImageState } from "react";

interface Jump {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
  symbol_image: string | null;
  jump_number: number;
}

interface JumpSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectJump: (jump: Jump) => void;
}

export const JumpSelectionDialog = ({ open, onOpenChange, onSelectJump }: JumpSelectionDialogProps) => {
  const [searchText, setSearchText] = useState("");
  const [filterValue, setFilterValue] = useState<string>("all");

  // Fetch all jumps
  const { data: jumps, isLoading } = useQuery({
    queryKey: ["jumps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jumps")
        .select("*")
        .order("jump_number", { ascending: true })
        .order("code", { ascending: true });
      
      if (error) throw error;
      return data as Jump[];
    },
  });

  // Filter jumps based on search text and value filter
  const filteredJumps = useMemo(() => {
    if (!jumps) return [];

    return jumps.filter((jump) => {
      const matchesSearch = 
        searchText === "" ||
        jump.code.toLowerCase().includes(searchText.toLowerCase()) ||
        jump.description.toLowerCase().includes(searchText.toLowerCase()) ||
        (jump.name && jump.name.toLowerCase().includes(searchText.toLowerCase()));

      const matchesValue = 
        filterValue === "all" || 
        jump.value.toString() === filterValue;

      return matchesSearch && matchesValue;
    });
  }, [jumps, searchText, filterValue]);

  const handleRowClick = (jump: Jump) => {
    onSelectJump(jump);
    onOpenChange(false);
    setSearchText("");
    setFilterValue("all");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <JumpIcon className="!h-6 !w-6" />
            Select Jump
          </DialogTitle>
        </DialogHeader>

        {/* Filter Section */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search by Code or Description</Label>
            <Input
              id="search"
              placeholder="Type to search..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value-filter">Filter by Value</Label>
            <Select value={filterValue} onValueChange={setFilterValue}>
              <SelectTrigger id="value-filter">
                <SelectValue placeholder="All values" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All values</SelectItem>
                <SelectItem value="0.10">0.10</SelectItem>
                <SelectItem value="0.20">0.20</SelectItem>
                <SelectItem value="0.30">0.30</SelectItem>
                <SelectItem value="0.40">0.40</SelectItem>
                <SelectItem value="0.50">0.50</SelectItem>
                <SelectItem value="0.60">0.60</SelectItem>
                <SelectItem value="0.70">0.70</SelectItem>
                <SelectItem value="0.80">0.80</SelectItem>
                <SelectItem value="0.90">0.90</SelectItem>
                <SelectItem value="1.00">1.00</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-sm text-muted-foreground">
          {isLoading ? "Loading..." : `${filteredJumps.length} jump${filteredJumps.length !== 1 ? 's' : ''} found`}
        </div>

        {/* Jumps Table */}
        <div className="border rounded-md overflow-auto max-h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Symbol</TableHead>
                <TableHead className="w-[100px]">Code</TableHead>
                <TableHead className="w-[80px]">Value</TableHead>
                <TableHead className="w-[100px]">Turn</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading jumps...
                  </TableCell>
                </TableRow>
              ) : filteredJumps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No jumps found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredJumps.map((jump) => (
                  <TableRow
                    key={jump.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleRowClick(jump)}
                  >
                    <TableCell>
                      {jump.symbol_image ? (
                        <img 
                          src={`https://rwbnynjpaimdfxqoqbvt.supabase.co/storage/v1/object/public/jump-symbols/${jump.symbol_image}`}
                          alt={jump.code}
                          className="max-w-[180px] h-auto object-contain py-2"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">No symbol</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{jump.code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{jump.value}</Badge>
                    </TableCell>
                    <TableCell>
                      {jump.turn_degrees !== "NA" && jump.turn_degrees ? (
                        <span className="text-sm">{jump.turn_degrees}°</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{jump.description}</TableCell>
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
