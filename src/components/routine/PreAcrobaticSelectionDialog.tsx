import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Search, AlertCircle, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface PreAcrobaticElement {
  id: string;
  group_code: string;
  group_name: string;
  name: string;
  level_change: boolean;
  two_bases_series: boolean;
  isCustom?: boolean;
}

interface PreAcrobaticSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elements: PreAcrobaticElement[];
  onSelect: (element: PreAcrobaticElement) => void;
  // Context for applying business rules
  rotationType: 'one' | 'two' | 'series';
  isFirstRotation: boolean;
}

export const PreAcrobaticSelectionDialog = ({
  open,
  onOpenChange,
  elements,
  onSelect,
  rotationType,
  isFirstRotation,
}: PreAcrobaticSelectionDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");

  // Filter elements based on business rules and search query
  const filteredElements = useMemo(() => {
    let filtered = elements;
    
    // Business rule: elements with two_bases_series = false can only be selected for 'one' rotation
    // and only as the first rotation
    if (rotationType === 'two' || rotationType === 'series') {
      // For 2 bases or series, only show elements that support it (two_bases_series = true)
      filtered = filtered.filter(e => e.two_bases_series === true);
    } else if (rotationType === 'one' && !isFirstRotation) {
      // For single rotations that are NOT the first, exclude elements that can only be first
      filtered = filtered.filter(e => e.two_bases_series === true);
    }
    // If it's 'one' rotation AND first rotation, show all elements
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name?.toLowerCase().includes(query) ||
          e.group_name?.toLowerCase().includes(query) ||
          e.group_code?.toLowerCase().includes(query)
      );
    }

    // Sort by group_code then name
    return [...filtered].sort((a, b) => {
      if (a.group_code !== b.group_code) {
        return a.group_code.localeCompare(b.group_code);
      }
      return a.name.localeCompare(b.name);
    });
  }, [elements, searchQuery, rotationType, isFirstRotation]);

  const handleSelect = (element: PreAcrobaticElement) => {
    onSelect(element);
    setSearchQuery("");
    setShowCustomInput(false);
    setCustomName("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setSearchQuery("");
    setShowCustomInput(false);
    setCustomName("");
    onOpenChange(false);
  };

  const handleCustomSubmit = () => {
    if (!customName.trim()) return;
    
    const customElement: PreAcrobaticElement = {
      id: `custom-preacro-${Date.now()}`,
      group_code: 'CUSTOM',
      group_name: 'Custom',
      name: customName.trim(),
      level_change: false,
      two_bases_series: true, // Allow custom elements in all contexts
      isCustom: true,
    };
    
    handleSelect(customElement);
  };

  // Get info text about restrictions
  const getRestrictionInfo = () => {
    if (rotationType === 'two') {
      return "Some elements are hidden because they can only be used as a single rotation.";
    }
    if (rotationType === 'series') {
      return "Some elements are hidden because they can only be used as a single rotation.";
    }
    if (rotationType === 'one' && !isFirstRotation) {
      return "Some elements are hidden because they can only be selected as the first rotation.";
    }
    return null;
  };

  const restrictionInfo = getRestrictionInfo();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Pre-acrobatic Element</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pre-acrobatic elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Custom Element Button */}
        {!showCustomInput ? (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setShowCustomInput(true)}
          >
            <Plus className="h-4 w-4" />
            Add Custom Pre-acrobatic Element
          </Button>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="Enter custom element name..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value.slice(0, 100))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit();
                if (e.key === 'Escape') {
                  setShowCustomInput(false);
                  setCustomName("");
                }
              }}
              autoFocus
            />
            <Button onClick={handleCustomSubmit} disabled={!customName.trim()}>
              Add
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => {
                setShowCustomInput(false);
                setCustomName("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Restriction info */}
        {restrictionInfo && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{restrictionInfo}</span>
          </div>
        )}

        {/* Table Header */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center bg-muted border-b border-border">
            <div className="flex-1 px-4 py-2 font-medium text-sm text-foreground">
              Name of Pre-acrobatic Element
            </div>
          </div>

          {/* Element List */}
          <div className="max-h-[45vh] overflow-y-auto">
            {filteredElements.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No pre-acrobatic elements found
              </div>
            ) : (
              filteredElements.map((element) => (
                <div
                  key={element.id}
                  className="flex items-center hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                  onClick={() => handleSelect(element)}
                >
                  <div className="flex-1 px-4 py-3 flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {element.name}
                    </span>
                    {element.level_change && !element.two_bases_series && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex flex-shrink-0">
                              <Info className="h-4 w-4 text-primary cursor-help" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>This element automatically adds change of level/axis criteria and can only be used as the first single rotation.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {element.level_change && element.two_bases_series && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex flex-shrink-0">
                              <Info className="h-4 w-4 text-primary cursor-help" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>This element automatically adds change of level/axis criteria.</p>
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