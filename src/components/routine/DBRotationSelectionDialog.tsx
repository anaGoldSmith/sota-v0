import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export interface DBElement {
  id: string;
  db_group?: string;
  group?: string | null;
  code: string;
  name: string | null;
  description: string | null;
  value: number | null;
  turn_degrees: string | null;
  symbol_image: string | null;
}

interface DBRotationSelectionDialogProps<T extends DBElement> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elements: T[];
  title: string;
  onSelect: (element: T) => void;
}

export const DBRotationSelectionDialog = <T extends DBElement>({
  open,
  onOpenChange,
  elements,
  title,
  onSelect,
}: DBRotationSelectionDialogProps<T>) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredElements = useMemo(() => {
    if (!searchQuery.trim()) return elements;
    const query = searchQuery.toLowerCase();
    return elements.filter(
      (el) =>
        (el.name && el.name.toLowerCase().includes(query)) ||
        (el.description && el.description.toLowerCase().includes(query)) ||
        el.code.toLowerCase().includes(query)
    );
  }, [elements, searchQuery]);

  const handleSelect = (element: T) => {
    onSelect(element);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Header Row */}
        <div className="grid grid-cols-[60px_1fr_60px] gap-2 px-3 py-2 bg-muted/50 rounded-t-lg border-b border-border text-sm font-medium text-muted-foreground">
          <span>Symbol</span>
          <span>Name</span>
          <span className="text-right">Value</span>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto max-h-[400px]">
          {filteredElements.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No elements found
            </div>
          ) : (
            filteredElements.map((element) => (
              <div
                key={element.id}
                className="grid grid-cols-[60px_1fr_60px] gap-2 px-3 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 items-center"
                onClick={() => handleSelect(element)}
              >
                {/* Symbol Placeholder */}
                <div className="h-10 w-10 flex items-center justify-center">
                  {element.symbol_image ? (
                    <img
                      src={element.symbol_image}
                      alt={element.name || element.code}
                      className="h-8 w-8 object-contain"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      —
                    </div>
                  )}
                </div>
                
                {/* Name */}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {element.name || element.code}
                  </p>
                  {element.turn_degrees && (
                    <p className="text-xs text-muted-foreground">
                      {element.turn_degrees}° turn
                    </p>
                  )}
                </div>
                
                {/* Value */}
                <div className="text-right">
                  <span className="text-sm font-semibold text-primary">
                    {element.value ?? 0}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
