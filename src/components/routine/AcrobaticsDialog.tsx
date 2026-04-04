import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Search, AlertCircle, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PreAcrobaticElement } from "./PreAcrobaticSelectionDialog";
import type { VerticalRotation } from "./VerticalRotationSelectionDialog";

type AcrobaticsTab = 'pre-acrobatic' | 'vertical-rotations';

const GROUP_ORDER: Record<string, number> = {
  'Upright': 1,
  'Seated': 2,
  'Llying': 3,
};

const GROUP_OPTIONS = [
  { value: 'Upright', label: 'Upright' },
  { value: 'Seated', label: 'Seated' },
  { value: 'Llying', label: 'Lying' },
];

interface AcrobaticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preAcrobaticElements: PreAcrobaticElement[];
  verticalRotations: VerticalRotation[];
  onSelectPreAcrobatic: (element: PreAcrobaticElement) => void;
  onSelectVerticalRotation: (rotation: VerticalRotation) => void;
  rotationType?: 'one' | 'two' | 'series';
  isFirstRotation?: boolean;
}

export const AcrobaticsDialog = ({
  open,
  onOpenChange,
  preAcrobaticElements,
  verticalRotations,
  onSelectPreAcrobatic,
  onSelectVerticalRotation,
  rotationType = 'one',
  isFirstRotation = true,
}: AcrobaticsDialogProps) => {
  const [activeTab, setActiveTab] = useState<AcrobaticsTab>('pre-acrobatic');
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState("");

  const handleClose = () => {
    setSearchQuery("");
    setShowCustomInput(false);
    setCustomName("");
    setCustomGroup("");
    onOpenChange(false);
  };

  const resetInputs = () => {
    setSearchQuery("");
    setShowCustomInput(false);
    setCustomName("");
    setCustomGroup("");
  };

  // Pre-acrobatic filtering
  const filteredPreAcrobatic = useMemo(() => {
    let filtered = preAcrobaticElements;
    if (rotationType === 'two' || rotationType === 'series') {
      filtered = filtered.filter(e => e.two_bases_series === true);
    } else if (rotationType === 'one' && !isFirstRotation) {
      filtered = filtered.filter(e => e.two_bases_series === true);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name?.toLowerCase().includes(query) ||
        e.group_name?.toLowerCase().includes(query) ||
        e.group_code?.toLowerCase().includes(query)
      );
    }
    return [...filtered].sort((a, b) => {
      if (a.group_code !== b.group_code) return a.group_code.localeCompare(b.group_code);
      return a.name.localeCompare(b.name);
    });
  }, [preAcrobaticElements, searchQuery, rotationType, isFirstRotation]);

  // Vertical rotations filtering
  const filteredVerticalRotations = useMemo(() => {
    let filtered = verticalRotations;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.name?.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.group_name?.toLowerCase().includes(query) ||
        r.code?.toLowerCase().includes(query)
      );
    }
    return [...filtered].sort((a, b) => {
      const orderA = GROUP_ORDER[a.group_name || ''] || 99;
      const orderB = GROUP_ORDER[b.group_name || ''] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [verticalRotations, searchQuery]);

  const handleSelectPreAcrobatic = (element: PreAcrobaticElement) => {
    onSelectPreAcrobatic(element);
    resetInputs();
  };

  const handleSelectVerticalRotation = (rotation: VerticalRotation) => {
    onSelectVerticalRotation(rotation);
    resetInputs();
  };

  const handleCustomSubmitPreAcrobatic = () => {
    if (!customName.trim()) return;
    const customElement: PreAcrobaticElement = {
      id: `custom-preacro-${Date.now()}`,
      group_code: 'CUSTOM',
      group_name: 'Custom',
      name: customName.trim(),
      level_change: false,
      two_bases_series: true,
      isCustom: true,
    };
    handleSelectPreAcrobatic(customElement);
  };

  const handleCustomSubmitVerticalRotation = () => {
    if (!customName.trim() || !customGroup) return;
    const customRotation: VerticalRotation = {
      id: `custom-vertrot-${Date.now()}`,
      group: customGroup,
      group_name: customGroup,
      db: null,
      code: `CUSTOM-${Date.now()}`,
      name: customName.trim(),
      description: null,
    };
    handleSelectVerticalRotation(customRotation);
  };

  const getRestrictionInfo = () => {
    if (rotationType === 'two' || rotationType === 'series') {
      return "Some elements are hidden because they can only be used as a single rotation.";
    }
    if (rotationType === 'one' && !isFirstRotation) {
      return "Some elements are hidden because they can only be selected as the first rotation.";
    }
    return null;
  };

  const restrictionInfo = activeTab === 'pre-acrobatic' ? getRestrictionInfo() : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Acrobatics</DialogTitle>
        </DialogHeader>

        {/* Tab Buttons */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'pre-acrobatic' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => { setActiveTab('pre-acrobatic'); resetInputs(); }}
          >
            Pre-acrobatic Elements
          </Button>
          <Button
            variant={activeTab === 'vertical-rotations' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => { setActiveTab('vertical-rotations'); resetInputs(); }}
          >
            Vertical Rotations
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'pre-acrobatic' ? "Search pre-acrobatic elements..." : "Search vertical rotations..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Custom Element */}
        {!showCustomInput ? (
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => setShowCustomInput(true)}
          >
            <Plus className="h-4 w-4" />
            {activeTab === 'pre-acrobatic' ? 'Add Custom Pre-acrobatic Element' : 'Add Custom Vertical Rotation'}
          </Button>
        ) : activeTab === 'pre-acrobatic' ? (
          <div className="flex gap-2">
            <Input
              placeholder="Enter custom element name..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value.slice(0, 100))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmitPreAcrobatic();
                if (e.key === 'Escape') { setShowCustomInput(false); setCustomName(""); }
              }}
              autoFocus
            />
            <Button onClick={handleCustomSubmitPreAcrobatic} disabled={!customName.trim()}>Add</Button>
            <Button variant="ghost" onClick={() => { setShowCustomInput(false); setCustomName(""); }}>Cancel</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Select value={customGroup} onValueChange={setCustomGroup}>
              <SelectTrigger><SelectValue placeholder="Select group..." /></SelectTrigger>
              <SelectContent>
                {GROUP_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input
                placeholder="Enter custom rotation name..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value.slice(0, 100))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomSubmitVerticalRotation();
                  if (e.key === 'Escape') { setShowCustomInput(false); setCustomName(""); setCustomGroup(""); }
                }}
                autoFocus
              />
              <Button onClick={handleCustomSubmitVerticalRotation} disabled={!customName.trim() || !customGroup}>Add</Button>
              <Button variant="ghost" onClick={() => { setShowCustomInput(false); setCustomName(""); setCustomGroup(""); }}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Restriction info */}
        {restrictionInfo && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{restrictionInfo}</span>
          </div>
        )}

        {/* Content */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center bg-muted border-b border-border">
            <div className="flex-1 px-4 py-2 font-medium text-sm text-foreground">
              {activeTab === 'pre-acrobatic' ? 'Name of Pre-acrobatic Element' : 'Name of Vertical Rotation'}
            </div>
          </div>

          <div className="max-h-[55vh] overflow-y-auto">
            {activeTab === 'pre-acrobatic' ? (
              filteredPreAcrobatic.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No pre-acrobatic elements found</div>
              ) : (
                filteredPreAcrobatic.map((element) => {
                  const isDiveLeap = element.name?.toLowerCase() === 'dive leap';
                  return (
                    <div
                      key={element.id}
                      className="flex items-center hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                      onClick={() => handleSelectPreAcrobatic(element)}
                    >
                      <div className="flex-1 px-4 py-3 flex items-center gap-2">
                        <span className="font-medium text-foreground">{element.name}</span>
                        {isDiveLeap && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex flex-shrink-0"><Info className="h-4 w-4 text-primary cursor-help" /></span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p>The criterion "change of level" is awarded when a Dive leap is performed in a risk (R). The Dive leap may be performed only as the first rotation and must be followed by at least one additional rotation to fulfil the two base rotations (R2). If the Dive leap is performed after the first rotation, it does not count as a rotational element.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {!isDiveLeap && element.level_change && !element.two_bases_series && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex flex-shrink-0"><Info className="h-4 w-4 text-primary cursor-help" /></span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p>This element automatically adds change of level/axis criteria and can only be used as the first single rotation.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {!isDiveLeap && element.level_change && element.two_bases_series && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex flex-shrink-0"><Info className="h-4 w-4 text-primary cursor-help" /></span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p>This element automatically adds change of level/axis criteria.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              filteredVerticalRotations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No vertical rotations found</div>
              ) : (
                filteredVerticalRotations.map((rotation) => (
                  <div
                    key={rotation.id}
                    className="flex items-center hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                    onClick={() => handleSelectVerticalRotation(rotation)}
                  >
                    <div className="flex-1 px-4 py-3 flex items-center gap-2">
                      <span className="font-medium text-foreground">{rotation.name || rotation.code}</span>
                      {rotation.group_name && (
                        <span className="text-xs text-muted-foreground">({rotation.group_name})</span>
                      )}
                      {rotation.description && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex flex-shrink-0"><Info className="h-4 w-4 text-primary cursor-help" /></span>
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
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
