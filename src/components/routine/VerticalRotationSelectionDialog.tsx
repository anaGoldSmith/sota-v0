import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Plus, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface VerticalRotation {
  id: string;
  group: string | null;
  group_name: string | null;
  db: string | null;
  code: string;
  name: string | null;
  description: string | null;
}

interface VerticalRotationSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rotations: VerticalRotation[];
  onSelect: (rotation: VerticalRotation) => void;
}

const GROUP_OPTIONS = [
  { value: 'upright', label: 'Upright' },
  { value: 'seated', label: 'Seated' },
  { value: 'lying', label: 'Lying' },
];

// Define sort order for groups
const GROUP_ORDER: Record<string, number> = {
  'Upright': 1,
  'Seated': 2,
  'Lying': 3,
};

export const VerticalRotationSelectionDialog = ({
  open,
  onOpenChange,
  rotations,
  onSelect,
}: VerticalRotationSelectionDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customGroup, setCustomGroup] = useState<string>("");
  const [customName, setCustomName] = useState("");

  // Filter and sort rotations: Upright first, then Seated, then Lying
  const sortedRotations = useMemo(() => {
    let filtered = rotations;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = rotations.filter(
        (r) =>
          r.name?.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.group_name?.toLowerCase().includes(query) ||
          r.code?.toLowerCase().includes(query)
      );
    }

    // Sort by group order
    return [...filtered].sort((a, b) => {
      const orderA = GROUP_ORDER[a.group_name || ''] ?? 99;
      const orderB = GROUP_ORDER[b.group_name || ''] ?? 99;
      return orderA - orderB;
    });
  }, [rotations, searchQuery]);

  const handleSelect = (rotation: VerticalRotation) => {
    onSelect(rotation);
    setSearchQuery("");
    setShowCustomForm(false);
    onOpenChange(false);
  };

  const handleCreateCustom = () => {
    if (!customGroup || !customName.trim()) return;

    const customRotation: VerticalRotation = {
      id: `custom-${Date.now()}`,
      group: customGroup === 'upright' ? '1' : customGroup === 'seated' ? '2' : '3',
      group_name: GROUP_OPTIONS.find(g => g.value === customGroup)?.label || customGroup,
      db: 'N',
      code: `custom-${Date.now()}`,
      name: customName.trim(),
      description: `Custom vertical rotation: ${customName.trim()}`,
    };

    onSelect(customRotation);
    setSearchQuery("");
    setCustomGroup("");
    setCustomName("");
    setShowCustomForm(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSearchQuery("");
    setShowCustomForm(false);
    setCustomGroup("");
    setCustomName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Vertical Rotation</DialogTitle>
        </DialogHeader>

        {/* Search and Custom Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vertical rotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showCustomForm ? "secondary" : "outline"}
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Custom
          </Button>
        </div>

        {/* Custom Rotation Form */}
        {showCustomForm && (
          <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
            <h4 className="font-medium text-sm text-foreground">Create Your Own Vertical Rotation</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Group</label>
                <Select value={customGroup} onValueChange={setCustomGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_OPTIONS.map((group) => (
                      <SelectItem key={group.value} value={group.value}>
                        {group.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name (max 100 characters)</label>
                <Input
                  placeholder="Enter rotation name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value.slice(0, 100))}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground text-right">{customName.length}/100</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCustomForm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateCustom}
                disabled={!customGroup || !customName.trim()}
              >
                Add Custom Rotation
              </Button>
            </div>
          </div>
        )}

        {/* Table Header */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center bg-muted border-b border-border">
            <div className="w-24 px-4 py-2 font-medium text-sm text-foreground">Group</div>
            <div className="flex-1 px-4 py-2 font-medium text-sm text-foreground">Name</div>
          </div>

          {/* Rotation List */}
          <div className="max-h-[45vh] overflow-y-auto">
            {sortedRotations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No vertical rotations found
              </div>
            ) : (
              sortedRotations.map((rotation) => (
                <div
                  key={rotation.id}
                  className="flex items-center hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                  onClick={() => handleSelect(rotation)}
                >
                  <div className="w-24 px-4 py-3 text-sm text-muted-foreground">
                    {rotation.group_name || '—'}
                  </div>
                  <div className="flex-1 px-4 py-3 flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {rotation.name || rotation.code}
                    </span>
                    {rotation.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex flex-shrink-0">
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>{rotation.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
