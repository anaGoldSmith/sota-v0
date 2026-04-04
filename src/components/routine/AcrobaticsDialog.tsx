import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info, Search, AlertCircle, Plus, Minus, GripVertical } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

export type AcroSelection = 
  | { kind: 'pre-acrobatic'; data: PreAcrobaticElement; uid: string }
  | { kind: 'vertical-rotation'; data: VerticalRotation; uid: string };

let acroUidCounter = 0;
const nextAcroUid = () => `acro-uid-${++acroUidCounter}`;

const SortableChip = ({ sel, onRemove }: { sel: AcroSelection; onRemove: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sel.uid });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };
  const name = sel.kind === 'pre-acrobatic' ? sel.data.name : (sel.data.name || sel.data.code);
  const kindLabel = sel.kind === 'pre-acrobatic' ? 'PA' : 'VR';
  return (
    <span ref={setNodeRef} style={style} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-foreground rounded-full px-3 py-1 text-sm">
      <span {...attributes} {...listeners} className="flex-shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing touch-none"><GripVertical className="h-3 w-3" /></span>
      <span className="text-xs font-semibold text-muted-foreground">{kindLabel}</span>
      {name}
      <button className="ml-1 text-muted-foreground hover:text-destructive" onClick={onRemove}><Minus className="h-3 w-3" /></button>
    </span>
  );
};

interface AcrobaticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preAcrobaticElements: PreAcrobaticElement[];
  verticalRotations: VerticalRotation[];
  onSaveSelections: (selections: AcroSelection[]) => void;
  rotationType?: 'one' | 'two' | 'series';
  isFirstRotation?: boolean;
}

export const AcrobaticsDialog = ({
  open,
  onOpenChange,
  preAcrobaticElements,
  verticalRotations,
  onSaveSelections,
  rotationType = 'one',
  isFirstRotation = true,
}: AcrobaticsDialogProps) => {
  const [activeTab, setActiveTab] = useState<AcrobaticsTab>('pre-acrobatic');
  const [searchQuery, setSearchQuery] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState("");
  // Multi-select: array of selections (allows duplicates)
  const [selections, setSelections] = useState<AcroSelection[]>([]);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(pointerSensor, keyboardSensor);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSelections(prev => {
      const oldIndex = prev.findIndex(s => s.uid === active.id);
      const newIndex = prev.findIndex(s => s.uid === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };
  };

  const resetAll = () => {
    setSearchQuery("");
    setShowCustomInput(false);
    setCustomName("");
    setCustomGroup("");
    setSelections([]);
    setActiveTab('pre-acrobatic');
  };

  const handleClose = () => {
    resetAll();
    onOpenChange(false);
  };

  const handleSave = () => {
    if (selections.length === 0) return;
    onSaveSelections(selections);
    resetAll();
    onOpenChange(false);
  };

  // Count how many times a pre-acrobatic element is selected
  const preAcroCount = (id: string) =>
    selections.filter(s => s.kind === 'pre-acrobatic' && s.data.id === id).length;

  // Count how many times a vertical rotation is selected
  const vertRotCount = (id: string) =>
    selections.filter(s => s.kind === 'vertical-rotation' && s.data.id === id).length;

  const addPreAcrobatic = (element: PreAcrobaticElement) => {
    setSelections(prev => [...prev, { kind: 'pre-acrobatic' as const, data: element, uid: nextAcroUid() }]);
  };

  const removePreAcrobatic = (id: string) => {
    setSelections(prev => {
      const idx = prev.findIndex(s => s.kind === 'pre-acrobatic' && s.data.id === id);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
  };

  const addVerticalRotation = (rotation: VerticalRotation) => {
    setSelections(prev => [...prev, { kind: 'vertical-rotation' as const, data: rotation, uid: nextAcroUid() }]);
  };

  const removeVerticalRotation = (id: string) => {
    setSelections(prev => {
      const idx = prev.findIndex(s => s.kind === 'vertical-rotation' && s.data.id === id);
      if (idx === -1) return prev;
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
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
    addPreAcrobatic(customElement);
    setCustomName("");
    setShowCustomInput(false);
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
    addVerticalRotation(customRotation);
    setCustomName("");
    setCustomGroup("");
    setShowCustomInput(false);
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

  const totalPreAcro = selections.filter(s => s.kind === 'pre-acrobatic').length;
  const totalVertRot = selections.filter(s => s.kind === 'vertical-rotation').length;

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
            onClick={() => { setActiveTab('pre-acrobatic'); setSearchQuery(""); setShowCustomInput(false); setCustomName(""); setCustomGroup(""); }}
          >
            Pre-acrobatic Elements
            {totalPreAcro > 0 && (
              <span className="ml-2 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs font-bold">{totalPreAcro}</span>
            )}
          </Button>
          <Button
            variant={activeTab === 'vertical-rotations' ? 'default' : 'outline'}
            className="flex-1"
            onClick={() => { setActiveTab('vertical-rotations'); setSearchQuery(""); setShowCustomInput(false); setCustomName(""); setCustomGroup(""); }}
          >
            Vertical Rotations
            {totalVertRot > 0 && (
              <span className="ml-2 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs font-bold">{totalVertRot}</span>
            )}
          </Button>
        </div>

        {/* Selection summary */}
        {selections.length > 0 && (
          <div className="text-sm font-medium text-foreground">
            {selections.length} element{selections.length !== 1 ? 's' : ''} selected
          </div>
        )}

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
        <div className="border border-border rounded-lg overflow-hidden flex-1">
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
                  const count = preAcroCount(element.id);
                  const isDiveLeap = element.name?.toLowerCase() === 'dive leap';
                  return (
                    <div
                      key={element.id}
                      className={`flex items-center cursor-pointer border-b border-border last:border-b-0 ${count > 0 ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                      onClick={() => addPreAcrobatic(element)}
                    >
                      <div className="flex-1 px-4 py-3 flex items-center gap-2">
                        <span className="font-medium text-foreground">{element.name}</span>
                        {count > 0 && (
                          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold">{count}</span>
                        )}
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
                      {count > 0 && (
                        <button
                          className="px-3 py-2 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removePreAcrobatic(element.id); }}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              filteredVerticalRotations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No vertical rotations found</div>
              ) : (
                filteredVerticalRotations.map((rotation) => {
                  const count = vertRotCount(rotation.id);
                  return (
                    <div
                      key={rotation.id}
                      className={`flex items-center cursor-pointer border-b border-border last:border-b-0 ${count > 0 ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                      onClick={() => addVerticalRotation(rotation)}
                    >
                      <div className="flex-1 px-4 py-3 flex items-center gap-2">
                        <span className="font-medium text-foreground">{rotation.name || rotation.code}</span>
                        {count > 0 && (
                          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold">{count}</span>
                        )}
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
                      {count > 0 && (
                        <button
                          className="px-3 py-2 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removeVerticalRotation(rotation.id); }}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Selected elements summary */}
        {selections.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="border border-border rounded-lg bg-muted/30 p-3 space-y-2">
              <div className="text-sm font-medium text-foreground">Selected Elements ({selections.length})</div>
              <SortableContext items={selections.map(s => s.uid)} strategy={horizontalListSortingStrategy}>
                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                  {selections.map((sel) => (
                    <SortableChip
                      key={sel.uid}
                      sel={sel}
                      onRemove={() => setSelections(prev => prev.filter(s => s.uid !== sel.uid))}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </DndContext>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={selections.length === 0}>
            Save ({selections.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
