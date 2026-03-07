import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, CheckCircle, X, ChevronDown, ChevronRight, Info, GripVertical, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate, useLocation } from "react-router-dom";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { ApparatusType } from "@/types/apparatus";
import { useToast } from "@/hooks/use-toast";
import { NotesWithSymbols } from "@/components/routine/NotesWithSymbols";
import { DBDuringThrowCatchDialog } from "@/components/routine/DBDuringThrowCatchDialog";
import multipleVerticalRotationsSymbol from "@/assets/multiple-vertical-rotations-symbol.png";
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
import { VerticalRotationSelectionDialog, VerticalRotation } from "@/components/routine/VerticalRotationSelectionDialog";
import { PreAcrobaticSelectionDialog, PreAcrobaticElement } from "@/components/routine/PreAcrobaticSelectionDialog";

// DB Element interface for unified dbs_for_risks table
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
}

// Sortable Criteria Row Component for throw/catch criteria
interface SortableCriteriaRowProps {
  item: CriteriaItem;
  onRemove: (id: string) => void;
  notesSymbolMap: Record<string, string>;
}

const SortableCriteriaRow = ({ item, onRemove, notesSymbolMap }: SortableCriteriaRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center border-b border-border last:border-b-0">
      <div {...attributes} {...listeners} className="w-8 flex justify-center py-4 cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
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
      <div className="w-20 py-4 px-2 text-center border-l border-border relative">
        <p className="font-semibold text-primary">{item.value}</p>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onRemove(item.id)} 
          className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

// Sortable Rotation Row Component
type RotationType = 'one' | 'two' | 'series' | 'axis' | 'multiple-vertical';
type RotationSpecificationType = 'pre-acrobatic' | 'vertical' | 'db-rotation' | null;
type DBSubType = 'jumps' | 'rotations' | null;
type RotationEntry = { 
  id: string; 
  type: RotationType; 
  seriesCount?: number; 
  specificationType?: RotationSpecificationType;
  dbSubType?: DBSubType;
  selectedDBElement?: DBForRisk;
  selectedVerticalRotation?: VerticalRotation;
  selectedPreAcrobaticElement?: PreAcrobaticElement;
};

const ROTATION_SPECIFICATION_OPTIONS = [
  { value: 'pre-acrobatic' as const, label: 'Pre-acrobatic Elements' },
  { value: 'vertical' as const, label: 'Vertical Rotations' },
];

interface SortableRotationRowProps {
  entry: RotationEntry;
  symbols: Record<string, string>;
  onRemove: (id: string) => void;
  onUpdateSeriesCount: (id: string, count: number) => void;
  onUpdateSpecificationType: (id: string, type: RotationSpecificationType) => void;
  onUpdateDBSubType: (id: string, subType: DBSubType) => void;
  onSelectDBElement: (id: string, element: DBForRisk) => void;
  onSelectVerticalRotation: (id: string, rotation: VerticalRotation) => void;
  onSelectPreAcrobaticElement: (id: string, element: PreAcrobaticElement) => void;
  jumpsDBs: DBForRisk[];
  rotationsDBs: DBForRisk[];
  verticalRotations: VerticalRotation[];
  preAcrobaticElements: PreAcrobaticElement[];
  isFirstRotation: boolean;
}

const SortableRotationRow = ({ entry, symbols, onRemove, onUpdateSeriesCount, onUpdateSpecificationType, onUpdateDBSubType, onSelectDBElement, onSelectVerticalRotation, onSelectPreAcrobaticElement, jumpsDBs, rotationsDBs, verticalRotations, preAcrobaticElements, isFirstRotation }: SortableRotationRowProps) => {
  const [showSpecificationDropdown, setShowSpecificationDropdown] = useState(false);
  const [hoveredDBOption, setHoveredDBOption] = useState(false);
  const [showJumpsDialog, setShowJumpsDialog] = useState(false);
  const [showRotationsDialog, setShowRotationsDialog] = useState(false);
  const [showVerticalRotationsDialog, setShowVerticalRotationsDialog] = useState(false);
  const [showPreAcrobaticDialog, setShowPreAcrobaticDialog] = useState(false);
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
      if (entry.type === 'multiple-vertical') {
        return <img src={multipleVerticalRotationsSymbol} alt="Multiple Vertical Rotations" className="h-8 w-auto max-w-[48px] object-contain" style={{ mixBlendMode: 'multiply' }} />;
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
          2 Rotations (including 2 base rotations)
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Each Risk requires two base rotations. Select '2 Rotations' or 'Series.'</p>
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
    if (entry.type === 'multiple-vertical') {
      return (
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2">
            Multiple Vertical Rotations
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p>Select 3 or more identical vertical rotations performed under the flight. Each rotation adds 0.1 to the value. Vertical rotations cannot be performed in a series.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
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
    if (entry.type === 'multiple-vertical') return (entry.seriesCount || 3) * 0.1;
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
  const showSpecificationButton = entry.type === 'one' || entry.type === 'two' || entry.type === 'series' || entry.type === 'multiple-vertical';
  
  // Build the specification label - show vertical rotation name or pre-acrobatic element if selected
  // Use plural "Rotations" for 'two' (2 base rotations) or 'series'
  const isPlural = entry.type === 'two' || entry.type === 'series' || entry.type === 'multiple-vertical';
  const selectedSpecLabel = (() => {
    if (!entry.specificationType) return null;
    if (entry.specificationType === 'vertical' && entry.selectedVerticalRotation) {
      // Format: "Vertical Upright Rotation(s): name" - capitalize group name and pluralize if needed
      const groupName = (entry.selectedVerticalRotation.group_name || '').charAt(0).toUpperCase() + (entry.selectedVerticalRotation.group_name || '').slice(1).toLowerCase();
      const rotationWord = isPlural ? 'Rotations' : 'Rotation';
      return `Vertical ${groupName} ${rotationWord}: ${entry.selectedVerticalRotation.name}`;
    }
    if (entry.specificationType === 'pre-acrobatic' && entry.selectedPreAcrobaticElement) {
      return `Pre-acrobatic: ${entry.selectedPreAcrobaticElement.name}`;
    }
    return ROTATION_SPECIFICATION_OPTIONS.find(o => o.value === entry.specificationType)?.label || null;
  })();
  
  // Filter rotation options based on type - series can only have pre-acrobatic, multiple-vertical can only have vertical
  const availableRotationOptions = entry.type === 'series' 
    ? ROTATION_SPECIFICATION_OPTIONS.filter(o => o.value === 'pre-acrobatic')
    : entry.type === 'multiple-vertical'
      ? ROTATION_SPECIFICATION_OPTIONS.filter(o => o.value === 'vertical')
      : ROTATION_SPECIFICATION_OPTIONS;

  const getBaseTypeName = () => {
    if (entry.type === 'one') return 'One Rotation';
    if (entry.type === 'two') return '2 Rotations (including 2 base rotations)';
    if (entry.type === 'axis') return 'Axis/Level Change';
    if (entry.type === 'series') return `Series (${entry.seriesCount || 3} rotations)`;
    if (entry.type === 'multiple-vertical') return `Multiple Vertical Rotations (${entry.seriesCount || 3})`;
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
          <div className="w-20 py-4 px-2 text-center border-l border-border relative">
            <p className="font-semibold text-primary">{getValue()}</p>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                onRemove(entry.id);
              }} 
              className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
            >
              <X className="h-3 w-3" />
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
                ) : entry.type === 'multiple-vertical' ? (
                  <img src={multipleVerticalRotationsSymbol} alt="Multiple Vertical Rotations" className="h-6 w-auto max-w-[36px] object-contain" style={{ mixBlendMode: 'multiply' }} />
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
              {availableRotationOptions.map((option) => (
                <div
                  key={option.value}
                  className={`p-3 rounded hover:bg-muted cursor-pointer ${entry.specificationType === option.value ? 'bg-primary/10' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateSpecificationType(entry.id, option.value);
                    setShowSpecificationDropdown(false);
                    // Open appropriate dialog based on selection
                    if (option.value === 'vertical') {
                      setShowVerticalRotationsDialog(true);
                    } else if (option.value === 'pre-acrobatic') {
                      setShowPreAcrobaticDialog(true);
                    }
                  }}
                >
                  <span className="text-sm text-foreground">{option.label}</span>
                </div>
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
        <VerticalRotationSelectionDialog
          open={showVerticalRotationsDialog}
          onOpenChange={setShowVerticalRotationsDialog}
          rotations={verticalRotations}
          onSelect={(rotation) => onSelectVerticalRotation(entry.id, rotation)}
        />
        <PreAcrobaticSelectionDialog
          open={showPreAcrobaticDialog}
          onOpenChange={setShowPreAcrobaticDialog}
          elements={preAcrobaticElements}
          onSelect={(element) => onSelectPreAcrobaticElement(entry.id, element)}
          rotationType={entry.type as 'one' | 'two' | 'series'}
          isFirstRotation={isFirstRotation}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground italic">{selectedSpecLabel}</span>
                    {/* Single "Change Rotation" button that opens the dropdown */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSpecificationDropdown(!showSpecificationDropdown);
                      }}
                    >
                      Change Rotation
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
                      {availableRotationOptions.map((option) => (
                        <div
                          key={option.value}
                          className={`p-3 rounded hover:bg-muted cursor-pointer ${entry.specificationType === option.value ? 'bg-primary/10' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateSpecificationType(entry.id, option.value);
                            setShowSpecificationDropdown(false);
                            // Open appropriate dialog based on selection
                            if (option.value === 'vertical') {
                              setShowVerticalRotationsDialog(true);
                            } else if (option.value === 'pre-acrobatic') {
                              setShowPreAcrobaticDialog(true);
                            }
                          }}
                        >
                          <span className="text-sm text-foreground">{option.label}</span>
                        </div>
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
          <VerticalRotationSelectionDialog
            open={showVerticalRotationsDialog}
            onOpenChange={setShowVerticalRotationsDialog}
            rotations={verticalRotations}
            onSelect={(rotation) => onSelectVerticalRotation(entry.id, rotation)}
          />
          <PreAcrobaticSelectionDialog
            open={showPreAcrobaticDialog}
            onOpenChange={setShowPreAcrobaticDialog}
            elements={preAcrobaticElements}
            onSelect={(element) => onSelectPreAcrobaticElement(entry.id, element)}
            rotationType={entry.type as 'one' | 'two' | 'series'}
            isFirstRotation={isFirstRotation}
          />
        </div>
      </div>
      <div className="w-20 py-4 px-2 text-center border-l border-border relative">
        <p className="font-semibold text-primary">{getValue()}</p>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onRemove(entry.id)} 
          className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
        >
          <X className="h-3 w-3" />
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
  const [showDiveLeapWarning, setShowDiveLeapWarning] = useState(false);
  const [showDiveLeapPrompt, setShowDiveLeapPrompt] = useState(false);
  const [pendingDiveLeapContext, setPendingDiveLeapContext] = useState<{ source: 'throw' | 'rotation'; entryId?: string; element: PreAcrobaticElement } | null>(null);
  const [savedRiskData, setSavedRiskData] = useState<any>(null);
  const [showAxisWarningDialog, setShowAxisWarningDialog] = useState(false);

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
  
  // Extended type for throw/catch during DB that supports jumps, rotations, pre-acrobatic, and vertical
  type ThrowCatchDuringDB = {
    db: { id: string; code: string; name: string | null; description: string; value: number; symbol_image: string | null };
    dbType: 'jumps' | 'rotations';
    rotationCount?: number;
  } | {
    rotationType: 'pre-acrobatic';
    preAcrobaticElement: PreAcrobaticElement;
  } | {
    rotationType: 'vertical';
    verticalRotation: VerticalRotation;
  };
  
  const [throwDuringDB, setThrowDuringDB] = useState<ThrowCatchDuringDB | null>(null);
  const [catchDuringDB, setCatchDuringDB] = useState<ThrowCatchDuringDB | null>(null);
  
  // State for rotation type specification when Thr6 or Catch8 is selected
  type ThrowCatchRotationSpec = {
    type: 'pre-acrobatic' | 'vertical';
    preAcrobaticElement?: PreAcrobaticElement;
    verticalRotation?: VerticalRotation;
  } | null;
  
  const [throwRotationSpec, setThrowRotationSpec] = useState<ThrowCatchRotationSpec>(null);
  const [catchRotationSpec, setCatchRotationSpec] = useState<ThrowCatchRotationSpec>(null);
  
  // UI states for rotation spec dropdowns/dialogs
  const [showThrowRotationSpecDropdown, setShowThrowRotationSpecDropdown] = useState(false);
  const [showThrowVerticalDialog, setShowThrowVerticalDialog] = useState(false);
  const [showThrowPreAcrobaticDialog, setShowThrowPreAcrobaticDialog] = useState(false);
  const [showCatchRotationSpecDropdown, setShowCatchRotationSpecDropdown] = useState(false);
  const [showCatchVerticalDialog, setShowCatchVerticalDialog] = useState(false);
  const [showCatchPreAcrobaticDialog, setShowCatchPreAcrobaticDialog] = useState(false);
  const throwRotationSpecRef = useRef<HTMLDivElement>(null);
  const catchRotationSpecRef = useRef<HTMLDivElement>(null);
  
  // Thr2+Thr6 combo state
  const [extraThrow, setExtraThrow] = useState<DynamicThrow | null>(null);
  const [showExtraThrowDropdown, setShowExtraThrowDropdown] = useState(false);
  const [thr2HasThr6, setThr2HasThr6] = useState(false);
  const extraThrowDropdownRef = useRef<HTMLDivElement>(null);
  
  // Catch combo state: extra regular catches when primary is CatchDuringDB or Catch8
  const [extraCatches, setExtraCatches] = useState<DynamicCatch[]>([]);
  const [showExtraCatchDropdown, setShowExtraCatchDropdown] = useState(false);
  const extraCatchDropdownRef = useRef<HTMLDivElement>(null);
  // When primary is regular catch or Catch8, can add catch during DB
  const [catchHasCatchDuringDB, setCatchHasCatchDuringDB] = useState(false);
  const [extraCatchDuringDBData, setExtraCatchDuringDBData] = useState<ThrowCatchDuringDB | null>(null);
  const [showExtraCatchDBDialog, setShowExtraCatchDBDialog] = useState(false);
  // When primary is regular catch or CatchDuringDB, can add Catch8
  const [catchHasCatch8, setCatchHasCatch8] = useState(false);
  const [extraCatch8RotationSpec, setExtraCatch8RotationSpec] = useState<ThrowCatchRotationSpec>(null);
  const [showExtraCatch8RotationSpecDropdown, setShowExtraCatch8RotationSpecDropdown] = useState(false);
  const [showExtraCatch8VerticalDialog, setShowExtraCatch8VerticalDialog] = useState(false);
  const [showExtraCatch8PreAcrobaticDialog, setShowExtraCatch8PreAcrobaticDialog] = useState(false);
  const extraCatch8RotationSpecRef = useRef<HTMLDivElement>(null);
  
  // Helper functions to extract data from discriminated union
  const getThrowCatchDBInfo = (data: ThrowCatchDuringDB | null) => {
    if (!data) return null;
    if ('db' in data) {
      return {
        name: data.db.name || data.db.description,
        value: data.db.value,
        symbol_image: data.db.symbol_image,
        code: data.db.code,
        type: 'db' as const,
      };
    }
    if ('preAcrobaticElement' in data) {
      return {
        name: data.preAcrobaticElement.name,
        value: 0, // Pre-acrobatic elements don't have intrinsic value in this context
        symbol_image: null,
        code: data.preAcrobaticElement.group_code,
        type: 'pre-acrobatic' as const,
      };
    }
    if ('verticalRotation' in data) {
      return {
        name: data.verticalRotation.name,
        value: 0, // Vertical rotations don't have intrinsic value in this context
        symbol_image: null,
        code: data.verticalRotation.code,
        type: 'vertical' as const,
      };
    }
    return null;
  };

  // Risk components state
  const [throwCriteria, setThrowCriteria] = useState<CriteriaItem[]>([]);
  const [rotationEntries, setRotationEntries] = useState<RotationEntry[]>([]);
  const [seriesCount, setSeriesCount] = useState<number>(3);
  const [showRotationDropdown, setShowRotationDropdown] = useState(false);
  const [catchCriteria, setCatchCriteria] = useState<CriteriaItem[]>([]);
  const rotationDropdownRef = useRef<HTMLDivElement>(null);

  // State for DBs for risks (unified table, filtered by db_group)
  const [dbsForRisks, setDbsForRisks] = useState<DBForRisk[]>([]);
  
  // State for vertical rotations
  const [verticalRotations, setVerticalRotations] = useState<VerticalRotation[]>([]);
  
  // State for pre-acrobatic elements
  const [preAcrobaticElements, setPreAcrobaticElements] = useState<PreAcrobaticElement[]>([]);
  
  // Derived: filter DBs by group
  const jumpsDBs = useMemo(() => dbsForRisks.filter(db => db.db_group === 'jumps'), [dbsForRisks]);
  const rotationsDBs = useMemo(() => dbsForRisks.filter(db => db.db_group === 'rotations'), [dbsForRisks]);
  
  // Check if axis change already exists
  const hasAxisChange = rotationEntries.some(e => e.type === 'axis');

  // Calculate rotation value based on entries (including DB element values)
  const getRotationValue = (): number => {
    return rotationEntries.reduce((sum, entry) => {
      let baseValue = 0;
      if (entry.type === 'one') baseValue = 0.1;
      else if (entry.type === 'two') baseValue = 0.2;
      else if (entry.type === 'axis') baseValue = 0.1;
      else if (entry.type === 'series') baseValue = (entry.seriesCount || 3) * 0.1 + 0.2;
      else if (entry.type === 'multiple-vertical') baseValue = (entry.seriesCount || 3) * 0.1;
      
      // Add DB element value if selected
      const dbValue = entry.selectedDBElement?.value ?? 0;
      return sum + baseValue + dbValue;
    }, 0);
  };

  // Calculate total rotations for R level
  // - Thr6/Catch8 (throw/catch during rotation) each add 1 rotation
  // - Throw/Catch during DB with rotation type (pre-acrobatic or vertical) each add 1 rotation
  // - Note: Even if user specifies multiple rotations for throw/catch during DB, it only counts as 1 rotation for R level
  const getTotalRotations = (): number => {
    let total = rotationEntries.reduce((sum, entry) => {
      if (entry.type === 'one') return sum + 1;
      if (entry.type === 'two') return sum + 2;
      if (entry.type === 'axis') return sum; // axis doesn't add rotations
      if (entry.type === 'multiple-vertical') return sum + (entry.seriesCount || 3);
      return sum + (entry.seriesCount || 3); // series
    }, 0);
    
    // Thr6 (throw during rotation) adds 1 rotation
    if (selectedThrow?.code === 'Thr6' || (selectedThrow?.code === 'Thr2' && thr2HasThr6)) total += 1;
    
    // Catch8 (catch during rotation) adds 1 rotation
    if (selectedCatch?.code === 'Catch8') total += 1;
    
    // Throw during DB always adds 1 rotation (the throw itself involves a rotation)
    if (throwDuringDB) total += 1;
    
    // Catch during DB always adds 1 rotation (the catch itself involves a rotation)
    if (catchDuringDB) total += 1;
    
    // Extra catch combos: catch during DB adds 1 rotation
    if (catchHasCatchDuringDB && extraCatchDuringDBData) total += 1;
    // Extra catch combos: Catch8 adds 1 rotation
    if (catchHasCatch8) total += 1;
    
    return total;
  };
  const rotationValue = getRotationValue();
  const rLevel = getTotalRotations();

  // Calculate throw row value:
  // - Thr6 (throw during rotation): always 0.1
  // - Throw during DB: DB value + 0.1 (always add 0.1 for rotation as risk component)
  // - Other throws: base value only
  const throwDBInfo = getThrowCatchDBInfo(throwDuringDB);
  let throwValue = 0;
  if (throwDuringDB) {
    throwValue = (throwDBInfo?.value ?? 0) + 0.1;
  } else if (selectedThrow?.code === 'Thr6' && extraThrow?.code === 'Thr2') {
    // Thr6+Thr2 combo: 0.1 (rotation) + Thr2 value
    throwValue = 0.1 + (extraThrow.value ?? 0);
  } else if (selectedThrow?.code === 'Thr2' && thr2HasThr6) {
    // Thr2+Thr6 combo: Thr2 value + 0.1 (rotation)
    throwValue = (selectedThrow.value ?? 0) + 0.1;
  } else if (selectedThrow?.code === 'Thr6') {
    throwValue = 0.1;
  } else if (selectedThrow) {
    throwValue = selectedThrow.value ?? 0;
  }
  
  // Calculate catch row value:
  // - Catch8 (catch during rotation): always 0.1
  // - Catch during DB: DB value + 0.1 (always add 0.1 for rotation as risk component)
  // - Other catches: base value only
  const catchDBInfo = getThrowCatchDBInfo(catchDuringDB);
  let catchValue = 0;
  if (catchDuringDB) {
    // Catch during DB: DB value (which already includes extra rotation calculations) + 0.1
    catchValue = (catchDBInfo?.value ?? 0) + 0.1;
  } else if (selectedCatch?.code === 'Catch8') {
    // Catch8: always 0.1
    catchValue = 0.1;
  } else if (selectedCatch) {
    // Other catch types: base value only
    catchValue = selectedCatch.value ?? 0;
  }
  // Extra catch combos: add values
  extraCatches.forEach(c => { catchValue += c.value ?? 0; });
  if (catchHasCatchDuringDB && extraCatchDuringDBData) {
    const extraCatchDBInfoVal = getThrowCatchDBInfo(extraCatchDuringDBData);
    catchValue += (extraCatchDBInfoVal?.value ?? 0) + 0.1;
  }
  if (catchHasCatch8) {
    catchValue += 0.1;
  }
  
  // Total value = sum of all row values (throw + throw criteria + rotations + catch + catch criteria)
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
      if (throwRotationSpecRef.current && !throwRotationSpecRef.current.contains(event.target as Node)) {
        setShowThrowRotationSpecDropdown(false);
      }
      if (catchRotationSpecRef.current && !catchRotationSpecRef.current.contains(event.target as Node)) {
        setShowCatchRotationSpecDropdown(false);
      }
      if (extraThrowDropdownRef.current && !extraThrowDropdownRef.current.contains(event.target as Node)) {
        setShowExtraThrowDropdown(false);
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
    const loadDbsForRisks = async () => {
      const { data, error } = await supabase.from('dbs_for_risks').select('*').order('code');
      if (data && !error) {
        setDbsForRisks(data as DBForRisk[]);
      }
    };
    const loadVerticalRotations = async () => {
      const { data, error } = await supabase.from('vertical_rotations').select('*').order('group_name, name');
      if (data && !error) {
        setVerticalRotations(data as VerticalRotation[]);
      }
    };
    const loadPreAcrobaticElements = async () => {
      const { data, error } = await supabase.from('pre_acrobatic_elements').select('*').order('group_code, name');
      if (data && !error) {
        setPreAcrobaticElements(data as PreAcrobaticElement[]);
      }
    };
    loadSymbols();
    loadGeneralCriteria();
    loadDynamicThrows();
    loadDynamicCatches();
    loadDbsForRisks();
    loadVerticalRotations();
    loadPreAcrobaticElements();
  }, []);

  // Pre-populate form when modifying an existing risk
  useEffect(() => {
    if (!existingRiskData || !existingRiskData.components || dynamicThrows.length === 0 || dynamicCatches.length === 0 || generalCriteria.length === 0) {
      return;
    }

    // If we have editMetadata, use it for full restoration
    const meta = existingRiskData.editMetadata;
    if (meta) {
      // Restore throw
      if (meta.selectedThrowCode) {
        const throwItem = dynamicThrows.find(t => t.code === meta.selectedThrowCode);
        if (throwItem) setSelectedThrow(throwItem);
      }
      // Restore catch
      if (meta.selectedCatchCode) {
        const catchItem = dynamicCatches.find(c => c.code === meta.selectedCatchCode);
        if (catchItem) setSelectedCatch(catchItem);
      }
      // Restore extra throw and thr2+thr6 combo
      if (meta.extraThrow) {
        const et = dynamicThrows.find(t => t.code === meta.extraThrow.code);
        if (et) setExtraThrow(et);
      }
      if (meta.thr2HasThr6) {
        setThr2HasThr6(true);
      }
      // Restore throw/catch rotation specs
      if (meta.throwRotationSpec) {
        setThrowRotationSpec(meta.throwRotationSpec);
      }
      if (meta.catchRotationSpec) {
        setCatchRotationSpec(meta.catchRotationSpec);
      }
      // Restore throw/catch during DB
      if (meta.throwDuringDB) {
        setThrowDuringDB(meta.throwDuringDB);
      }
      if (meta.catchDuringDB) {
        setCatchDuringDB(meta.catchDuringDB);
      }
      // Restore rotation entries with full specification data
      if (meta.rotationEntries && meta.rotationEntries.length > 0) {
        const restoredEntries = meta.rotationEntries.map((entry: any) => ({
          ...entry,
          id: entry.id || crypto.randomUUID(),
        }));
        // Ensure axis/level change is included if present in components but missing from metadata
        const components = existingRiskData.components as Array<{ name: string; symbol: string; value: number }>;
        const hasAxisInEntries = restoredEntries.some((e: any) => e.type === 'axis');
        const hasAxisInComponents = components?.some(c => c.name === 'Axis/Level Change');
        if (!hasAxisInEntries && hasAxisInComponents) {
          restoredEntries.push({ id: crypto.randomUUID(), type: 'axis' as const });
        }
        setRotationEntries(restoredEntries);
      } else {
        // Even if no rotation entries in metadata, check components for axis/level change
        const components = existingRiskData.components as Array<{ name: string; symbol: string; value: number }>;
        const hasAxisInComponents = components?.some(c => c.name === 'Axis/Level Change');
        if (hasAxisInComponents) {
          setRotationEntries([{ id: crypto.randomUUID(), type: 'axis' as const }]);
        }
      }
      // Restore throw/catch criteria from components
      const components = existingRiskData.components as Array<{ name: string; symbol: string; value: number }>;
      const throwNames = dynamicThrows.map(t => t.name);
      const catchNames = dynamicCatches.map(c => c.name);
      const criteriaNames = generalCriteria.map(gc => gc.name);
      
      const newThrowCriteria: CriteriaItem[] = [];
      const newCatchCriteria: CriteriaItem[] = [];
      let foundCatch = false;

      components.forEach((comp) => {
        if (throwNames.includes(comp.name) || catchNames.includes(comp.name)) {
          if (catchNames.includes(comp.name)) foundCatch = true;
          return;
        }
        // Skip rotation entries and throw-during-rotation rows (handled by metadata)
        if (comp.name === 'Throw during rotation') return;
        if (criteriaNames.includes(comp.name)) {
          const criteria = generalCriteria.find(gc => gc.name === comp.name);
          if (criteria) {
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
        }
      });

      if (newThrowCriteria.length > 0) setThrowCriteria(newThrowCriteria);
      if (newCatchCriteria.length > 0) setCatchCriteria(newCatchCriteria);
      return;
    }

    // Fallback: legacy parsing from component names (no editMetadata)
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
  const handleSelectRotationType = (type: 'one' | 'two' | 'series' | 'multiple-vertical') => {
    const newEntry: RotationEntry = {
      id: crypto.randomUUID(),
      type,
      seriesCount: (type === 'series' || type === 'multiple-vertical') ? 3 : undefined
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
  const handleSelectVerticalRotation = (id: string, rotation: VerticalRotation) => {
    setRotationEntries(prev => prev.map(e => 
      e.id === id ? { ...e, selectedVerticalRotation: rotation } : e
    ));
  };
  const handleSelectPreAcrobaticElement = (id: string, element: PreAcrobaticElement) => {
    // Check if Dive Leap is being selected
    if (element.name?.toLowerCase() === 'dive leap') {
      const throwHasRotation = selectedThrow?.code === 'Thr6' || (selectedThrow?.code === 'Thr2' && thr2HasThr6) || 
        (throwDuringDB && (
          ('db' in throwDuringDB && throwDuringDB.dbType === 'rotations') ||
          'preAcrobaticElement' in throwDuringDB ||
          'verticalRotation' in throwDuringDB
        ));
      
      // Block dive leap entirely if a rotation-based throw exists
      if (throwHasRotation) {
        return; // Silently prevent — dive leap is not valid after rotation-based throw
      }
      
      // Show prompt if dive leap will be the first rotation (no rotation-based throw)
      const entryIndex = rotationEntries.findIndex(e => e.id === id);
      const actualRotations = rotationEntries.filter(e => e.type !== 'axis');
      const isFirstActualRotation = entryIndex === 0 || actualRotations[0]?.id === id || actualRotations.length === 0;
      
      if (isFirstActualRotation || entryIndex <= 0) {
        setPendingDiveLeapContext({ source: 'rotation', entryId: id, element });
        setShowDiveLeapPrompt(true);
        return;
      }
    }
    
    applyPreAcrobaticElement(id, element);
  };
  
  const applyPreAcrobaticElement = (id: string, element: PreAcrobaticElement) => {
    setRotationEntries(prev => {
      let updated = prev.map(e => 
        e.id === id ? { ...e, selectedPreAcrobaticElement: element } : e
      );
      
      // Dive Leap rule: must be the first rotational element in the rotation section
      // Auto-move the entry with Dive Leap to the first position
      if (element.name?.toLowerCase() === 'dive leap') {
        const diveLeapIndex = updated.findIndex(e => e.id === id);
        if (diveLeapIndex > 0) {
          const [diveEntry] = updated.splice(diveLeapIndex, 1);
          updated.unshift(diveEntry);
        }
      }
      
      // Business rule: if level_change = true AND two_bases_series = false,
      // automatically add change of level/axis criteria
      if (element.level_change && !element.two_bases_series) {
        // Check if axis change entry already exists
        const hasAxisChange = updated.some(e => e.type === 'axis');
        if (!hasAxisChange) {
          // Add axis change entry automatically
          updated.push({
            id: crypto.randomUUID(),
            type: 'axis'
          });
        }
      }
      
      return updated;
    });
  };
  
  // Handler for Dive Leap prompt "Yes, add" - adds dive leap + roll forward
  // Helper: auto-add axis/level change for dive leap in throw section (counts as valid rotation)
  const autoAddAxisChangeForThrowDiveLeap = () => {
    setRotationEntries(prev => {
      const hasAxisChange = prev.some(e => e.type === 'axis');
      if (!hasAxisChange) {
        return [...prev, { id: crypto.randomUUID(), type: 'axis' as const }];
      }
      return prev;
    });
  };

  // Handler for Dive Leap prompt "Yes, add" - adds dive leap + roll forward
  const handleDiveLeapPromptYes = () => {
    if (!pendingDiveLeapContext) return;
    
    const { source, entryId, element } = pendingDiveLeapContext;
    
    if (source === 'throw') {
      // Apply dive leap to throw rotation spec
      setThrowRotationSpec({ type: 'pre-acrobatic', preAcrobaticElement: element });
      // Dive leap in throw counts as rotation, so auto-add axis/level change
      autoAddAxisChangeForThrowDiveLeap();
    } else if (source === 'rotation' && entryId) {
      // Apply dive leap to the rotation entry (applyPreAcrobaticElement handles axis auto-add)
      applyPreAcrobaticElement(entryId, element);
    }
    
    // Find "Roll forward" from pre-acrobatic elements
    const rollForward = preAcrobaticElements.find(e => e.name?.toLowerCase() === 'roll forward');
    if (rollForward) {
      // Auto-add a single rotation entry with Roll Forward directly after the dive leap
      const newEntry: RotationEntry = {
        id: crypto.randomUUID(),
        type: 'one',
        specificationType: 'pre-acrobatic',
        selectedPreAcrobaticElement: rollForward,
      };
      setRotationEntries(prev => {
        // Find the dive leap entry index to insert right after it
        const diveLeapIndex = entryId 
          ? prev.findIndex(e => e.id === entryId)
          : prev.findIndex(e => 
              e.specificationType === 'pre-acrobatic' && 
              e.selectedPreAcrobaticElement?.name?.toLowerCase() === 'dive leap'
            );
        if (diveLeapIndex >= 0) {
          const updated = [...prev];
          updated.splice(diveLeapIndex + 1, 0, newEntry);
          return updated;
        }
        return [...prev, newEntry];
      });
    }
    
    setShowDiveLeapPrompt(false);
    setPendingDiveLeapContext(null);
  };
  
  // Handler for Dive Leap prompt "No" - just adds dive leap
  const handleDiveLeapPromptNo = () => {
    if (!pendingDiveLeapContext) return;
    
    const { source, entryId, element } = pendingDiveLeapContext;
    
    if (source === 'throw') {
      setThrowRotationSpec({ type: 'pre-acrobatic', preAcrobaticElement: element });
      // Dive leap in throw counts as rotation, so auto-add axis/level change
      autoAddAxisChangeForThrowDiveLeap();
    } else if (source === 'rotation' && entryId) {
      applyPreAcrobaticElement(entryId, element);
    }
    
    setShowDiveLeapPrompt(false);
    setPendingDiveLeapContext(null);
  };
  // Check if series already exists (only series is restricted to one)
  const hasSeries = rotationEntries.some(e => e.type === 'series');
  
  // Check if Dive Leap is selected in any rotation entry's pre-acrobatic element
  const hasDiveLeapInRotation = rotationEntries.some(e => 
    e.specificationType === 'pre-acrobatic' && 
    e.selectedPreAcrobaticElement?.name?.toLowerCase() === 'dive leap'
  );
  
  // Check if Dive Leap is selected in the Throw section (Thr6 with pre-acrobatic spec)
  const hasDiveLeapInThrow = (selectedThrow?.code === 'Thr6' || (selectedThrow?.code === 'Thr2' && thr2HasThr6)) && 
    throwRotationSpec?.type === 'pre-acrobatic' && 
    throwRotationSpec?.preAcrobaticElement?.name?.toLowerCase() === 'dive leap';
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  const handleRotationDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRotationEntries((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        // Enforce: if any entry has Dive Leap, it must remain first
        const diveLeapIdx = reordered.findIndex(e => 
          e.specificationType === 'pre-acrobatic' && 
          e.selectedPreAcrobaticElement?.name?.toLowerCase() === 'dive leap'
        );
        if (diveLeapIdx > 0) {
          const [diveEntry] = reordered.splice(diveLeapIdx, 1);
          reordered.unshift(diveEntry);
        }
        
        return reordered;
      });
    }
  };

  const handleThrowCriteriaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setThrowCriteria((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCatchCriteriaDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCatchCriteria((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  const handleSelectThrow = (throwItem: DynamicThrow) => {
    setSelectedThrow(throwItem);
    setShowThrowDropdown(false);
    setThrowRotationSpec(null);
    setExtraThrow(null);
    setShowExtraThrowDropdown(false);
    setThr2HasThr6(false);

    // Auto-add Cr2H when Thr2 is selected
    if (throwItem.code === 'Thr2') {
      const cr2h = generalCriteria.find(gc => gc.code === 'Cr2H');
      if (cr2h && !selectedThrowCriteria.includes('Cr2H')) {
        const newCriteria: CriteriaItem = {
          id: `throw_${cr2h.code}`,
          name: cr2h.name,
          symbol: cr2h.symbol_image || undefined,
          value: 0.1,
          code: cr2h.code,
          note: 'Without Hands: extra criteria added to throw after rolling the hoop on the floor'
        };
        setThrowCriteria(prev => [...prev.filter(c => c.code !== 'Cr2H'), newCriteria]);
      }
    }
  };
  
  // Handler for selecting extra Thr2 when Thr6 is primary
  const handleSelectExtraThrow = (throwItem: DynamicThrow) => {
    if (throwItem.code !== 'Thr2') return;
    setExtraThrow(throwItem);
    setShowExtraThrowDropdown(false);
    
    // Auto-add Cr2H criteria (same as handleSelectThrow for Thr2)
    const cr2h = generalCriteria.find(gc => gc.code === 'Cr2H');
    if (cr2h && !selectedThrowCriteria.includes('Cr2H')) {
      const newCriteria: CriteriaItem = {
        id: `throw_${cr2h.code}`,
        name: cr2h.name,
        symbol: cr2h.symbol_image || undefined,
        value: 0.1,
        code: cr2h.code,
        note: 'Without Hands: extra criteria added to throw after rolling the hoop on the floor'
      };
      setThrowCriteria(prev => [...prev.filter(c => c.code !== 'Cr2H'), newCriteria]);
    }
  };
  
  // Handler to remove extra Thr2 from Thr6 combo
  const handleRemoveExtraThrow = () => {
    setExtraThrow(null);
    // Remove auto-added Cr2H
    setThrowCriteria(prev => prev.filter(c => c.code !== 'Cr2H'));
  };

  const handleSelectCatch = (catchItem: DynamicCatch) => {
    setSelectedCatch(catchItem);
    setShowCatchDropdown(false);
    setCatchRotationSpec(null); // Reset rotation spec when catch changes

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
  // Helper function to check if two rotation entries are identical
  const areRotationsIdentical = (a: RotationEntry, b: RotationEntry): boolean => {
    // Both must be single rotations with the same specification type
    if (a.type !== 'one' || b.type !== 'one') return false;
    if (a.specificationType !== b.specificationType) return false;
    if (!a.specificationType) return false;
    
    // Compare based on specification type
    if (a.specificationType === 'pre-acrobatic') {
      return a.selectedPreAcrobaticElement?.id === b.selectedPreAcrobaticElement?.id 
             && a.selectedPreAcrobaticElement?.id !== undefined;
    }
    
    if (a.specificationType === 'vertical') {
      return a.selectedVerticalRotation?.id === b.selectedVerticalRotation?.id
             && a.selectedVerticalRotation?.id !== undefined;
    }
    
    return false;
  };

  // Axis/Level Change pre-checker
  // Returns 'ok' if no issue, 'auto-added' if axis was added automatically, 'warning' if user should be warned
  const checkAxisLevelChangeCriterion = (): 'ok' | 'warning' => {
    const actualRotations = rotationEntries.filter(e => e.type !== 'axis');
    if (actualRotations.length === 0) return 'ok';
    
    // Dive leap always comes with valid change of level — skip all checks
    const hasDiveLeap = actualRotations.some(e => 
      e.specificationType === 'pre-acrobatic' && 
      e.selectedPreAcrobaticElement?.name?.toLowerCase() === 'dive leap'
    ) || (throwRotationSpec?.type === 'pre-acrobatic' && 
      throwRotationSpec?.preAcrobaticElement?.name?.toLowerCase() === 'dive leap');
    if (hasDiveLeap) return 'ok';
    
    const hasAxisChange = rotationEntries.some(e => e.type === 'axis');
    if (!hasAxisChange) {
      // Check if we should auto-add below, otherwise no issue
    }
    
    const hasVertical = actualRotations.some(e => e.specificationType === 'vertical' && e.selectedVerticalRotation);
    const hasPreAcrobatic = actualRotations.some(e => e.specificationType === 'pre-acrobatic' && e.selectedPreAcrobaticElement);
    
    // Also check throw section for pre-acrobatic (dive leap)
    const throwHasPreAcrobatic = throwRotationSpec?.type === 'pre-acrobatic' && throwRotationSpec?.preAcrobaticElement;
    const effectiveHasPreAcrobatic = hasPreAcrobatic || throwHasPreAcrobatic;
    
    // Case: axis change exists but rotations are not fully specified (missing type or element)
    if (hasAxisChange) {
      const unspecifiedRotations = actualRotations.some(e => 
        !e.specificationType || 
        (e.specificationType === 'vertical' && !e.selectedVerticalRotation) ||
        (e.specificationType === 'pre-acrobatic' && !e.selectedPreAcrobaticElement)
      );
      if (unspecifiedRotations) {
        return 'warning';
      }
    }
    
    // Case 1: Mix of vertical + pre-acrobatic → auto-add axis if missing (always valid)
    if (hasVertical && effectiveHasPreAcrobatic) {
      if (!hasAxisChange) {
        setRotationEntries(prev => [...prev, { id: crypto.randomUUID(), type: 'axis' as const }]);
      }
      return 'ok';
    }
    
    // Case 2: Only vertical rotations with axis change → check groups
    if (hasVertical && !effectiveHasPreAcrobatic && hasAxisChange) {
      const verticalEntries = actualRotations.filter(e => e.specificationType === 'vertical' && e.selectedVerticalRotation);
      const groups = new Set(verticalEntries.map(e => e.selectedVerticalRotation!.group_name?.toLowerCase()));
      if (groups.size <= 1) {
        return 'warning';
      }
      return 'ok';
    }
    
    // Case 3: Only pre-acrobatic rotations with axis change → flag
    if (effectiveHasPreAcrobatic && !hasVertical && hasAxisChange) {
      return 'warning';
    }
    
    return 'ok';
  };

  // Comprehensive validation for rotation configuration
  const validateRotationConfiguration = (): { valid: boolean; message: string } => {
    // Filter out axis entries (they're criteria, not rotations)
    const actualRotations = rotationEntries.filter(e => e.type !== 'axis');
    
    if (actualRotations.length === 0) {
      return { 
        valid: false, 
        message: "A valid Risk requires at least two identical, uninterrupted rotations." 
      };
    }
    
    // Check for automatically valid types (series, multiple-vertical, two)
    const hasSeriesOrMultipleOrTwo = actualRotations.some(e => 
      e.type === 'series' || e.type === 'multiple-vertical' || e.type === 'two'
    );
    
    if (hasSeriesOrMultipleOrTwo) {
      return { valid: true, message: "" };
    }
    
    // Dive Leap + Roll Forward validation
    // Case 1: Dive Leap in Throw (Thr6 spec) + Roll Forward as first rotation entry = valid R2
    if (hasDiveLeapInThrow) {
      if (actualRotations.length >= 1) {
        const firstRot = actualRotations[0];
        if (firstRot.specificationType === 'pre-acrobatic' && 
            firstRot.selectedPreAcrobaticElement?.name?.toLowerCase() === 'roll forward') {
          return { valid: true, message: "" };
        }
        // Even without roll forward, dive leap in throw + any rotation = valid
        return { valid: true, message: "" };
      }
    }
    
    // Dive Leap in Rotation section
    const diveLeapRotEntry = actualRotations.find(e => 
      e.specificationType === 'pre-acrobatic' && 
      e.selectedPreAcrobaticElement?.name?.toLowerCase() === 'dive leap'
    );
    if (diveLeapRotEntry) {
      const diveLeapIdx = actualRotations.indexOf(diveLeapRotEntry);
      
      // Check if throw has a rotation (meaning dive leap is NOT the first rotation overall)
      const throwHasRotation = selectedThrow?.code === 'Thr6' || (selectedThrow?.code === 'Thr2' && thr2HasThr6) || 
        (throwDuringDB && (
          ('db' in throwDuringDB && throwDuringDB.dbType === 'rotations') ||
          'preAcrobaticElement' in throwDuringDB ||
          'verticalRotation' in throwDuringDB
        ));
      
      if (!throwHasRotation) {
        // Dive leap IS the first rotation overall
        // Case 2: Dive Leap (first) + immediately followed by Roll Forward (any type) = valid
        const nextRot = actualRotations[diveLeapIdx + 1];
        if (nextRot) {
          if (nextRot.specificationType === 'pre-acrobatic' && 
              nextRot.selectedPreAcrobaticElement?.name?.toLowerCase() === 'roll forward') {
            return { valid: true, message: "" };
          }
          // Dive leap + any other rotation still needs standard validation (2 identical or series/two)
          if (actualRotations.length >= 2) {
            return { valid: true, message: "" };
          }
        }
      } else {
        // Dive leap follows a rotation-based throw — it does NOT count as rotation
        // The user needs 2 base rotations or series independently (excluding dive leap)
        const nonDiveLeapRotations = actualRotations.filter(e => 
          !(e.specificationType === 'pre-acrobatic' && 
            e.selectedPreAcrobaticElement?.name?.toLowerCase() === 'dive leap')
        );
        
        // Check if remaining rotations satisfy the requirement independently
        const hasSeriesOrTwoInRemaining = nonDiveLeapRotations.some(e => 
          e.type === 'series' || e.type === 'multiple-vertical' || e.type === 'two'
        );
        if (hasSeriesOrTwoInRemaining) {
          return { valid: true, message: "" };
        }
        
        // Check for consecutive identical singles in remaining
        const singles = nonDiveLeapRotations.filter(e => e.type === 'one');
        if (singles.length >= 2) {
          for (let i = 0; i < singles.length - 1; i++) {
            if (areRotationsIdentical(singles[i], singles[i + 1])) {
              return { valid: true, message: "" };
            }
          }
        }
        
        return { 
          valid: false, 
          message: "Since the dive leap follows a rotation-based throw, it does not count as a rotational element. You need at least two base rotations or a series independently." 
        };
      }
    }
    
    // For single rotations only, check for consecutive identical pairs
    const singleRotations = actualRotations.filter(e => e.type === 'one');
    
    if (singleRotations.length < 2) {
      return { 
        valid: false, 
        message: "A valid Risk requires at least two identical rotations. Add another identical rotation or select '2 Rotations' or 'Series'." 
      };
    }
    
    // Check for consecutive identical rotations in the original array (ignoring axis entries)
    for (let i = 0; i < singleRotations.length - 1; i++) {
      const current = singleRotations[i];
      const next = singleRotations[i + 1];
      
      // Find their positions in the original rotationEntries array
      const currentIndex = rotationEntries.findIndex(e => e.id === current.id);
      const nextIndex = rotationEntries.findIndex(e => e.id === next.id);
      
      // Check if they're adjacent (ignoring axis entries between them)
      const entriesBetween = rotationEntries.slice(currentIndex + 1, nextIndex);
      const nonAxisBetween = entriesBetween.filter(e => e.type !== 'axis');
      
      // If no non-axis entries between them and they're identical, it's valid
      if (nonAxisBetween.length === 0 && areRotationsIdentical(current, next)) {
        return { valid: true, message: "" };
      }
    }
    
    // Check if there are identical rotations but they're not consecutive
    const hasIdenticalButNotConsecutive = singleRotations.some((rot, idx) => 
      singleRotations.some((other, otherIdx) => 
        idx !== otherIdx && areRotationsIdentical(rot, other)
      )
    );
    
    if (hasIdenticalButNotConsecutive) {
      return { 
        valid: false, 
        message: "Identical rotations must be performed consecutively without interruption. Reorder your rotations so identical elements are adjacent (e.g., chainé, chainé, roll instead of chainé, roll, chainé)." 
      };
    }
    
    return { 
      valid: false, 
      message: "Two rotations must be identical (same element). Select the same pre-acrobatic or vertical rotation for at least two consecutive entries." 
    };
  };

  const handleSave = () => {
    // Validate rotation configuration
    const rotationValidation = validateRotationConfiguration();
    if (!rotationValidation.valid) {
      toast({
        title: "Invalid Risk Configuration",
        description: rotationValidation.message,
        variant: "destructive"
      });
      return;
    }

    // Default to Thr1 if no throw selected AND no throw during DB
    const effectiveThrow = throwDuringDB ? null : (selectedThrow || dynamicThrows.find(t => t.code === 'Thr1'));
    // Default to Catch1 if no catch selected AND no catch during DB
    const effectiveCatch = catchDuringDB ? null : (selectedCatch || dynamicCatches.find(c => c.code === 'Catch1'));

    // Build effective rotation entries that include auto-added axis/level change
    const effectiveRotationEntries = (() => {
      const entries = [...rotationEntries];
      const hasAxisChange = entries.some(e => e.type === 'axis');
      if (!hasAxisChange) {
        const actualRotations = entries.filter(e => e.type !== 'axis');
        const hasVertical = actualRotations.some(e => e.specificationType === 'vertical' && e.selectedVerticalRotation);
        const hasPreAcrobatic = actualRotations.some(e => e.specificationType === 'pre-acrobatic' && e.selectedPreAcrobaticElement);
        const throwHasPreAcrobatic = throwRotationSpec?.type === 'pre-acrobatic' && throwRotationSpec?.preAcrobaticElement;
        if (hasVertical && (hasPreAcrobatic || throwHasPreAcrobatic)) {
          entries.push({ id: crypto.randomUUID(), type: 'axis' as const });
        }
      }
      return entries;
    })();

    // Collect throw symbols (throw symbol + extra throw symbol + criteria symbols)
    const throwDBInfo_save = getThrowCatchDBInfo(throwDuringDB);
    const catchDBInfo_save = getThrowCatchDBInfo(catchDuringDB);
    const throwSymbols: string[] = [
      ...(throwDuringDB && throwDBInfo_save?.symbol_image ? [throwDBInfo_save.symbol_image] : 
          effectiveThrow?.symbol_image ? [effectiveThrow.symbol_image] : []),
      // Thr6+Thr2 combo: include Thr2 symbol after Thr6
      ...(extraThrow?.symbol_image ? [extraThrow.symbol_image] : []),
      // Thr2+Thr6 combo: include Thr6 symbol after Thr2
      ...(thr2HasThr6 ? (() => {
        const thr6Item = dynamicThrows.find(t => t.code === 'Thr6');
        return thr6Item?.symbol_image ? [thr6Item.symbol_image] : [];
      })() : []),
      ...throwCriteria.filter(t => t.symbol).map(t => t.symbol!)
    ];
    
    // Collect catch symbols (catch symbol + criteria symbols)
    const catchSymbols: string[] = [
      ...(catchDuringDB && catchDBInfo_save?.symbol_image ? [catchDBInfo_save.symbol_image] :
          effectiveCatch?.symbol_image ? [effectiveCatch.symbol_image] : []),
      ...catchCriteria.filter(c => c.symbol).map(c => c.symbol!)
    ];

    // Get axis/level change symbol if present (from effective entries which include auto-added)
    const hasAxisChange = effectiveRotationEntries.some(e => e.type === 'axis');
    const axisLevelSymbol = hasAxisChange ? (symbols["axisLevelChange"] || '') : undefined;

    // Calculate effective rLevel (for display only)
    // excludeDiveLeap: when true, dive leap in Rotations section won't count as a rotation
    const calculateRLevel = (excludeDiveLeap: boolean) => {
      let rLevel = rotationEntries.reduce((sum, entry) => {
        if (entry.type === 'axis') return sum;
        if (excludeDiveLeap && entry.type === 'one' && 
            entry.specificationType === 'pre-acrobatic' && 
            entry.selectedPreAcrobaticElement?.name?.toLowerCase() === 'dive leap') {
          return sum; // Skip dive leap
        }
        if (entry.type === 'one') return sum + 1;
        if (entry.type === 'two') return sum + 2;
        return sum + (entry.seriesCount || 3);
      }, 0);
      if (effectiveThrow?.code === 'Thr6' || thr2HasThr6) rLevel += 1;
      if (effectiveCatch?.code === 'Catch8') rLevel += 1;
      // Throw/Catch during DB always adds +1 rotation to R subscript
      if (throwDuringDB) rLevel += 1;
      if (catchDuringDB) rLevel += 1;
      return rLevel;
    };
    let effectiveRLevel = calculateRLevel(false);
    
    // Calculate effective throw value
    let effectiveThrowValue = 0;
    if (throwDuringDB) {
      // Throw during DB: DB value + 0.1 for rotation
      effectiveThrowValue = (throwDBInfo_save?.value ?? 0) + 0.1;
    } else if (effectiveThrow) {
      effectiveThrowValue = effectiveThrow.value ?? 0;
      const hasRotation = effectiveThrow.code === 'Thr6' || thr2HasThr6;
      if (hasRotation) effectiveThrowValue = 0.1; // Thr6 base is 0.1
      if (thr2HasThr6 && effectiveThrow.code === 'Thr2') {
        effectiveThrowValue = (effectiveThrow.value ?? 0) + 0.1;
      }
    }
    if (extraThrow) {
      effectiveThrowValue += (extraThrow.value ?? 0);
    }
    
    // Calculate effective catch value
    let effectiveCatchValue = 0;
    if (catchDuringDB) {
      // Catch during DB: DB value + 0.1 for rotation
      effectiveCatchValue = (catchDBInfo_save?.value ?? 0) + 0.1;
    } else if (effectiveCatch) {
      effectiveCatchValue = effectiveCatch.value ?? 0;
      if (effectiveCatch.code === 'Catch8') effectiveCatchValue = 0.1;
    }
    
    // Total = sum of all row values
    const effectiveTotalValue = effectiveThrowValue + throwCriteria.reduce((sum, item) => sum + item.value, 0) + rotationValue + effectiveCatchValue + catchCriteria.reduce((sum, item) => sum + item.value, 0);

    
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
      components: [
      // Throw component: either specific throw, throw during DB, or nothing
      ...(effectiveThrow ? [{
        name: effectiveThrow.name,
        symbol: effectiveThrow.symbol_image || '',
        value: effectiveThrow.value ?? 0,
        ...(effectiveThrow.code === 'Thr6' ? {
          rotationTag: throwRotationSpec?.type === 'pre-acrobatic' ? 'ACRO' as const :
                       throwRotationSpec?.type === 'vertical' ? 'VER' as const : 'UNK' as const
        } : {})
      }] : []),
      // Throw during DB component (when no standard throw selected)
      ...(throwDuringDB ? [{
        name: `Throw during ${throwDBInfo_save?.type === 'pre-acrobatic' ? 'Pre-acrobatic' : throwDBInfo_save?.type === 'vertical' ? 'Vertical Rotation' : 'DB'}: ${throwDBInfo_save?.name || 'Element'}`,
        symbol: throwDBInfo_save?.symbol_image || '',
        value: (throwDBInfo_save?.value ?? 0) + 0.1,
        rotationTag: throwDBInfo_save?.type === 'pre-acrobatic' ? 'ACRO' as const :
                     throwDBInfo_save?.type === 'vertical' ? 'VER' as const : 'DB' as const
      }] : []),
      // Thr2+Thr6 combo: include paired throw component
      ...(extraThrow ? [{
        name: extraThrow.name,
        symbol: extraThrow.symbol_image || '',
        value: extraThrow.value ?? 0
      }] : []),
      ...(thr2HasThr6 ? [{
        name: 'Throw during rotation',
        symbol: dynamicThrows.find(t => t.code === 'Thr6')?.symbol_image || '',
        value: 0.1,
        rotationTag: throwRotationSpec?.type === 'pre-acrobatic' ? 'ACRO' as const :
                     throwRotationSpec?.type === 'vertical' ? 'VER' as const : 'UNK' as const
      }] : []),
      ...throwCriteria.map(t => ({
        name: t.name,
        symbol: t.symbol || '',
        value: t.value
      })),
      // Add rotation components (including axis/level change) from effective entries
      ...effectiveRotationEntries.map(entry => {
        if (entry.type === 'axis') {
          return {
            name: 'Axis/Level Change',
            symbol: symbols["axisLevelChange"] || '',
            value: 0.1
          };
        }
        
        const rotCount = entry.type === 'one' ? 1 : entry.type === 'two' ? 2 : (entry.seriesCount || 3);
        
        let rotationSpec = 'Unspecified';
        let rotationTag: 'ACRO' | 'VER' | 'DB' | 'UNK' = 'UNK';
        
        if (entry.specificationType === 'pre-acrobatic' && entry.selectedPreAcrobaticElement) {
          rotationSpec = entry.selectedPreAcrobaticElement.name;
          rotationTag = 'ACRO';
        } else if (entry.specificationType === 'vertical' && entry.selectedVerticalRotation) {
          const groupName = (entry.selectedVerticalRotation.group_name || '').charAt(0).toUpperCase() + (entry.selectedVerticalRotation.group_name || '').slice(1).toLowerCase();
          rotationSpec = `${groupName}: ${entry.selectedVerticalRotation.name}`;
          rotationTag = 'VER';
      } else if (entry.specificationType === 'db-rotation' && entry.selectedDBElement) {
          rotationSpec = entry.selectedDBElement.name || entry.selectedDBElement.description || 'Element';
          rotationTag = 'DB';
        } else if (entry.specificationType) {
          rotationSpec = 'Unspecified';
          rotationTag = 'UNK';
        }
        
        return {
          name: `${rotCount}: ${rotationSpec}`,
          symbol: entry.type === 'series' ? '' : (entry.type === 'one' ? symbols["extraRotation"] : symbols["baseRotations"]) || '',
          value: entry.type === 'one' ? 0.1 : entry.type === 'two' ? 0.2 : ((entry.seriesCount || 3) * 0.1 + 0.2),
          rotationTag,
          rotationCount: rotCount,
          rotationSpec,
        };
      }),
      // Catch component: either specific catch or catch during DB
      ...(effectiveCatch ? [{
        name: effectiveCatch.name,
        symbol: effectiveCatch.symbol_image || '',
        value: effectiveCatch.value ?? 0,
        ...(effectiveCatch.code === 'Catch8' ? {
          rotationTag: catchRotationSpec?.type === 'pre-acrobatic' ? 'ACRO' as const :
                       catchRotationSpec?.type === 'vertical' ? 'VER' as const : 'UNK' as const
        } : {})
      }] : []),
      // Catch during DB component (when no standard catch selected)
      ...(catchDuringDB ? [{
        name: `Catch during ${catchDBInfo_save?.type === 'pre-acrobatic' ? 'Pre-acrobatic' : catchDBInfo_save?.type === 'vertical' ? 'Vertical Rotation' : 'DB'}: ${catchDBInfo_save?.name || 'Element'}`,
        symbol: catchDBInfo_save?.symbol_image || '',
        value: (catchDBInfo_save?.value ?? 0) + 0.1,
        rotationTag: catchDBInfo_save?.type === 'pre-acrobatic' ? 'ACRO' as const :
                     catchDBInfo_save?.type === 'vertical' ? 'VER' as const : 'DB' as const
      }] : []),
      ...catchCriteria.map(c => ({
        name: c.name,
        symbol: c.symbol || '',
        value: c.value
      }))],
      // Store full structured metadata for edit restoration
      editMetadata: {
        rotationEntries: effectiveRotationEntries.map(entry => ({
          ...entry,
          selectedDBElement: entry.selectedDBElement ? { ...entry.selectedDBElement } : undefined,
          selectedVerticalRotation: entry.selectedVerticalRotation ? { ...entry.selectedVerticalRotation } : undefined,
          selectedPreAcrobaticElement: entry.selectedPreAcrobaticElement ? { ...entry.selectedPreAcrobaticElement } : undefined,
        })),
        throwRotationSpec: throwRotationSpec ? { ...throwRotationSpec } : null,
        catchRotationSpec: catchRotationSpec ? { ...catchRotationSpec } : null,
        throwDuringDB: throwDuringDB ? JSON.parse(JSON.stringify(throwDuringDB)) : null,
        catchDuringDB: catchDuringDB ? JSON.parse(JSON.stringify(catchDuringDB)) : null,
        extraThrow: extraThrow ? { ...extraThrow } : null,
        thr2HasThr6,
        selectedThrowCode: effectiveThrow?.code,
        selectedCatchCode: effectiveCatch?.code,
      },
    };
    setSavedRiskData(riskData);
    
    // Check if Dive Leap is in Rotations section but not as the first rotation overall
    const diveLeapInRotations = rotationEntries.some(e => 
      e.specificationType === 'pre-acrobatic' && 
      e.selectedPreAcrobaticElement?.name?.toLowerCase() === 'dive leap'
    );
    
    if (diveLeapInRotations) {
      const throwHasRotation = selectedThrow?.code === 'Thr6' || (selectedThrow?.code === 'Thr2' && thr2HasThr6) || 
        (throwDuringDB && (
          ('db' in throwDuringDB && throwDuringDB.dbType === 'rotations') ||
          'preAcrobaticElement' in throwDuringDB ||
          'verticalRotation' in throwDuringDB
        ));
      
      if (throwHasRotation) {
        setShowDiveLeapWarning(true);
        return;
      }
    }
    
    // Axis/Level Change pre-checker
    const axisCheckResult = checkAxisLevelChangeCriterion();
    if (axisCheckResult === 'warning') {
      setShowAxisWarningDialog(true);
      return;
    }
    
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
                      if (!selectedThrow && !throwDuringDB) {
                        toast({
                          title: "Selection required",
                          description: "Please select a throw type before adding extra criteria.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setShowThrowCriteriaDropdown(!showThrowCriteriaDropdown);
                    }} 
                    className={`text-primary hover:bg-primary/10 ${!selectedThrow && !throwDuringDB ? 'opacity-50' : ''}`}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                  
                  {showThrowCriteriaDropdown && (selectedThrow || throwDuringDB) && (
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
                        className={`flex items-center gap-3 p-3 border-b border-border ${hasDiveLeapInRotation ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'}`}
                        onClick={() => {
                          if (hasDiveLeapInRotation) return;
                          setShowThrowDropdown(false);
                          setShowDBDuringThrowDialog(true);
                        }}
                      >
                        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                          {dynamicThrows.find(t => t.code === 'Thr1')?.symbol_image ? (
                            <img 
                              src={dynamicThrows.find(t => t.code === 'Thr1')!.symbol_image!} 
                              alt="Throw" 
                              className="h-8 w-8 object-contain" 
                              onError={e => e.currentTarget.style.display = 'none'} 
                            />
                          ) : (
                            <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">T</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground text-sm">Throw during DB <span className="text-foreground">(0.1 is added for extra rotation)</span></span>
                          <p className="text-xs text-muted-foreground">
                            {hasDiveLeapInRotation ? 'Not available when Dive Leap is in rotations' : 'Select a DB element performed during throw'}
                          </p>
                        </div>
                        <div className="w-12 text-right flex-shrink-0 flex items-center justify-end gap-1">
                          {hasDiveLeapInRotation ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs bg-muted-foreground text-white">
                                  <p>A dive leap can only count as a rotation if it is performed as the first rotation. Throw during DB would precede the dive leap, making it invalid.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      {filteredThrows.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No throws available for this apparatus
                        </div>
                      ) : filteredThrows.map(throwItem => {
                        const symbolUrl = throwItem.symbol_image || supabase.storage.from('dynamic-element-symbols').getPublicUrl(`dynamic_throws/${throwItem.code}.png`).data.publicUrl;
                        const isRotationThrow = throwItem.code === 'Thr6';
                        const isDisabled = isRotationThrow && hasDiveLeapInRotation;
                        return (
                          <div 
                            key={throwItem.id} 
                            className={`flex items-center gap-3 p-3 border-b border-border last:border-b-0 ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'}`}
                            onClick={() => !isDisabled && handleSelectThrow(throwItem)}
                          >
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                              <img src={symbolUrl} alt={throwItem.name} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-foreground text-sm">
                                <NotesWithSymbols notes={throwItem.name} symbolMap={notesSymbolMap} />
                              </span>
                              {isDisabled && (
                                <p className="text-xs text-muted-foreground">Not available when Dive Leap is in rotations</p>
                              )}
                            </div>
                            <div className="w-12 text-right flex-shrink-0 flex items-center justify-end">
                              {isDisabled ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertCircle className="h-4 w-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-muted-foreground text-white">
                                      <p>A dive leap can only count as a rotation if it is performed as the first rotation. Throw during rotation would precede the dive leap, making it invalid.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-primary font-semibold">{throwItem.value ?? 0}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : throwDuringDB ? (
                /* Throw during DB - Stacked symbols display */
                (() => {
                  const throwInfo = getThrowCatchDBInfo(throwDuringDB);
                  const isDBType = 'db' in throwDuringDB;
                  const isPreAcrobatic = 'preAcrobaticElement' in throwDuringDB;
                  const isVertical = 'verticalRotation' in throwDuringDB;
                  
                  return (
                    <>
                      <div className="flex items-center border-b border-border">
                        <div className="w-8 flex justify-center py-4 cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="w-16 flex justify-center py-4">
                          {/* Stacked symbols: Standard throw on top, DB/rotation below */}
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
                            {/* DB/Rotation symbol below */}
                            {isDBType && throwDuringDB.db.symbol_image ? (
                              <img 
                                src={throwDuringDB.db.symbol_image.startsWith('http') 
                                  ? throwDuringDB.db.symbol_image 
                                  : supabase.storage.from('jump-symbols').getPublicUrl(throwDuringDB.db.symbol_image).data.publicUrl
                                } 
                                alt={throwDuringDB.db.name || 'Element'} 
                                className="h-8 w-8 object-contain -mt-1" 
                                onError={e => e.currentTarget.style.display = 'none'} 
                              />
                            ) : isPreAcrobatic ? (
                              <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center text-xs text-primary font-medium -mt-1">
                                PA
                              </div>
                            ) : isVertical ? (
                              <img 
                                src={multipleVerticalRotationsSymbol} 
                                alt="Vertical Rotation" 
                                className="h-8 w-8 object-contain -mt-1" 
                                style={{ mixBlendMode: 'multiply' }}
                              />
                            ) : (
                              <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground -mt-1">
                                {throwInfo?.code || '—'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-sm">
                              {isPreAcrobatic ? 'Throw during Pre-acrobatic' : isVertical ? 'Throw during Vertical Rotation' : 'Throw during DB'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                              onClick={() => setShowDBDuringThrowDialog(true)}
                            >
                              <span className="text-xs">Change</span>
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {throwInfo?.name || '—'}
                          </p>
                        </div>
                        <div className="w-20 py-4 px-2 text-center border-l border-border relative">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors">
                                <p className="font-semibold text-primary">{((throwInfo?.value || 0) + 0.1).toFixed(1)}</p>
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="left" className="w-auto p-3">
                              <div className="text-sm space-y-2">
                                <p className="font-medium text-foreground mb-2">Value Breakdown</p>
                                {isDBType && throwDuringDB.dbType === 'rotations' && throwDuringDB.rotationCount && throwDuringDB.rotationCount > 1 && (
                                  <div className="flex justify-between gap-6">
                                    <span className="text-muted-foreground">Rotations in DB:</span>
                                    <span className="font-medium">{throwDuringDB.rotationCount}</span>
                                  </div>
                                )}
                                <div className="flex justify-between gap-6">
                                  <span className="text-muted-foreground">DB Value:</span>
                                  <span className="font-medium">{(throwInfo?.value || 0).toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-muted-foreground">Extra rotation:</span>
                                  <span className="font-medium text-green-600">+0.1</span>
                                </div>
                                <div className="border-t border-border pt-2 flex justify-between gap-6">
                                  <span className="font-medium">Total:</span>
                                  <span className="font-bold text-primary">{((throwInfo?.value || 0) + 0.1).toFixed(1)}</span>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setThrowDuringDB(null);
                              setThrowCriteria([]);
                            }} 
                            className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {/* Extra Throw Criteria for Throw during DB */}
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleThrowCriteriaDragEnd}>
                        <SortableContext items={throwCriteria.map(c => c.id)} strategy={verticalListSortingStrategy}>
                          {throwCriteria.map(item => (
                            <SortableCriteriaRow 
                              key={item.id} 
                              item={item} 
                              onRemove={(id) => setThrowCriteria(throwCriteria.filter(t => t.id !== id))}
                              notesSymbolMap={notesSymbolMap}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </>
                  );
                })()
              ) : (
                <>
                  {/* Selected Throw Row */}
                  <div className="flex items-center border-b border-border">
                    <div className="w-8 flex justify-center py-4 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
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
                      
                      {/* Thr2 → Thr6: Add button below text when Thr2 selected */}
                      {selectedThrow?.code === 'Thr2' && !thr2HasThr6 && (
                        <div className="mt-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 border border-dashed border-primary/30"
                            onClick={() => setThr2HasThr6(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add throw during rotation
                          </Button>
                        </div>
                      )}
                      
                      {/* Thr2 + Thr6 combo label with remove */}
                      {selectedThrow?.code === 'Thr2' && thr2HasThr6 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground italic">+ Throw during rotation</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setThr2HasThr6(false);
                              setThrowRotationSpec(null);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Rotation Type Specification for Thr6 or Thr2+Thr6 combo */}
                      {(selectedThrow?.code === 'Thr6' || thr2HasThr6) && (
                        <div className="relative" ref={throwRotationSpecRef}>
                          {throwRotationSpec ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-muted-foreground italic">
                                {throwRotationSpec.type === 'vertical' 
                                  ? `Vertical ${(throwRotationSpec.verticalRotation?.group_name || '').charAt(0).toUpperCase() + (throwRotationSpec.verticalRotation?.group_name || '').slice(1).toLowerCase()} Rotation: ${throwRotationSpec.verticalRotation?.name}`
                                  : `Pre-acrobatic: ${throwRotationSpec.preAcrobaticElement?.name}`
                                }
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                                onClick={() => setShowThrowRotationSpecDropdown(true)}
                              >
                                Change Rotation
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10 border border-dashed border-primary/30"
                              onClick={() => setShowThrowRotationSpecDropdown(true)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Specify Rotation Type
                            </Button>
                          )}
                          
                          {/* Backdrop for closing dropdown */}
                          {showThrowRotationSpecDropdown && (
                            <div className="fixed inset-0 z-[99]" onClick={() => setShowThrowRotationSpecDropdown(false)} />
                          )}
                          
                          {/* Dropdown for rotation type selection */}
                          {showThrowRotationSpecDropdown && (
                            <div className="absolute left-0 top-full mt-1 w-80 bg-background border border-border rounded-lg shadow-xl z-[100]">
                              <div className="p-2 border-b border-border flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Select Rotation Type</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  onClick={() => setShowThrowRotationSpecDropdown(false)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="p-2 space-y-1">
                                <div 
                                  className={`p-3 rounded hover:bg-muted cursor-pointer ${throwRotationSpec?.type === 'pre-acrobatic' ? 'bg-primary/10' : ''}`}
                                  onClick={() => {
                                    setShowThrowRotationSpecDropdown(false);
                                    setShowThrowPreAcrobaticDialog(true);
                                  }}
                                >
                                  <span className="text-sm text-foreground">Pre-acrobatic Elements</span>
                                </div>
                                <div 
                                  className={`p-3 rounded hover:bg-muted cursor-pointer ${throwRotationSpec?.type === 'vertical' ? 'bg-primary/10' : ''}`}
                                  onClick={() => {
                                    setShowThrowRotationSpecDropdown(false);
                                    setShowThrowVerticalDialog(true);
                                  }}
                                >
                                  <span className="text-sm text-foreground">Vertical Rotations</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Thr6 → Thr2: Extra throw sub-section (hidden if Dive Leap is the rotation) */}
                      {selectedThrow?.code === 'Thr6' && !hasDiveLeapInThrow && (
                        <div className="mt-2">
                          {!extraThrow ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10 border border-dashed border-primary/30"
                              onClick={() => {
                                const thr2Item = filteredThrows.find(t => t.code === 'Thr2');
                                if (thr2Item) handleSelectExtraThrow(thr2Item);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add throw after rolling the hoop on the floor
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {extraThrow.symbol_image && (
                                <img src={extraThrow.symbol_image} alt={extraThrow.name} className="h-5 w-5 object-contain" onError={e => e.currentTarget.style.display = 'none'} />
                              )}
                              <span className="text-xs text-muted-foreground italic">
                                + <NotesWithSymbols notes={extraThrow.name} symbolMap={notesSymbolMap} />
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-destructive hover:bg-destructive/10"
                                onClick={handleRemoveExtraThrow}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="w-20 py-4 px-2 text-center border-l border-border relative">
                      {((selectedThrow?.code === 'Thr6' && extraThrow) || (selectedThrow?.code === 'Thr2' && thr2HasThr6)) ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors">
                              <p className="font-semibold text-primary">0.2</p>
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="left" className="w-auto p-3">
                            <div className="text-sm space-y-2">
                              <p className="font-medium text-foreground mb-2">Value Breakdown</p>
                              <div className="flex justify-between gap-6">
                                <span className="text-muted-foreground">{selectedThrow?.code === 'Thr6' ? 'Thr6 (rotation):' : 'Thr2:'}</span>
                                <span className="font-medium">0.1</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-muted-foreground">{selectedThrow?.code === 'Thr6' ? 'Thr2:' : 'Thr6 (rotation):'}</span>
                                <span className="font-medium">0.1</span>
                              </div>
                              <div className="border-t border-border pt-2 flex justify-between gap-6">
                                <span className="font-medium">Total:</span>
                                <span className="font-bold text-primary">0.2</span>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <p className="font-semibold text-primary">{selectedThrow?.code === 'Thr6' ? '0.1' : (selectedThrow?.value ?? 0)}</p>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedThrow(null);
                          setThrowCriteria([]);
                          setThrowRotationSpec(null);
                          setExtraThrow(null);
                          setShowExtraThrowDropdown(false);
                          setThr2HasThr6(false);
                        }} 
                        className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Extra Throw Criteria */}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleThrowCriteriaDragEnd}>
                    <SortableContext items={throwCriteria.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      {throwCriteria.map(item => (
                        <SortableCriteriaRow 
                          key={item.id} 
                          item={item} 
                          onRemove={(id) => setThrowCriteria(throwCriteria.filter(t => t.id !== id))}
                          notesSymbolMap={notesSymbolMap}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
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
                        <div className="flex items-center gap-3 p-3 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectRotationType('two')}>
                            <div className="w-8 h-8 flex items-center justify-center">
                              {symbols["baseRotations"] ? <img src={symbols["baseRotations"]} alt="Base Rotations" className="h-6 w-6 object-contain" /> : <div className="h-6 w-6 bg-muted rounded" />}
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="font-medium text-foreground">2 Rotations (including 2 base rotations)</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <span className="inline-flex">
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>Each Risk requires two base rotations. Select '2 Rotations' or 'Series.'</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <span className="text-primary font-semibold">0.2</span>
                          </div>
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
                        <div className="flex items-center gap-3 p-3 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectRotationType('multiple-vertical')}>
                            <div className="w-8 h-8 flex items-center justify-center">
                              <img src={multipleVerticalRotationsSymbol} alt="Multiple Vertical Rotations" className="h-6 w-auto max-w-[36px] object-contain" style={{ mixBlendMode: 'multiply' }} />
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="font-medium text-foreground">Multiple Vertical Rotations (3+ identical vertical rotations)</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <span className="inline-flex">
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>Select 3 or more identical vertical rotations performed under the flight. Each rotation adds 0.1 to the value. Vertical rotations cannot be performed in a series.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <span className="text-primary font-semibold">0.3</span>
                          </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Show existing rotation entries with drag and drop - below the button */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRotationDragEnd}>
                  <SortableContext items={rotationEntries.map(e => e.id)} strategy={verticalListSortingStrategy}>
{rotationEntries.map((entry, index) => (
                      <SortableRotationRow 
                        key={entry.id}
                        entry={entry}
                        symbols={symbols}
                        onRemove={handleRemoveRotation}
                        onUpdateSeriesCount={handleUpdateSeriesCount}
                        onUpdateSpecificationType={handleUpdateSpecificationType}
                        onUpdateDBSubType={handleUpdateDBSubType}
                        onSelectDBElement={handleSelectDBElement}
                        onSelectVerticalRotation={handleSelectVerticalRotation}
                        onSelectPreAcrobaticElement={handleSelectPreAcrobaticElement}
                        jumpsDBs={jumpsDBs}
                        rotationsDBs={rotationsDBs}
                        verticalRotations={verticalRotations}
                        preAcrobaticElements={
                          // Exclude Dive Leap if already selected in Throw section OR already in another rotation entry
                          // OR if a rotation-based throw exists (Thr6 or throw during DB)
                          (() => {
                            let filtered = preAcrobaticElements;
                            // Exclude if dive leap is in throw
                            if (hasDiveLeapInThrow) {
                              filtered = filtered.filter(e => e.name?.toLowerCase() !== 'dive leap');
                            }
                            // Exclude if a rotation-based throw exists (Thr6 or throw during DB)
                            const throwHasRotation = selectedThrow?.code === 'Thr6' || 
                              (throwDuringDB && (
                                ('db' in throwDuringDB && throwDuringDB.dbType === 'rotations') ||
                                'preAcrobaticElement' in throwDuringDB ||
                                'verticalRotation' in throwDuringDB
                              ));
                            if (throwHasRotation) {
                              filtered = filtered.filter(e => e.name?.toLowerCase() !== 'dive leap');
                            }
                            // Exclude if dive leap is already in a different rotation entry
                            const otherHasDiveLeap = rotationEntries.some(re => 
                              re.id !== entry.id && 
                              re.specificationType === 'pre-acrobatic' && 
                              re.selectedPreAcrobaticElement?.name?.toLowerCase() === 'dive leap'
                            );
                            if (otherHasDiveLeap) {
                              filtered = filtered.filter(e => e.name?.toLowerCase() !== 'dive leap');
                            }
                            return filtered;
                          })()
                        }
                        isFirstRotation={index === 0}
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
                      if (!selectedCatch && !catchDuringDB) {
                        toast({
                          title: "Selection required",
                          description: "Please select a catch type before adding extra criteria.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setShowCatchCriteriaDropdown(!showCatchCriteriaDropdown);
                    }} 
                    className={`text-primary hover:bg-primary/10 ${!selectedCatch && !catchDuringDB ? 'opacity-50' : ''}`}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                  
                  {showCatchCriteriaDropdown && (selectedCatch || catchDuringDB) && (
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
                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b border-border" 
                        onClick={() => {
                          setShowCatchDropdown(false);
                          setShowDBDuringCatchDialog(true);
                        }}
                      >
                        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                          {dynamicCatches.find(c => c.code === 'Catch1')?.symbol_image ? (
                            <img 
                              src={dynamicCatches.find(c => c.code === 'Catch1')!.symbol_image!} 
                              alt="Catch" 
                              className="h-8 w-8 object-contain" 
                              onError={e => e.currentTarget.style.display = 'none'} 
                            />
                          ) : (
                            <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">C</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-foreground text-sm">Catch during DB <span className="text-foreground">(0.1 is added for extra rotation)</span></span>
                          <p className="text-xs text-muted-foreground">Select a DB element performed during catch</p>
                        </div>
                        <div className="w-12 text-right flex-shrink-0 flex items-center justify-end gap-1">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                              <img src={symbolUrl} alt={catchItem.name} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} />
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
                (() => {
                  const catchInfo = getThrowCatchDBInfo(catchDuringDB);
                  const isDBType = 'db' in catchDuringDB;
                  const isPreAcrobatic = 'preAcrobaticElement' in catchDuringDB;
                  const isVertical = 'verticalRotation' in catchDuringDB;
                  
                  return (
                    <>
                      <div className="flex items-center border-b border-border">
                        <div className="w-8 flex justify-center py-4 cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="w-16 flex justify-center py-4">
                          {/* Stacked symbols: Standard catch on top, DB/rotation below */}
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
                            {/* DB/Rotation symbol below */}
                            {isDBType && catchDuringDB.db.symbol_image ? (
                              <img 
                                src={catchDuringDB.db.symbol_image.startsWith('http') 
                                  ? catchDuringDB.db.symbol_image 
                                  : supabase.storage.from('jump-symbols').getPublicUrl(catchDuringDB.db.symbol_image).data.publicUrl
                                } 
                                alt={catchDuringDB.db.name || 'Element'} 
                                className="h-8 w-8 object-contain -mt-1" 
                                onError={e => e.currentTarget.style.display = 'none'} 
                              />
                            ) : isPreAcrobatic ? (
                              <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center text-xs text-primary font-medium -mt-1">
                                PA
                              </div>
                            ) : isVertical ? (
                              <img 
                                src={multipleVerticalRotationsSymbol} 
                                alt="Vertical Rotation" 
                                className="h-8 w-8 object-contain -mt-1" 
                                style={{ mixBlendMode: 'multiply' }}
                              />
                            ) : (
                              <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground -mt-1">
                                {catchInfo?.code || '—'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-sm">
                              {isPreAcrobatic ? 'Catch during Pre-acrobatic' : isVertical ? 'Catch during Vertical Rotation' : 'Catch during DB'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                              onClick={() => setShowDBDuringCatchDialog(true)}
                            >
                              <span className="text-xs">Change</span>
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {catchInfo?.name || '—'}
                          </p>
                        </div>
                        <div className="w-20 py-4 px-2 text-center border-l border-border relative">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors">
                                <p className="font-semibold text-primary">{((catchInfo?.value || 0) + 0.1).toFixed(1)}</p>
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="left" className="w-auto p-3">
                              <div className="text-sm space-y-2">
                                <p className="font-medium text-foreground mb-2">Value Breakdown</p>
                                {isDBType && catchDuringDB.dbType === 'rotations' && catchDuringDB.rotationCount && catchDuringDB.rotationCount > 1 && (
                                  <div className="flex justify-between gap-6">
                                    <span className="text-muted-foreground">Rotations in DB:</span>
                                    <span className="font-medium">{catchDuringDB.rotationCount}</span>
                                  </div>
                                )}
                                <div className="flex justify-between gap-6">
                                  <span className="text-muted-foreground">DB Value:</span>
                                  <span className="font-medium">{(catchInfo?.value || 0).toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-muted-foreground">Extra rotation:</span>
                                  <span className="font-medium text-green-600">+0.1</span>
                                </div>
                                <div className="border-t border-border pt-2 flex justify-between gap-6">
                                  <span className="font-medium">Total:</span>
                                  <span className="font-bold text-primary">{((catchInfo?.value || 0) + 0.1).toFixed(1)}</span>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setCatchDuringDB(null);
                              setCatchCriteria([]);
                            }} 
                            className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {/* Extra Catch Criteria for Catch during DB */}
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatchCriteriaDragEnd}>
                        <SortableContext items={catchCriteria.map(c => c.id)} strategy={verticalListSortingStrategy}>
                          {catchCriteria.map(item => (
                            <SortableCriteriaRow 
                              key={item.id} 
                              item={item} 
                              onRemove={(id) => setCatchCriteria(catchCriteria.filter(c => c.id !== id))}
                              notesSymbolMap={notesSymbolMap}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </>
                  );
                })()
              ) : (
                <>
                  {/* Selected Catch Row */}
                  <div className="flex items-center border-b border-border">
                    <div className="w-8 flex justify-center py-4 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
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
                    <div className="flex-1 py-4 px-4">
                      <div className="flex items-center gap-2">
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
                      
                      {/* Rotation Type Specification for Catch8 (Catch during rotation) */}
                      {selectedCatch?.code === 'Catch8' && (
                        <div className="relative" ref={catchRotationSpecRef}>
                          {catchRotationSpec ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-muted-foreground italic">
                                {catchRotationSpec.type === 'vertical' 
                                  ? `Vertical ${(catchRotationSpec.verticalRotation?.group_name || '').charAt(0).toUpperCase() + (catchRotationSpec.verticalRotation?.group_name || '').slice(1).toLowerCase()} Rotation: ${catchRotationSpec.verticalRotation?.name}`
                                  : `Pre-acrobatic: ${catchRotationSpec.preAcrobaticElement?.name}`
                                }
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                                onClick={() => setShowCatchRotationSpecDropdown(true)}
                              >
                                Change Rotation
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10 border border-dashed border-primary/30"
                              onClick={() => setShowCatchRotationSpecDropdown(true)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Specify Rotation Type
                            </Button>
                          )}
                          
                          {/* Backdrop for closing dropdown */}
                          {showCatchRotationSpecDropdown && (
                            <div className="fixed inset-0 z-[99]" onClick={() => setShowCatchRotationSpecDropdown(false)} />
                          )}
                          
                          {/* Dropdown for rotation type selection */}
                          {showCatchRotationSpecDropdown && (
                            <div className="absolute left-0 top-full mt-1 w-80 bg-background border border-border rounded-lg shadow-xl z-[100]">
                              <div className="p-2 border-b border-border flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">Select Rotation Type</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  onClick={() => setShowCatchRotationSpecDropdown(false)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="p-2 space-y-1">
                                <div 
                                  className={`p-3 rounded hover:bg-muted cursor-pointer ${catchRotationSpec?.type === 'pre-acrobatic' ? 'bg-primary/10' : ''}`}
                                  onClick={() => {
                                    setShowCatchRotationSpecDropdown(false);
                                    setShowCatchPreAcrobaticDialog(true);
                                  }}
                                >
                                  <span className="text-sm text-foreground">Pre-acrobatic Elements</span>
                                </div>
                                <div 
                                  className={`p-3 rounded hover:bg-muted cursor-pointer ${catchRotationSpec?.type === 'vertical' ? 'bg-primary/10' : ''}`}
                                  onClick={() => {
                                    setShowCatchRotationSpecDropdown(false);
                                    setShowCatchVerticalDialog(true);
                                  }}
                                >
                                  <span className="text-sm text-foreground">Vertical Rotations</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="w-20 py-4 px-2 text-center border-l border-border relative">
                      <p className="font-semibold text-primary">{selectedCatch?.code === 'Catch8' ? '0.1' : (selectedCatch?.value ?? 0)}</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setSelectedCatch(null);
                          setCatchCriteria([]);
                          setCatchRotationSpec(null);
                        }} 
                        className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Extra Catch Criteria */}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatchCriteriaDragEnd}>
                    <SortableContext items={catchCriteria.map(c => c.id)} strategy={verticalListSortingStrategy}>
                      {catchCriteria.map(item => (
                        <SortableCriteriaRow 
                          key={item.id} 
                          item={item} 
                          onRemove={(id) => setCatchCriteria(catchCriteria.filter(c => c.id !== id))}
                          notesSymbolMap={notesSymbolMap}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
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

      {/* Dive Leap Prompt Dialog - shown when selecting dive leap in throw or first rotation */}
      <Dialog open={showDiveLeapPrompt} onOpenChange={(open) => {
        if (!open) {
          setShowDiveLeapPrompt(false);
          setPendingDiveLeapContext(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <Info className="h-16 w-16 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">Dive Leap</DialogTitle>
            <DialogDescription className="text-center text-base leading-relaxed mt-2">
              You are about to add a dive leap that already includes a forward roll.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            To make the risk valid, would you like to add another roll forward?
          </p>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              className="w-full bg-primary hover:bg-primary/90" 
              onClick={handleDiveLeapPromptYes}
            >
              Yes, add
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleDiveLeapPromptNo}
            >
              No
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dive Leap Warning Dialog */}
      <Dialog open={showDiveLeapWarning} onOpenChange={setShowDiveLeapWarning}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-amber-500" />
            </div>
            <DialogTitle className="text-center text-xl">Invalid Risk</DialogTitle>
            <DialogDescription className="text-center text-base leading-relaxed mt-2">
              Since the dive leap is not the first rotation in the constructed risk, it will not be counted as a rotational element. You need to have at least two identical uninterrupted rotations performed under the throw to save a valid risk.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            A dive leap can only count as a rotation if it is performed as the first rotation — either during the throw or immediately after the throw.
          </p>
          <p className="text-sm font-medium text-center mt-2">Would you like to adjust your risk?</p>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setShowDiveLeapWarning(false)}
            >
              Yes, adjust my risk
            </Button>
            <Button 
              className="w-full bg-primary hover:bg-primary/90" 
              onClick={() => {
                // Recalculate rLevel excluding dive leap since it's not the first rotation
                if (savedRiskData) {
                  const adjustedRLevel = savedRiskData.rLevel - 1;
                  setSavedRiskData({ ...savedRiskData, rLevel: adjustedRLevel });
                }
                setShowDiveLeapWarning(false);
                // Run axis check before showing success
                const axisResult = checkAxisLevelChangeCriterion();
                if (axisResult === 'warning') {
                  setShowAxisWarningDialog(true);
                  return;
                }
                setShowSuccessDialog(true);
              }}
            >
              No, save as is
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Axis/Level Change Warning Dialog */}
      <Dialog open={showAxisWarningDialog} onOpenChange={setShowAxisWarningDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-amber-500" />
            </div>
            <DialogTitle className="text-center text-xl">Change of Axis/Level Criterion Warning</DialogTitle>
            <DialogDescription className="text-center text-base leading-relaxed mt-2">
              For the change of axis/level criterion to be valid, your rotations must be either:
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm text-muted-foreground list-disc pl-6 space-y-1">
            <li>around different axes (vertical or horizontal), or</li>
            <li>at different levels (standing, seated, or lying).</li>
          </ul>
          <p className="text-sm font-medium text-center mt-2">Do your rotations meet this requirement?</p>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              className="w-full bg-primary hover:bg-primary/90" 
              onClick={() => {
                setShowAxisWarningDialog(false);
                setShowSuccessDialog(true);
              }}
            >
              Yes, save
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => {
                setRotationEntries(prev => prev.filter(e => e.type !== 'axis'));
                // Update savedRiskData to remove axis component and its value
                if (savedRiskData) {
                  const updatedComponents = savedRiskData.components.filter(
                    (c: any) => c.name !== 'Axis/Level Change'
                  );
                  const updatedValue = savedRiskData.value - 0.1;
                  const updatedData = { 
                    ...savedRiskData, 
                    components: updatedComponents, 
                    value: updatedValue,
                    axisLevelSymbol: undefined 
                  };
                  setSavedRiskData(updatedData);
                  // Navigate directly to routine calculator
                  navigate("/routine-calculator", {
                    state: {
                      newRisk: updatedData,
                      modifyingElementId: modifyingElementId
                    }
                  });
                }
                setShowAxisWarningDialog(false);
              }}
            >
              No, remove criterion and save
            </Button>
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => setShowAxisWarningDialog(false)}
            >
              Go back and adjust
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        onSelectDB={(db, dbType, rotationCount) => {
          // The dialog already calculates the final value including rotation count
          setThrowDuringDB({ 
            db, 
            dbType, 
            rotationCount 
          });
          setSelectedThrow(null);
          setThrowCriteria([]);
        }}
      />

      {/* DB During Catch Dialog */}
      <DBDuringThrowCatchDialog
        open={showDBDuringCatchDialog}
        onOpenChange={setShowDBDuringCatchDialog}
        type="catch"
        onSelectDB={(db, dbType, rotationCount) => {
          // The dialog already calculates the final value including rotation count
          setCatchDuringDB({ 
            db, 
            dbType, 
            rotationCount 
          });
          setSelectedCatch(null);
          setCatchCriteria([]);
        }}
      />

      {/* Throw Rotation Specification Dialogs */}
      <VerticalRotationSelectionDialog
        open={showThrowVerticalDialog}
        onOpenChange={setShowThrowVerticalDialog}
        rotations={verticalRotations}
        onSelect={(rotation) => {
          setThrowRotationSpec({ type: 'vertical', verticalRotation: rotation });
          setShowThrowVerticalDialog(false);
        }}
      />
      
      <PreAcrobaticSelectionDialog
        open={showThrowPreAcrobaticDialog}
        onOpenChange={setShowThrowPreAcrobaticDialog}
        elements={(hasDiveLeapInRotation || extraThrow?.code === 'Thr2' || (selectedThrow?.code === 'Thr2' && thr2HasThr6))
          ? preAcrobaticElements.filter(e => e.name?.toLowerCase() !== 'dive leap')
          : preAcrobaticElements
        }
        onSelect={(element) => {
          // Intercept Dive Leap selection to show prompt
          if (element.name?.toLowerCase() === 'dive leap') {
            setPendingDiveLeapContext({ source: 'throw', element });
            setShowDiveLeapPrompt(true);
            setShowThrowPreAcrobaticDialog(false);
            return;
          }
          setThrowRotationSpec({ type: 'pre-acrobatic', preAcrobaticElement: element });
          setShowThrowPreAcrobaticDialog(false);
        }}
        rotationType="one"
        isFirstRotation={true}
      />

      {/* Catch Rotation Specification Dialogs */}
      <VerticalRotationSelectionDialog
        open={showCatchVerticalDialog}
        onOpenChange={setShowCatchVerticalDialog}
        rotations={verticalRotations}
        onSelect={(rotation) => {
          setCatchRotationSpec({ type: 'vertical', verticalRotation: rotation });
          setShowCatchVerticalDialog(false);
        }}
      />
      
      <PreAcrobaticSelectionDialog
        open={showCatchPreAcrobaticDialog}
        onOpenChange={setShowCatchPreAcrobaticDialog}
        elements={preAcrobaticElements.filter(e => e.name?.toLowerCase() !== 'dive leap')}
        onSelect={(element) => {
          setCatchRotationSpec({ type: 'pre-acrobatic', preAcrobaticElement: element });
          setShowCatchPreAcrobaticDialog(false);
        }}
        rotationType="one"
        isFirstRotation={true}
      />
    </div>;
};
export default CreateCustomRisk;