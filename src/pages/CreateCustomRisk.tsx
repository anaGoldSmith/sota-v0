import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, CheckCircle, X, ChevronDown, ChevronRight, Info, GripVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate, useLocation } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { ApparatusType } from "@/types/apparatus";
import { useToast } from "@/hooks/use-toast";
import { NotesWithSymbols } from "@/components/routine/NotesWithSymbols";
import { DBDuringThrowCatchDialog } from "@/components/routine/DBDuringThrowCatchDialog";
interface CriteriaItem {
  id: string;
  name: string;
  symbol?: string;
  value: number;
  code?: string;
  note?: string;
}
interface GeneralCriteria {
  id: string;
  code: string;
  name: string;
  symbol_image: string | null;
}
interface DynamicThrow {
  id: string;
  code: string;
  name: string;
  apparatus: string;
  symbol_image: string | null;
  value: number | null;
}
interface DynamicCatch {
  id: string;
  code: string;
  name: string;
  apparatus: string;
  extra_criteria: string | null;
  notes: string | null;
  symbol_image: string | null;
  value: number | null;
}

// Map apparatus type to code
const getApparatusCode = (apparatus: ApparatusType | null): string => {
  switch (apparatus) {
    case 'hoop':
      return 'H';
    case 'ball':
      return 'B';
    case 'clubs':
      return 'CL';
    case 'ribbon':
      return 'R';
    default:
      return '';
  }
};

// Check if item is applicable for current apparatus
const isApplicableForApparatus = (item: {
  apparatus: string;
}, apparatusCode: string): boolean => {
  if (item.apparatus === 'all') return true;
  const codes = item.apparatus.split('&').map(c => c.trim());
  return codes.includes(apparatusCode);
};

import { DBRotationSelectionDialog } from "@/components/routine/DBRotationSelectionDialog";

// DB Element interface for jumps/rotations
interface DBForRisk {
  id: string;
  code: string;
  name: string;
  description: string | null;
  value: number | null;
  turn_degrees: string | null;
  symbol_image: string | null;
}

// Sortable Rotation Row Component
type RotationType = 'one' | 'two' | 'series' | 'axis';
type RotationSpecificationType = 'pre-acrobatic' | 'vertical' | 'db-rotation' | null;
type DBSubType = 'jumps' | 'rotations' | null;
type RotationEntry = { 
  id: string; 
  type: RotationType; 
  seriesCount?: number; 
  specificationType?: RotationSpecificationType;
  dbSubType?: DBSubType;
  selectedDBElement?: DBForRisk;
};

const ROTATION_SPECIFICATION_OPTIONS = [
  { value: 'pre-acrobatic' as const, label: 'Pre-acrobatic Elements', hasSubmenu: false },
  { value: 'vertical' as const, label: 'Vertical Rotations', hasSubmenu: false },
  { value: 'db-rotation' as const, label: 'DB with rotation of 360° or more, value 0.20 p. or more', hasSubmenu: true },
];

const DB_SUB_TYPE_OPTIONS = [
  { value: 'jumps' as const, label: 'Jumps DBs with Rotations/Turns' },
  { value: 'rotations' as const, label: 'Rotations DBs' },
];

interface SortableRotationRowProps {
  entry: RotationEntry;
  symbols: Record<string, string>;
  onRemove: (id: string) => void;
  onUpdateSeriesCount: (id: string, count: number) => void;
  onUpdateSpecificationType: (id: string, type: RotationSpecificationType) => void;
  onUpdateDBSubType: (id: string, subType: DBSubType) => void;
  onSelectDBElement: (id: string, element: DBForRisk) => void;
  jumpsDBs: DBForRisk[];
  rotationsDBs: DBForRisk[];
}

const SortableRotationRow = ({ entry, symbols, onRemove, onUpdateSeriesCount, onUpdateSpecificationType, onUpdateDBSubType, onSelectDBElement, jumpsDBs, rotationsDBs }: SortableRotationRowProps) => {
  const [showSpecificationDropdown, setShowSpecificationDropdown] = useState(false);
  const [hoveredDBOption, setHoveredDBOption] = useState(false);
  const [showJumpsDialog, setShowJumpsDialog] = useState(false);
  const [showRotationsDialog, setShowRotationsDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const specDropdownRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Check if this entry has a selected DB element (should show combined view)
  const hasDBElement = entry.specificationType === 'db-rotation' && entry.selectedDBElement;

const renderSymbol = () => {
    const baseSymbol = (() => {
      if (entry.type === 'series') {
        return <span className="text-2xl font-bold text-foreground">S</span>;
      }
      if (entry.type === 'one') {
        return symbols["extraRotation"] ? <img src={symbols["extraRotation"]} alt="Rotation" className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} /> : <div className="h-8 w-8 bg-muted rounded" />;
      }
      if (entry.type === 'two') {
        return symbols["baseRotations"] ? <img src={symbols["baseRotations"]} alt="Rotation" className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} /> : <div className="h-8 w-8 bg-muted rounded" />;
      }
      if (entry.type === 'axis') {
        return symbols["axisLevelChange"] ? <img src={symbols["axisLevelChange"]} alt="Axis/Level Change" className="h-8 w-8 object-contain" /> : <div className="h-8 w-8 bg-muted rounded" />;
      }
      return null;
    })();

    // If there's a selected DB element with a symbol, show it alongside
    if (entry.selectedDBElement?.symbol_image) {
      return (
        <div className="flex items-center gap-1">
          {baseSymbol}
          <img 
            src={entry.selectedDBElement.symbol_image} 
            alt={entry.selectedDBElement.name} 
            className="h-8 w-8 object-contain"
            onError={e => e.currentTarget.style.display = 'none'}
          />
        </div>
      );
    }

    return baseSymbol;
  };

  const renderName = () => {
    if (entry.type === 'one') {
      return (
        <span className="flex items-center gap-2">
          One Rotation
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>If a throw or catch occurs during a rotation, select the appropriate type in the Throw or Catch section. Only select a rotation if it is performed under the flight.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      );
    }
    if (entry.type === 'two') {
      return (
        <span className="flex items-center gap-2">
          2 Base Rotations
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Each Risk requires two base rotations. Select '2 Base Rotations' or 'Series.'</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      );
    }
    if (entry.type === 'axis') {
      return (
        <span className="flex items-center gap-2">
          Axis/Level Change
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>For each Risk (R), only one criterion can be applied: either a change of axis or a change of level — not both. When evaluating levels, only two levels are considered: in flight or standing, and on the floor.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      );
    }
    if (entry.type === 'series') {
      return (
        <div className="flex items-center gap-3">
          <span>Series</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onUpdateSeriesCount(entry.id, Math.max(3, (entry.seriesCount || 3) - 1))} disabled={(entry.seriesCount || 3) <= 3}>
              -
            </Button>
            <span className="w-6 text-center font-semibold">{entry.seriesCount || 3}</span>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => onUpdateSeriesCount(entry.id, (entry.seriesCount || 3) + 1)}>
              +
            </Button>
            <span className="text-sm text-muted-foreground">rotations</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const getBaseValue = () => {
    if (entry.type === 'one') return 0.1;
    if (entry.type === 'two') return 0.2;
    if (entry.type === 'axis') return 0.1;
    if (entry.type === 'series') return (entry.seriesCount || 3) * 0.1 + 0.2;
    return 0;
  };

  const getDBValue = () => {
    return entry.selectedDBElement?.value ?? 0;
  };

  const getValue = () => {
    const baseValue = getBaseValue();
    const dbValue = hasDBElement ? getDBValue() : 0;
    return (baseValue + dbValue).toFixed(1);
  };

  // Only show specification button for actual rotations (not axis)
  const showSpecificationButton = entry.type === 'one' || entry.type === 'two' || entry.type === 'series';
  const selectedSpecLabel = entry.specificationType 
    ? ROTATION_SPECIFICATION_OPTIONS.find(o => o.value === entry.specificationType)?.label 
    : null;

  const getBaseTypeName = () => {
    if (entry.type === 'one') return 'One Rotation';
    if (entry.type === 'two') return '2 Base Rotations';
    if (entry.type === 'axis') return 'Axis/Level Change';
    if (entry.type === 'series') return `Series (${entry.seriesCount || 3} rotations)`;
    return '';
  };

  // If there's a DB element selected, show combined expandable row
  if (hasDBElement) {
    return (
      <div ref={setNodeRef} style={style} className="border-b border-border bg-background">
        {/* Main combined row */}
        <div 
          className="flex items-center cursor-pointer hover:bg-muted/50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div {...attributes} {...listeners} className="w-8 flex justify-center py-4 cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="w-12 flex justify-center py-4">
            <div className="flex items-center gap-1">
              {renderSymbol()}
            </div>
          </div>
          <div className="flex-1 py-4 px-4">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium text-foreground flex items-center gap-2">
                {renderName()}
              </span>
              <span className="text-sm text-muted-foreground italic">
                {selectedSpecLabel}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpecificationDropdown(!showSpecificationDropdown);
                }}
              >
                Change
              </Button>
            </div>
          </div>
          <div className="w-20 py-4 px-2 text-center border-l border-border">
            <p className="font-semibold text-primary">{getValue()}</p>
          </div>
          <div className="w-10 flex justify-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onRemove(entry.id);
              }} 
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded details - two sub-rows */}
        {isExpanded && (
          <div className="bg-muted/30">
            {/* First sub-row: Base rotation type */}
            <div className="flex items-center border-t border-border/50 pl-8">
              <div className="w-8" />
              <div className="w-12 flex justify-center py-3">
                {entry.type === 'series' ? (
                  <span className="text-xl font-bold text-foreground">S</span>
                ) : entry.type === 'one' ? (
                  symbols["extraRotation"] ? <img src={symbols["extraRotation"]} alt="Rotation" className="h-6 w-6 object-contain" /> : <div className="h-6 w-6 bg-muted rounded" />
                ) : entry.type === 'two' ? (
                  symbols["baseRotations"] ? <img src={symbols["baseRotations"]} alt="Rotation" className="h-6 w-6 object-contain" /> : <div className="h-6 w-6 bg-muted rounded" />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex-1 py-3 px-4">
                <span className="text-sm text-muted-foreground">{getBaseTypeName()}</span>
              </div>
              <div className="w-20 py-3 px-2 text-center border-l border-border/50">
                <span className="text-sm text-muted-foreground">{getBaseValue().toFixed(1)}</span>
              </div>
              <div className="w-10" />
            </div>

            {/* Second sub-row: Selected DB element */}
            <div className="flex items-center border-t border-border/50 pl-8">
              <div className="w-8" />
              <div className="w-12 flex justify-center py-3">
                {entry.selectedDBElement?.symbol_image ? (
                  <img 
                    src={entry.selectedDBElement.symbol_image} 
                    alt={entry.selectedDBElement.name} 
                    className="h-6 w-6 object-contain"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex-1 py-3 px-4">
                <span className="text-sm text-muted-foreground">{entry.selectedDBElement?.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-5 px-2 text-xs text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (entry.dbSubType === 'jumps') {
                      setShowJumpsDialog(true);
                    } else {
                      setShowRotationsDialog(true);
                    }
                  }}
                >
                  Change
                </Button>
              </div>
              <div className="w-20 py-3 px-2 text-center border-l border-border/50">
                <span className="text-sm text-muted-foreground">{getDBValue()}</span>
              </div>
              <div className="w-10" />
            </div>
          </div>
        )}

        {/* Backdrop for closing dropdown */}
        {showSpecificationDropdown && (
          <div className="fixed inset-0 z-[99]" onClick={() => setShowSpecificationDropdown(false)} />
        )}
        {/* Specification dropdown (for changing type) */}
        {showSpecificationDropdown && (
          <div className="absolute left-20 top-16 w-80 bg-background border border-border rounded-lg shadow-xl z-[100]">
            <div className="p-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Select Rotation Type</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpecificationDropdown(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-2 space-y-1">
              {ROTATION_SPECIFICATION_OPTIONS.map((option) => (
                option.hasSubmenu ? (
                  <div
                    key={option.value}
                    className="relative group"
                    onMouseEnter={() => setHoveredDBOption(true)}
                    onMouseLeave={() => setHoveredDBOption(false)}
                  >
                    <div
                      className={`p-3 rounded hover:bg-muted cursor-default flex items-center justify-between ${hoveredDBOption ? 'bg-muted' : ''}`}
                    >
                      <span className="text-sm text-foreground">{option.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    {hoveredDBOption && (
                      <div 
                        className="absolute left-full top-0 pl-1 z-[110]"
                        onMouseEnter={() => setHoveredDBOption(true)}
                      >
                        <div className="w-64 bg-background border border-border rounded-lg shadow-xl">
                          <div className="p-2 space-y-1">
                            {DB_SUB_TYPE_OPTIONS.map((subOption) => (
                              <div
                                key={subOption.value}
                                className="p-3 rounded hover:bg-muted cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUpdateDBSubType(entry.id, subOption.value);
                                  setShowSpecificationDropdown(false);
                                  setHoveredDBOption(false);
                                  if (subOption.value === 'jumps') {
                                    setShowJumpsDialog(true);
                                  } else {
                                    setShowRotationsDialog(true);
                                  }
                                }}
                              >
                                <span className="text-sm text-foreground">{subOption.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    key={option.value}
                    className={`p-3 rounded hover:bg-muted cursor-pointer ${entry.specificationType === option.value ? 'bg-primary/10' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateSpecificationType(entry.id, option.value);
                      setShowSpecificationDropdown(false);
                    }}
                  >
                    <span className="text-sm text-foreground">{option.label}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Dialogs for selecting DB elements */}
        <DBRotationSelectionDialog
          open={showJumpsDialog}
          onOpenChange={setShowJumpsDialog}
          elements={jumpsDBs}
          title="Select Jump DB"
          onSelect={(element) => onSelectDBElement(entry.id, element)}
        />
        <DBRotationSelectionDialog
          open={showRotationsDialog}
          onOpenChange={setShowRotationsDialog}
          elements={rotationsDBs}
          title="Select Rotation DB"
          onSelect={(element) => onSelectDBElement(entry.id, element)}
        />
      </div>
    );
  }

  // Regular row without DB element
  return (
    <div ref={setNodeRef} style={style} className="flex items-center border-b border-border bg-background">
      <div {...attributes} {...listeners} className="w-8 flex justify-center py-4 cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="w-12 flex justify-center py-4">
        {renderSymbol()}
      </div>
      <div className="flex-1 py-4 px-4">
        <div className="flex flex-col gap-2">
          <span className="font-medium text-foreground">
            {renderName()}
          </span>
          {showSpecificationButton && (
            <div className="space-y-2">
              <div className="relative" ref={specDropdownRef}>
                {selectedSpecLabel ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground italic">{selectedSpecLabel}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSpecificationDropdown(!showSpecificationDropdown);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary hover:bg-primary/10 border border-dashed border-primary/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSpecificationDropdown(!showSpecificationDropdown);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Specify Rotation Type
                  </Button>
                )}
                
                {showSpecificationDropdown && (
                  <div className="fixed inset-0 z-[99]" onClick={() => setShowSpecificationDropdown(false)} />
                )}
                {showSpecificationDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-80 bg-background border border-border rounded-lg shadow-xl z-[100]">
                    <div className="p-2 border-b border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Select Rotation Type</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSpecificationDropdown(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-2 space-y-1">
                      {ROTATION_SPECIFICATION_OPTIONS.map((option) => (
                        option.hasSubmenu ? (
                          <div
                            key={option.value}
                            className="relative group"
                            onMouseEnter={() => setHoveredDBOption(true)}
                            onMouseLeave={() => setHoveredDBOption(false)}
                          >
                            <div
                              className={`p-3 rounded hover:bg-muted cursor-default flex items-center justify-between ${hoveredDBOption ? 'bg-muted' : ''}`}
                            >
                              <span className="text-sm text-foreground">{option.label}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                            
                            {/* Sub-menu for DB options - with overlap padding to prevent gap */}
                            {hoveredDBOption && (
                              <div 
                                className="absolute left-full top-0 pl-1 z-[110]"
                                onMouseEnter={() => setHoveredDBOption(true)}
                              >
                                <div className="w-64 bg-background border border-border rounded-lg shadow-xl">
                                  <div className="p-2 space-y-1">
                                    {DB_SUB_TYPE_OPTIONS.map((subOption) => (
                                      <div
                                        key={subOption.value}
                                        className="p-3 rounded hover:bg-muted cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onUpdateSpecificationType(entry.id, 'db-rotation');
                                          onUpdateDBSubType(entry.id, subOption.value);
                                          setShowSpecificationDropdown(false);
                                          setHoveredDBOption(false);
                                          if (subOption.value === 'jumps') {
                                            setShowJumpsDialog(true);
                                          } else {
                                            setShowRotationsDialog(true);
                                          }
                                        }}
                                      >
                                        <span className="text-sm text-foreground">{subOption.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            key={option.value}
                            className={`p-3 rounded hover:bg-muted cursor-pointer ${entry.specificationType === option.value ? 'bg-primary/10' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateSpecificationType(entry.id, option.value);
                              setShowSpecificationDropdown(false);
                            }}
                          >
                            <span className="text-sm text-foreground">{option.label}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dialogs for selecting DB elements */}
          <DBRotationSelectionDialog
            open={showJumpsDialog}
            onOpenChange={setShowJumpsDialog}
            elements={jumpsDBs}
            title="Select Jump DB"
            onSelect={(element) => onSelectDBElement(entry.id, element)}
          />
          <DBRotationSelectionDialog
            open={showRotationsDialog}
            onOpenChange={setShowRotationsDialog}
            elements={rotationsDBs}
            title="Select Rotation DB"
            onSelect={(element) => onSelectDBElement(entry.id, element)}
          />
        </div>
      </div>
      <div className="w-20 py-4 px-2 text-center border-l border-border">
        <p className="font-semibold text-primary">{getValue()}</p>
      </div>
      <div className="w-10 flex justify-center">
        <Button variant="ghost" size="icon" onClick={() => onRemove(entry.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const CreateCustomRisk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const [symbols, setSymbols] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedRiskData, setSavedRiskData] = useState<any>(null);

  // Get apparatus and modification state from navigation state
  const locationState = location.state as {
    apparatus?: ApparatusType;
    modifyingElementId?: string;
    existingRiskData?: any;
  };
  const apparatus = locationState?.apparatus;
  const modifyingElementId = locationState?.modifyingElementId;
  const existingRiskData = locationState?.existingRiskData;
  const apparatusCode = getApparatusCode(apparatus || null);

  // Dropdown states
  const [showThrowDropdown, setShowThrowDropdown] = useState(false);
  const [showCatchDropdown, setShowCatchDropdown] = useState(false);
  const [showThrowCriteriaDropdown, setShowThrowCriteriaDropdown] = useState(false);
  const [showCatchCriteriaDropdown, setShowCatchCriteriaDropdown] = useState(false);
  const [generalCriteria, setGeneralCriteria] = useState<GeneralCriteria[]>([]);
  const [dynamicThrows, setDynamicThrows] = useState<DynamicThrow[]>([]);
  const [dynamicCatches, setDynamicCatches] = useState<DynamicCatch[]>([]);
  const [selectedThrowCriteria, setSelectedThrowCriteria] = useState<string[]>([]);
  const [selectedCatchCriteria, setSelectedCatchCriteria] = useState<string[]>([]);
  const throwDropdownRef = useRef<HTMLDivElement>(null);
  const catchDropdownRef = useRef<HTMLDivElement>(null);
  const throwCriteriaDropdownRef = useRef<HTMLDivElement>(null);
  const catchCriteriaDropdownRef = useRef<HTMLDivElement>(null);

  // Selected throw and catch
  const [selectedThrow, setSelectedThrow] = useState<DynamicThrow | null>(null);
  const [selectedCatch, setSelectedCatch] = useState<DynamicCatch | null>(null);

  // DB during throw/catch state
  const [showDBDuringThrowDialog, setShowDBDuringThrowDialog] = useState(false);
  const [showDBDuringCatchDialog, setShowDBDuringCatchDialog] = useState(false);
  const [throwDuringDB, setThrowDuringDB] = useState<{ db: { id: string; code: string; name: string | null; description: string; value: number; symbol_image: string | null }; dbType: 'jumps' | 'balances' | 'rotations' } | null>(null);
  const [catchDuringDB, setCatchDuringDB] = useState<{ db: { id: string; code: string; name: string | null; description: string; value: number; symbol_image: string | null }; dbType: 'jumps' | 'balances' | 'rotations' } | null>(null);

  // Risk components state
  const [throwCriteria, setThrowCriteria] = useState<CriteriaItem[]>([]);
  const [rotationEntries, setRotationEntries] = useState<RotationEntry[]>([]);
  const [seriesCount, setSeriesCount] = useState<number>(3);
  const [showRotationDropdown, setShowRotationDropdown] = useState(false);
  const [catchCriteria, setCatchCriteria] = useState<CriteriaItem[]>([]);
  const rotationDropdownRef = useRef<HTMLDivElement>(null);

  // State for DBs for risks
  const [jumpsDBs, setJumpsDBs] = useState<DBForRisk[]>([]);
  const [rotationsDBs, setRotationsDBs] = useState<DBForRisk[]>([]);
  
  // Check if axis change already exists
  const hasAxisChange = rotationEntries.some(e => e.type === 'axis');

  // Calculate rotation value based on entries (including DB element values)
  const getRotationValue = (): number => {
    return rotationEntries.reduce((sum, entry) => {
      let baseValue = 0;
      if (entry.type === 'one') baseValue = 0.1;
      else if (entry.type === 'two') baseValue = 0.2;
      else if (entry.type === 'axis') baseValue = 0.1;
      else baseValue = (entry.seriesCount || 3) * 0.1 + 0.2; // Series
      
      // Add DB element value if selected
      const dbValue = entry.selectedDBElement?.value ?? 0;
      return sum + baseValue + dbValue;
    }, 0);
  };

  // Calculate total rotations for R level (includes Thr6/Catch8 which add 1 rotation each)
  const getTotalRotations = (): number => {
    let total = rotationEntries.reduce((sum, entry) => {
      if (entry.type === 'one') return sum + 1;
      if (entry.type === 'two') return sum + 2;
      if (entry.type === 'axis') return sum; // axis doesn't add rotations
      return sum + (entry.seriesCount || 3);
    }, 0);
    
    // Thr6 and Catch8 are performed during rotation, each adds 1 rotation
    if (selectedThrow?.code === 'Thr6') total += 1;
    if (selectedCatch?.code === 'Catch8') total += 1;
    
    return total;
  };
  const rotationValue = getRotationValue();
  const rLevel = getTotalRotations();

  // Calculate total value
  const throwValue = throwDuringDB ? throwDuringDB.db.value : (selectedThrow?.value ?? 0);
  const catchValue = catchDuringDB ? catchDuringDB.db.value : (selectedCatch?.value ?? 0);
  const totalValue = throwValue + throwCriteria.reduce((sum, item) => sum + item.value, 0) + rotationValue + catchValue + catchCriteria.reduce((sum, item) => sum + item.value, 0);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (throwDropdownRef.current && !throwDropdownRef.current.contains(event.target as Node)) {
        setShowThrowDropdown(false);
      }
      if (catchDropdownRef.current && !catchDropdownRef.current.contains(event.target as Node)) {
        setShowCatchDropdown(false);
      }
      if (throwCriteriaDropdownRef.current && !throwCriteriaDropdownRef.current.contains(event.target as Node)) {
        setShowThrowCriteriaDropdown(false);
      }
      if (catchCriteriaDropdownRef.current && !catchCriteriaDropdownRef.current.contains(event.target as Node)) {
        setShowCatchCriteriaDropdown(false);
      }
      if (rotationDropdownRef.current && !rotationDropdownRef.current.contains(event.target as Node)) {
        setShowRotationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    const loadSymbols = async () => {
      const symbolUrls: Record<string, string> = {};
      const {
        data: rotationsData
      } = supabase.storage.from("dynamic-element-symbols").getPublicUrl("other_risks/baseRotations.png");
      symbolUrls["baseRotations"] = rotationsData.publicUrl;
      const {
        data: extraRotationData
      } = supabase.storage.from("dynamic-element-symbols").getPublicUrl("other_risks/extraRotation.PNG");
      symbolUrls["extraRotation"] = extraRotationData.publicUrl;
      const {
        data: axisLevelChangeData
      } = supabase.storage.from("dynamic-element-symbols").getPublicUrl("other_risks/axis_level_change.png");
      symbolUrls["axisLevelChange"] = axisLevelChangeData.publicUrl;
      setSymbols(symbolUrls);
    };
    const loadGeneralCriteria = async () => {
      const {
        data,
        error
      } = await supabase.from('dynamic_general_criteria').select('*');
      if (data && !error) {
        setGeneralCriteria(data);
      }
    };
    const loadDynamicThrows = async () => {
      const {
        data,
        error
      } = await supabase.from('dynamic_throws').select('*');
      if (data && !error) {
        setDynamicThrows(data);
      }
    };
    const loadDynamicCatches = async () => {
      // Force fresh data by adding cache-busting timestamp
      const {
        data,
        error
      } = await supabase.from('dynamic_catches').select('*').order('code');
      if (data && !error) {
        console.log('Loaded catches:', data.find(c => c.code === 'Catch4'));
        setDynamicCatches(data);
      }
};
    const loadJumpsDBs = async () => {
      const { data, error } = await supabase.from('jumps_dbs_for_risks').select('*').order('code');
      if (data && !error) {
        setJumpsDBs(data);
      }
    };
    const loadRotationsDBs = async () => {
      const { data, error } = await supabase.from('rotations_dbs_for_risks').select('*').order('code');
      if (data && !error) {
        setRotationsDBs(data);
      }
    };
    loadSymbols();
    loadGeneralCriteria();
    loadDynamicThrows();
    loadDynamicCatches();
    loadJumpsDBs();
    loadRotationsDBs();
  }, []);

  // Pre-populate form when modifying an existing risk
  useEffect(() => {
    if (!existingRiskData || !existingRiskData.components || dynamicThrows.length === 0 || dynamicCatches.length === 0 || generalCriteria.length === 0) {
      return;
    }

    const components = existingRiskData.components as Array<{ name: string; symbol: string; value: number; section?: string }>;
    
    // Parse components to find throw, catch, rotations, and criteria
    const throwNames = dynamicThrows.map(t => t.name);
    const catchNames = dynamicCatches.map(c => c.name);
    const criteriaNames = generalCriteria.map(gc => gc.name);

    const newThrowCriteria: CriteriaItem[] = [];
    const newCatchCriteria: CriteriaItem[] = [];
    const newRotationEntries: RotationEntry[] = [];
    let foundThrow = false;
    let foundCatch = false;

    components.forEach((comp) => {
      // Check if it's a throw
      if (!foundThrow && throwNames.includes(comp.name)) {
        const throwItem = dynamicThrows.find(t => t.name === comp.name);
        if (throwItem) {
          setSelectedThrow(throwItem);
          foundThrow = true;
        }
        return;
      }

      // Check if it's a catch
      if (catchNames.includes(comp.name)) {
        const catchItem = dynamicCatches.find(c => c.name === comp.name);
        if (catchItem) {
          setSelectedCatch(catchItem);
          foundCatch = true;
        }
        return;
      }

      // Check if it's a general criteria (throw or catch section)
      if (criteriaNames.includes(comp.name)) {
        const criteria = generalCriteria.find(gc => gc.name === comp.name);
        if (criteria) {
          // Determine if it's throw or catch criteria based on position
          // Criteria before catch are throw criteria, after are catch criteria
          if (!foundCatch) {
            newThrowCriteria.push({
              id: `throw_${criteria.code}`,
              name: criteria.name,
              symbol: criteria.symbol_image || undefined,
              value: comp.value,
              code: criteria.code,
            });
          } else {
            newCatchCriteria.push({
              id: `catch_${criteria.code}`,
              name: criteria.name,
              symbol: criteria.symbol_image || undefined,
              value: comp.value,
              code: criteria.code,
            });
          }
        }
        return;
      }

      // Check if it's a rotation entry
      if (comp.name === 'One Rotation') {
        newRotationEntries.push({
          id: crypto.randomUUID(),
          type: 'one',
        });
      } else if (comp.name === '2 Base Rotations') {
        newRotationEntries.push({
          id: crypto.randomUUID(),
          type: 'two',
        });
      } else if (comp.name.startsWith('Series')) {
        // Extract series count from name like "Series (3 rotations)"
        const match = comp.name.match(/Series \((\d+) rotations\)/);
        const count = match ? parseInt(match[1]) : 3;
        newRotationEntries.push({
          id: crypto.randomUUID(),
          type: 'series',
          seriesCount: count,
        });
      } else if (comp.name === 'Axis/Level Change') {
        newRotationEntries.push({
          id: crypto.randomUUID(),
          type: 'axis',
        });
      }
    });

    // Set all the parsed values
    if (newThrowCriteria.length > 0) {
      setThrowCriteria(newThrowCriteria);
    }
    if (newCatchCriteria.length > 0) {
      setCatchCriteria(newCatchCriteria);
    }
    if (newRotationEntries.length > 0) {
      setRotationEntries(newRotationEntries);
    }
  }, [existingRiskData, dynamicThrows, dynamicCatches, generalCriteria]);

  // Update selected criteria based on current throw/catch criteria
  useEffect(() => {
    const throwCodes = throwCriteria.filter(t => t.code).map(t => t.code!);
    setSelectedThrowCriteria(throwCodes);
  }, [throwCriteria]);
  useEffect(() => {
    const catchCodes = catchCriteria.filter(c => c.code).map(c => c.code!);
    setSelectedCatchCriteria(catchCodes);
  }, [catchCriteria]);

  // Filter throws and catches based on apparatus
  const filteredThrows = dynamicThrows.filter(t => apparatusCode ? isApplicableForApparatus(t, apparatusCode) : true);
  const filteredCatches = dynamicCatches.filter(c => apparatusCode ? isApplicableForApparatus(c, apparatusCode) : true);

  // Build symbol map for notes parsing (combines catches, general criteria, and throws)
  const notesSymbolMap = useMemo(() => {
    const map: Record<string, string | null> = {};

    // Add catch symbols
    dynamicCatches.forEach(c => {
      if (c.symbol_image) {
        map[c.code] = c.symbol_image;
      }
    });

    // Add general criteria symbols
    generalCriteria.forEach(gc => {
      if (gc.symbol_image) {
        map[gc.code] = gc.symbol_image;
      }
    });

    // Add throw symbols
    dynamicThrows.forEach(t => {
      if (t.symbol_image) {
        map[t.code] = t.symbol_image;
      }
    });
    return map;
  }, [dynamicCatches, generalCriteria, dynamicThrows]);
  const handleSelectRotationType = (type: 'one' | 'two' | 'series') => {
    const newEntry: RotationEntry = {
      id: crypto.randomUUID(),
      type,
      seriesCount: type === 'series' ? 3 : undefined
    };
    setRotationEntries(prev => [...prev, newEntry]);
    setShowRotationDropdown(false);
  };
  const handleClearRotationType = () => {
    setRotationEntries([]);
  };
  const handleRemoveRotation = (id: string) => {
    setRotationEntries(prev => prev.filter(e => e.id !== id));
  };
  const handleUpdateSeriesCount = (id: string, count: number) => {
    setRotationEntries(prev => prev.map(e => 
      e.id === id ? { ...e, seriesCount: count } : e
    ));
  };
const handleUpdateSpecificationType = (id: string, specificationType: RotationSpecificationType) => {
    setRotationEntries(prev => prev.map(e => 
      e.id === id ? { ...e, specificationType, dbSubType: undefined, selectedDBElement: undefined } : e
    ));
  };
  const handleUpdateDBSubType = (id: string, dbSubType: DBSubType) => {
    setRotationEntries(prev => prev.map(e => 
      e.id === id ? { ...e, dbSubType, selectedDBElement: undefined } : e
    ));
  };
  const handleSelectDBElement = (id: string, element: DBForRisk) => {
    setRotationEntries(prev => prev.map(e => 
      e.id === id ? { ...e, selectedDBElement: element } : e
    ));
  };
  // Check if 2 base rotations already exists
  const hasTwoBaseRotations = rotationEntries.some(e => e.type === 'two');
  // Check if series already exists
  const hasSeries = rotationEntries.some(e => e.type === 'series');
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRotationEntries((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  const handleSelectThrow = (throwItem: DynamicThrow) => {
    setSelectedThrow(throwItem);
    setShowThrowDropdown(false);

    // Auto-add Cr1V and Cr2H when Thr2 is selected
    if (throwItem.code === 'Thr2') {
      const cr1v = generalCriteria.find(gc => gc.code === 'Cr1V');
      const cr2h = generalCriteria.find(gc => gc.code === 'Cr2H');
      const newCriteria: CriteriaItem[] = [];
      if (cr1v && !selectedThrowCriteria.includes('Cr1V')) {
        newCriteria.push({
          id: `throw_${cr1v.code}`,
          name: cr1v.name,
          symbol: cr1v.symbol_image || undefined,
          value: 0.1,
          code: cr1v.code,
          note: 'Without Vision: extra criteria added to throw after rolling the hoop on the floor'
        });
      }
      if (cr2h && !selectedThrowCriteria.includes('Cr2H')) {
        newCriteria.push({
          id: `throw_${cr2h.code}`,
          name: cr2h.name,
          symbol: cr2h.symbol_image || undefined,
          value: 0.1,
          code: cr2h.code,
          note: 'Without Hands: extra criteria added to throw after rolling the hoop on the floor'
        });
      }
      if (newCriteria.length > 0) {
        setThrowCriteria(prev => [...prev.filter(c => c.code !== 'Cr1V' && c.code !== 'Cr2H'), ...newCriteria]);
      }
    }
  };
  const handleSelectCatch = (catchItem: DynamicCatch) => {
    setSelectedCatch(catchItem);
    setShowCatchDropdown(false);

    // Auto-add Cr2H when Catch3 is selected
    if (catchItem.code === 'Catch3') {
      const cr2h = generalCriteria.find(gc => gc.code === 'Cr2H');
      if (cr2h && !selectedCatchCriteria.includes('Cr2H')) {
        const newCriteria: CriteriaItem = {
          id: `catch_${cr2h.code}`,
          name: cr2h.name,
          symbol: cr2h.symbol_image || undefined,
          value: 0.1,
          code: cr2h.code,
          note: 'the criterion {Cr2H} is given for catches with rebounds on the arm(s) or other body parts'
        };
        setCatchCriteria(prev => [...prev.filter(c => c.code !== 'Cr2H'), newCriteria]);
      }
    }
  };
  const handleToggleThrowCriteria = (criteria: GeneralCriteria) => {
    const isSelected = selectedThrowCriteria.includes(criteria.code);
    if (isSelected) {
      setThrowCriteria(throwCriteria.filter(t => t.code !== criteria.code));
    } else {
      const extraCriteriaCount = throwCriteria.filter(t => t.code).length;
      if (extraCriteriaCount < 2) {
        const newCriteria: CriteriaItem = {
          id: `thr_${criteria.code}`,
          name: criteria.name,
          symbol: criteria.symbol_image || undefined,
          value: 0.1,
          code: criteria.code
        };
        setThrowCriteria([...throwCriteria, newCriteria]);
      }
    }
  };
  const handleToggleCatchCriteria = (criteria: GeneralCriteria) => {
    const isSelected = selectedCatchCriteria.includes(criteria.code);
    if (isSelected) {
      setCatchCriteria(catchCriteria.filter(c => c.code !== criteria.code));
    } else {
      const extraCriteriaCount = catchCriteria.filter(c => c.code).length;
      if (extraCriteriaCount < 2) {
        const newCriteria: CriteriaItem = {
          id: `catch_${criteria.code}`,
          name: criteria.name,
          symbol: criteria.symbol_image || undefined,
          value: 0.1,
          code: criteria.code
        };
        setCatchCriteria([...catchCriteria, newCriteria]);
      }
    }
  };
  const handleSaveThrowCriteriaSelection = () => {
    setShowThrowCriteriaDropdown(false);
  };
  const handleSaveCatchCriteriaSelection = () => {
    setShowCatchCriteriaDropdown(false);
  };
  const handleSave = () => {
    // Validation: Check if user has selected either 2 Base Rotations or Series
    const hasValidBaseRotations = rotationEntries.some(e => e.type === 'two' || e.type === 'series');
    if (!hasValidBaseRotations) {
      toast({
        title: "Invalid Risk Configuration",
        description: "A valid Risk requires at least two identical, uninterrupted rotations. Select either '2 Base Rotations' or a 'Series' of Rotations.",
        variant: "destructive"
      });
      return;
    }

    // Default to Thr1 if no throw selected
    const effectiveThrow = selectedThrow || dynamicThrows.find(t => t.code === 'Thr1');
    // Default to Catch1 if no catch selected
    const effectiveCatch = selectedCatch || dynamicCatches.find(c => c.code === 'Catch1');

    // Collect throw symbols (throw symbol + criteria symbols)
    const throwSymbols: string[] = [
      ...(effectiveThrow?.symbol_image ? [effectiveThrow.symbol_image] : []),
      ...throwCriteria.filter(t => t.symbol).map(t => t.symbol!)
    ];
    
    // Collect catch symbols (catch symbol + criteria symbols)
    const catchSymbols: string[] = [
      ...(effectiveCatch?.symbol_image ? [effectiveCatch.symbol_image] : []),
      ...catchCriteria.filter(c => c.symbol).map(c => c.symbol!)
    ];

    // Get axis/level change symbol if present
    const hasAxisChange = rotationEntries.some(e => e.type === 'axis');
    const axisLevelSymbol = hasAxisChange ? (symbols["axisLevelChange"] || '') : undefined;

    // Calculate effective values
    const effectiveThrowValue = effectiveThrow?.value ?? 0;
    const effectiveCatchValue = effectiveCatch?.value ?? 0;
    const effectiveTotalValue = effectiveThrowValue + throwCriteria.reduce((sum, item) => sum + item.value, 0) + rotationValue + effectiveCatchValue + catchCriteria.reduce((sum, item) => sum + item.value, 0);

    // Calculate effective rLevel (include Thr6/Catch8 logic)
    let effectiveRLevel = rotationEntries.reduce((sum, entry) => {
      if (entry.type === 'one') return sum + 1;
      if (entry.type === 'two') return sum + 2;
      if (entry.type === 'axis') return sum;
      return sum + (entry.seriesCount || 3);
    }, 0);
    if (effectiveThrow?.code === 'Thr6') effectiveRLevel += 1;
    if (effectiveCatch?.code === 'Catch8') effectiveRLevel += 1;
    
    const riskData = {
      type: 'R' as const,
      label: `R₊`,
      rLevel: effectiveRLevel,
      value: effectiveTotalValue,
      symbols: symbols,
      throwSymbols: throwSymbols,
      catchSymbols: catchSymbols,
      axisLevelSymbol: axisLevelSymbol,
      isCustomRisk: true,
      apparatus: apparatus,
      components: [...(effectiveThrow ? [{
        name: effectiveThrow.name,
        symbol: effectiveThrow.symbol_image || '',
        value: effectiveThrow.value ?? 0
      }] : []), ...throwCriteria.map(t => ({
        name: t.name,
        symbol: t.symbol || '',
        value: t.value
      })),
      // Add rotation components (including axis/level change)
      ...rotationEntries.map(entry => {
        if (entry.type === 'axis') {
          return {
            name: 'Axis/Level Change',
            symbol: symbols["axisLevelChange"] || '',
            value: 0.1
          };
        }
        return {
          name: entry.type === 'one' ? 'One Rotation' : entry.type === 'two' ? '2 Base Rotations' : `Series (${entry.seriesCount || 3} rotations)`,
          symbol: entry.type === 'series' ? '' : (entry.type === 'one' ? symbols["extraRotation"] : symbols["baseRotations"]) || '',
          value: entry.type === 'one' ? 0.1 : entry.type === 'two' ? 0.2 : ((entry.seriesCount || 3) * 0.1 + 0.2)
        };
      }),
      ...(effectiveCatch ? [{
        name: effectiveCatch.name,
        symbol: effectiveCatch.symbol_image || '',
        value: effectiveCatch.value ?? 0
      }] : []), ...catchCriteria.map(c => ({
        name: c.name,
        symbol: c.symbol || '',
        value: c.value
      }))]
    };
    setSavedRiskData(riskData);
    setShowSuccessDialog(true);
  };
  const handleAddMoreStandardRisks = () => {
    navigate("/routine-calculator", {
      state: {
        newRisk: savedRiskData,
        modifyingElementId: modifyingElementId
      }
    });
    setTimeout(() => navigate("/standard-risks", {
      state: {
        apparatus
      }
    }), 100);
  };
  const handleCreateAnotherRisk = () => {
    navigate("/routine-calculator", {
      state: {
        newRisk: savedRiskData,
        modifyingElementId: modifyingElementId
      }
    });
    setTimeout(() => navigate("/create-custom-risk", {
      state: {
        apparatus
      }
    }), 100);
  };
  const handleGoToCalculator = () => {
    navigate("/routine-calculator", {
      state: {
        newRisk: savedRiskData,
        modifyingElementId: modifyingElementId
      }
    });
  };
  const handleCancel = () => {
    navigate("/dynamic-elements-risk", {
      state: {
        apparatus
      }
    });
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dynamic-elements-risk", {
          state: {
            apparatus
          }
        })} className="text-primary-foreground hover:bg-primary-foreground/20">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold">Create Your Own Risk</h1>
            <p className="text-sm text-primary-foreground/80 mt-1">
              Create R<sub>3</sub>, R<sub>4</sub>, and higher-value Risks by adding rotations and extra throw and catch criteria
            </p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Risk Label */}
          <div className="text-center">
            <h2 className="text-4xl font-bold text-primary flex items-baseline justify-center">
              R<sub className="text-2xl">{rLevel}</sub>
              <span className="ml-4 text-2xl text-muted-foreground">= {totalValue.toFixed(1)}</span>
            </h2>
          </div>

          {/* Throw Section */}
          <div className="mb-6">
            {/* Section Header */}
            <div className="flex items-center border-b-2 border-primary/30 bg-primary/5 rounded-t-lg">
              <div className="flex-1 py-3 px-4 flex items-center justify-between">
                <span className="text-base font-semibold text-primary">Throw</span>
                <div className="relative" ref={throwCriteriaDropdownRef}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (!selectedThrow) {
                        toast({
                          title: "Selection required",
                          description: "Please select a throw type before adding extra criteria.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setShowThrowCriteriaDropdown(!showThrowCriteriaDropdown);
                    }} 
                    className={`text-primary hover:bg-primary/10 ${!selectedThrow ? 'opacity-50' : ''}`}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                  
                  {showThrowCriteriaDropdown && selectedThrow && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-border">
                        <span className="font-medium text-foreground">Select Criteria (max 2)</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {generalCriteria.map(criteria => (
                          <div 
                            key={criteria.id} 
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer" 
                            onClick={() => handleToggleThrowCriteria(criteria)}
                          >
                            <Checkbox 
                              checked={selectedThrowCriteria.includes(criteria.code)} 
                              disabled={!selectedThrowCriteria.includes(criteria.code) && selectedThrowCriteria.length >= 2} 
                            />
                            {criteria.symbol_image && (
                              <img 
                                src={criteria.symbol_image} 
                                alt={criteria.name} 
                                className="h-6 w-6 object-contain" 
                                onError={e => e.currentTarget.style.display = 'none'} 
                              />
                            )}
                            <span className="text-sm text-foreground">{criteria.name}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 border-t border-border">
                        <Button 
                          size="sm" 
                          className="w-full bg-primary hover:bg-primary/90" 
                          onClick={handleSaveThrowCriteriaSelection}
                        >
                          Save Selection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-20 py-3 px-2 text-center border-l border-primary/30">
                <span className="text-sm font-semibold text-muted-foreground">Value</span>
              </div>
            </div>
            
            {/* Section Content */}
            <div className="border-x border-b border-border rounded-b-lg bg-background">
              {!selectedThrow && !throwDuringDB ? (
                <div className="p-4" ref={throwDropdownRef}>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between border-dashed border-2 border-primary/30 hover:border-primary/50 h-14" 
                    onClick={() => setShowThrowDropdown(!showThrowDropdown)}
                  >
                    <span className="text-muted-foreground">Select Throw</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  
                  {showThrowDropdown && (
                    <div className="mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {/* Throw during DB option */}
                      <div 
                        className="flex items-center gap-3 p-3 hover:bg-primary/10 cursor-pointer border-b-2 border-primary/30 bg-primary/5" 
                        onClick={() => {
                          setShowThrowDropdown(false);
                          setShowDBDuringThrowDialog(true);
                        }}
                      >
                        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                          <span className="text-xl">🎯</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-primary font-semibold text-sm">Throw during DB</span>
                          <p className="text-xs text-muted-foreground">Select a DB element performed during throw</p>
                        </div>
                      </div>
                      {filteredThrows.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No throws available for this apparatus
                        </div>
                      ) : filteredThrows.map(throwItem => {
                        const symbolUrl = throwItem.symbol_image || supabase.storage.from('dynamic-element-symbols').getPublicUrl(`dynamic_throws/${throwItem.code}.png`).data.publicUrl;
                        return (
                          <div 
                            key={throwItem.id} 
                            className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0" 
                            onClick={() => handleSelectThrow(throwItem)}
                          >
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                              <img src={symbolUrl} alt={throwItem.code} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-foreground text-sm">
                                <NotesWithSymbols notes={throwItem.name} symbolMap={notesSymbolMap} />
                              </span>
                            </div>
                            <div className="w-12 text-right flex-shrink-0">
                              <span className="text-primary font-semibold">{throwItem.value ?? 0}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : throwDuringDB ? (
                /* Throw during DB - Stacked symbols display */
                <div className="flex items-center border-b border-border last:border-b-0">
                  <div className="w-10 flex justify-center py-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setThrowDuringDB(null)} 
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-16 flex justify-center py-4">
                    {/* Stacked symbols: Standard throw on top, DB below */}
                    <div className="flex flex-col items-center gap-0">
                      {/* Standard throw symbol - Thr1 */}
                      {dynamicThrows.find(t => t.code === 'Thr1')?.symbol_image ? (
                        <img 
                          src={dynamicThrows.find(t => t.code === 'Thr1')!.symbol_image!} 
                          alt="Standard Throw" 
                          className="h-6 w-6 object-contain" 
                          onError={e => e.currentTarget.style.display = 'none'} 
                        />
                      ) : (
                        <div className="h-6 w-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">T</div>
                      )}
                      {/* DB symbol below */}
                      {throwDuringDB.db.symbol_image ? (
                        <img 
                          src={throwDuringDB.db.symbol_image.startsWith('http') 
                            ? throwDuringDB.db.symbol_image 
                            : supabase.storage.from('jump-symbols').getPublicUrl(throwDuringDB.db.symbol_image).data.publicUrl
                          } 
                          alt={throwDuringDB.db.name || throwDuringDB.db.code} 
                          className="h-8 w-8 object-contain -mt-1" 
                          onError={e => e.currentTarget.style.display = 'none'} 
                        />
                      ) : (
                        <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground -mt-1">
                          {throwDuringDB.db.code}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 py-4 px-4">
                    <p className="font-medium text-foreground text-sm">Throw during DB</p>
                    <p className="text-xs text-muted-foreground">
                      {throwDuringDB.dbType.charAt(0).toUpperCase() + throwDuringDB.dbType.slice(1)}: {throwDuringDB.db.name || throwDuringDB.db.description}
                    </p>
                  </div>
                  <div className="w-20 py-4 px-2 text-center border-l border-border">
                    <p className="font-semibold text-primary">{throwDuringDB.db.value}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Selected Throw Row */}
                  <div className="flex items-center border-b border-border">
                    <div className="w-10 flex justify-center py-4">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedThrow(null);
                          setThrowCriteria([]);
                        }} 
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="w-12 flex justify-center py-4">
                      {selectedThrow?.symbol_image ? (
                        <img 
                          src={selectedThrow.symbol_image} 
                          alt={selectedThrow.name} 
                          className="h-8 w-auto max-w-[40px] object-contain" 
                          onError={e => e.currentTarget.style.display = 'none'} 
                        />
                      ) : (
                        <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </div>
                    <div className="flex-1 py-4 px-4">
                      <span className="font-medium text-foreground text-sm">
                        <NotesWithSymbols notes={selectedThrow?.name || ''} symbolMap={notesSymbolMap} />
                      </span>
                    </div>
                    <div className="w-20 py-4 px-2 text-center border-l border-border">
                      <p className="font-semibold text-primary">{selectedThrow?.value ?? 0}</p>
                    </div>
                  </div>
                  
                  {/* Extra Throw Criteria */}
                  {throwCriteria.map(item => (
                    <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                      <div className="w-10 flex justify-center py-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setThrowCriteria(throwCriteria.filter(t => t.id !== item.id))} 
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-12 flex justify-center py-4">
                        {item.symbol ? (
                          <img 
                            src={item.symbol} 
                            alt={item.name} 
                            className="h-8 w-auto max-w-[40px] object-contain" 
                            onError={e => e.currentTarget.style.display = 'none'} 
                          />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">—</div>
                        )}
                      </div>
                      <div className="flex-1 py-4 px-4">
                        <span className="font-medium text-foreground text-sm">
                          {item.note ? <NotesWithSymbols notes={item.note} symbolMap={notesSymbolMap} /> : item.name}
                        </span>
                      </div>
                      <div className="w-20 py-4 px-2 text-center border-l border-border">
                        <p className="font-semibold text-primary">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Rotations Section */}
          <div className="mb-6">
            {/* Section Header */}
            <div className="flex items-center border-b-2 border-primary/30 bg-primary/5 rounded-t-lg">
              <div className="flex-1 py-3 px-4 flex items-center justify-between">
                <span className="text-base font-semibold text-primary">Rotations</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newEntry: RotationEntry = { id: crypto.randomUUID(), type: 'axis' };
                    setRotationEntries(prev => [...prev, newEntry]);
                  }}
                  disabled={hasAxisChange}
                  className={`text-primary hover:bg-primary/10 ${hasAxisChange ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Axis/Level Change
                </Button>
              </div>
              <div className="w-20 py-3 px-2 text-center border-l border-primary/30">
                <span className="text-sm font-semibold text-muted-foreground">Value</span>
              </div>
            </div>
            
            {/* Section Content */}
            <div className="border-x border-b border-border rounded-b-lg bg-background">
              <div className="relative" ref={rotationDropdownRef}>
                {/* Add rotation button - positioned above rotation entries */}
                <div className="relative p-4 border-b border-border/50">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRotationDropdown(!showRotationDropdown)} 
                    className="w-full justify-between border-primary/30 text-foreground hover:bg-primary/5"
                  >
                    <span>{rotationEntries.length === 0 ? 'Select Rotation Type' : '+ Add More Rotations'}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showRotationDropdown ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {showRotationDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 mx-4 bg-background border border-border rounded-lg shadow-xl z-[100]">
                      <div className="p-2 space-y-1">
                        <div className="flex items-center gap-3 p-3 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectRotationType('one')}>
                          <div className="w-8 h-8 flex items-center justify-center">
                            {symbols["extraRotation"] ? <img src={symbols["extraRotation"]} alt="Extra Rotation" className="h-6 w-6 object-contain" /> : <div className="h-6 w-6 bg-muted rounded" />}
                          </div>
                          <div className="flex-1 flex items-center gap-2">
                            <span className="font-medium text-foreground">One Rotation</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <span className="inline-flex">
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <p>If a throw or catch occurs during a rotation, select the appropriate type in the Throw or Catch section. Only select a rotation if it is performed under the flight.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <span className="text-primary font-semibold">0.1</span>
                        </div>
                        {!hasTwoBaseRotations && (
                          <div className="flex items-center gap-3 p-3 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectRotationType('two')}>
                            <div className="w-8 h-8 flex items-center justify-center">
                              {symbols["baseRotations"] ? <img src={symbols["baseRotations"]} alt="Base Rotations" className="h-6 w-6 object-contain" /> : <div className="h-6 w-6 bg-muted rounded" />}
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="font-medium text-foreground">2 Base Rotations</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <span className="inline-flex">
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>Each Risk requires two base rotations. Select '2 Base Rotations' or 'Series.'</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <span className="text-primary font-semibold">0.2</span>
                          </div>
                        )}
                        {!hasSeries && (
                          <div className="flex items-center gap-3 p-3 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectRotationType('series')}>
                            <div className="w-8 h-8 flex items-center justify-center">
                              <span className="text-lg font-bold text-foreground">S</span>
                            </div>
                            <span className="flex-1 font-medium text-foreground">Series (0.2 for a series + at least 0.3 for 3 selected pre-acrobatic elements)</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <span className="inline-flex">
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <p>A series includes three or more identical, uninterrupted pre-acrobatic elements performed under the flight (add more pre-acrobatic elements to increase the value of series), or three turning leap DBs with a throw and catch.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <span className="text-primary font-semibold">0.5</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Show existing rotation entries with drag and drop - below the button */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={rotationEntries.map(e => e.id)} strategy={verticalListSortingStrategy}>
{rotationEntries.map((entry) => (
                      <SortableRotationRow 
                        key={entry.id}
                        entry={entry}
                        symbols={symbols}
                        onRemove={handleRemoveRotation}
                        onUpdateSeriesCount={handleUpdateSeriesCount}
                        onUpdateSpecificationType={handleUpdateSpecificationType}
                        onUpdateDBSubType={handleUpdateDBSubType}
                        onSelectDBElement={handleSelectDBElement}
                        jumpsDBs={jumpsDBs}
                        rotationsDBs={rotationsDBs}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>

          {/* Catch Section */}
          <div className="mb-6">
            {/* Section Header */}
            <div className="flex items-center border-b-2 border-primary/30 bg-primary/5 rounded-t-lg">
              <div className="flex-1 py-3 px-4 flex items-center justify-between">
                <span className="text-base font-semibold text-primary">Catch</span>
                <div className="relative" ref={catchCriteriaDropdownRef}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      if (!selectedCatch) {
                        toast({
                          title: "Selection required",
                          description: "Please select a catch type before adding extra criteria.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setShowCatchCriteriaDropdown(!showCatchCriteriaDropdown);
                    }} 
                    className={`text-primary hover:bg-primary/10 ${!selectedCatch ? 'opacity-50' : ''}`}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                  
                  {showCatchCriteriaDropdown && selectedCatch && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-border">
                        <span className="font-medium text-foreground">Select Criteria (max 2)</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {generalCriteria.map(criteria => (
                          <div 
                            key={criteria.id} 
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer" 
                            onClick={() => handleToggleCatchCriteria(criteria)}
                          >
                            <Checkbox 
                              checked={selectedCatchCriteria.includes(criteria.code)} 
                              disabled={!selectedCatchCriteria.includes(criteria.code) && selectedCatchCriteria.length >= 2} 
                            />
                            {criteria.symbol_image && (
                              <img 
                                src={criteria.symbol_image} 
                                alt={criteria.name} 
                                className="h-6 w-6 object-contain" 
                                onError={e => e.currentTarget.style.display = 'none'} 
                              />
                            )}
                            <span className="text-sm text-foreground">{criteria.name}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 border-t border-border">
                        <Button 
                          size="sm" 
                          className="w-full bg-primary hover:bg-primary/90" 
                          onClick={handleSaveCatchCriteriaSelection}
                        >
                          Save Selection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="w-20 py-3 px-2 text-center border-l border-primary/30">
                <span className="text-sm font-semibold text-muted-foreground">Value</span>
              </div>
            </div>
            
            {/* Section Content */}
            <div className="border-x border-b border-border rounded-b-lg bg-background">
              {!selectedCatch && !catchDuringDB ? (
                <div className="p-4" ref={catchDropdownRef}>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between border-dashed border-2 border-primary/30 hover:border-primary/50 h-14" 
                    onClick={() => setShowCatchDropdown(!showCatchDropdown)}
                  >
                    <span className="text-muted-foreground">Select Catch</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  
                  {showCatchDropdown && (
                    <div className="mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {/* Catch during DB option */}
                      <div 
                        className="flex items-center gap-3 p-3 hover:bg-primary/10 cursor-pointer border-b-2 border-primary/30 bg-primary/5" 
                        onClick={() => {
                          setShowCatchDropdown(false);
                          setShowDBDuringCatchDialog(true);
                        }}
                      >
                        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                          <span className="text-xl">🎯</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-primary font-semibold text-sm">Catch during DB</span>
                          <p className="text-xs text-muted-foreground">Select a DB element performed during catch</p>
                        </div>
                      </div>
                      {filteredCatches.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No catches available for this apparatus
                        </div>
                      ) : filteredCatches.map(catchItem => {
                        const symbolUrl = catchItem.symbol_image || supabase.storage.from('dynamic-element-symbols').getPublicUrl(`dynamic_catches/${catchItem.code}.png`).data.publicUrl;
                        return (
                          <div 
                            key={catchItem.id} 
                            className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0" 
                            onClick={() => handleSelectCatch(catchItem)}
                          >
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                              <img src={symbolUrl} alt={catchItem.code} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} />
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <span className="text-foreground text-sm">{catchItem.name}</span>
                              {catchItem.notes && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <NotesWithSymbols notes={catchItem.notes} symbolMap={notesSymbolMap} />
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <div className="w-12 text-right flex-shrink-0">
                              <span className="text-primary font-semibold">{catchItem.value ?? 0}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : catchDuringDB ? (
                /* Catch during DB - Stacked symbols display */
                <div className="flex items-center border-b border-border last:border-b-0">
                  <div className="w-10 flex justify-center py-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setCatchDuringDB(null)} 
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-16 flex justify-center py-4">
                    {/* Stacked symbols: Standard catch on top, DB below */}
                    <div className="flex flex-col items-center gap-0">
                      {/* Standard catch symbol - Catch1 */}
                      {dynamicCatches.find(c => c.code === 'Catch1')?.symbol_image ? (
                        <img 
                          src={dynamicCatches.find(c => c.code === 'Catch1')!.symbol_image!} 
                          alt="Standard Catch" 
                          className="h-6 w-6 object-contain" 
                          onError={e => e.currentTarget.style.display = 'none'} 
                        />
                      ) : (
                        <div className="h-6 w-6 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">C</div>
                      )}
                      {/* DB symbol below */}
                      {catchDuringDB.db.symbol_image ? (
                        <img 
                          src={catchDuringDB.db.symbol_image.startsWith('http') 
                            ? catchDuringDB.db.symbol_image 
                            : supabase.storage.from('jump-symbols').getPublicUrl(catchDuringDB.db.symbol_image).data.publicUrl
                          } 
                          alt={catchDuringDB.db.name || catchDuringDB.db.code} 
                          className="h-8 w-8 object-contain -mt-1" 
                          onError={e => e.currentTarget.style.display = 'none'} 
                        />
                      ) : (
                        <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground -mt-1">
                          {catchDuringDB.db.code}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 py-4 px-4">
                    <p className="font-medium text-foreground text-sm">Catch during DB</p>
                    <p className="text-xs text-muted-foreground">
                      {catchDuringDB.dbType.charAt(0).toUpperCase() + catchDuringDB.dbType.slice(1)}: {catchDuringDB.db.name || catchDuringDB.db.description}
                    </p>
                  </div>
                  <div className="w-20 py-4 px-2 text-center border-l border-border">
                    <p className="font-semibold text-primary">{catchDuringDB.db.value}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Selected Catch Row */}
                  <div className="flex items-center border-b border-border">
                    <div className="w-10 flex justify-center py-4">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedCatch(null);
                          setCatchCriteria([]);
                        }} 
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="w-12 flex justify-center py-4">
                      {selectedCatch?.symbol_image ? (
                        <img 
                          src={selectedCatch.symbol_image} 
                          alt={selectedCatch.name} 
                          className="h-8 w-auto max-w-[40px] object-contain" 
                          onError={e => e.currentTarget.style.display = 'none'} 
                        />
                      ) : (
                        <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">—</div>
                      )}
                    </div>
                    <div className="flex-1 py-4 px-4 flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{selectedCatch?.name}</span>
                      {selectedCatch?.notes && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <NotesWithSymbols notes={selectedCatch.notes} symbolMap={notesSymbolMap} />
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="w-20 py-4 px-2 text-center border-l border-border">
                      <p className="font-semibold text-primary">{selectedCatch?.value ?? 0}</p>
                    </div>
                  </div>
                  
                  {/* Extra Catch Criteria */}
                  {catchCriteria.map(item => (
                    <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                      <div className="w-10 flex justify-center py-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setCatchCriteria(catchCriteria.filter(c => c.id !== item.id))} 
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="w-12 flex justify-center py-4">
                        {item.symbol ? (
                          <img 
                            src={item.symbol} 
                            alt={item.name} 
                            className="h-8 w-auto max-w-[40px] object-contain" 
                            onError={e => e.currentTarget.style.display = 'none'} 
                          />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">—</div>
                        )}
                      </div>
                      <div className="flex-1 py-4 px-4">
                        <span className="font-medium text-foreground text-sm">
                          {item.name}{item.note && ': '}
                          {item.note && <NotesWithSymbols notes={item.note} symbolMap={notesSymbolMap} />}
                        </span>
                      </div>
                      <div className="w-20 py-4 px-2 text-center border-l border-border">
                        <p className="font-semibold text-primary">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4">
            <Button className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave}>
              Save
            </Button>
            <Button variant="outline" className="px-8 border-muted-foreground" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <DialogTitle className="text-center text-xl">Risk Saved!</DialogTitle>
            <DialogDescription className="text-center">
              Your custom risk R{rLevel} has been saved to the routine calculator.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleAddMoreStandardRisks}>
              Add More Standard Risks
            </Button>
            <Button variant="outline" className="w-full border-secondary text-secondary hover:bg-secondary/10" onClick={handleCreateAnotherRisk}>
              Create Another Custom Risk
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGoToCalculator}>
              Go to Routine Calculator
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DB During Throw Dialog */}
      <DBDuringThrowCatchDialog
        open={showDBDuringThrowDialog}
        onOpenChange={setShowDBDuringThrowDialog}
        type="throw"
        onSelectDB={(db, dbType) => {
          setThrowDuringDB({ db, dbType });
          setSelectedThrow(null);
          setThrowCriteria([]);
        }}
        standardThrowSymbol={dynamicThrows.find(t => t.code === 'Thr1')?.symbol_image}
      />

      {/* DB During Catch Dialog */}
      <DBDuringThrowCatchDialog
        open={showDBDuringCatchDialog}
        onOpenChange={setShowDBDuringCatchDialog}
        type="catch"
        onSelectDB={(db, dbType) => {
          setCatchDuringDB({ db, dbType });
          setSelectedCatch(null);
          setCatchCriteria([]);
        }}
        standardCatchSymbol={dynamicCatches.find(c => c.code === 'Catch1')?.symbol_image}
      />
    </div>;
};
export default CreateCustomRisk;