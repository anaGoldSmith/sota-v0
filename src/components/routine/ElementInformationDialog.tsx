import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GripVertical, Info, Minus, Plus, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ApparatusType } from "@/types/apparatus";
import { FouetteComponentsEditor, FouetteComponent } from "./FouetteComponentsEditor";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Unified handling item for drag-and-drop ordering - exported for use in parent components
export type HandlingItem = 
  | { type: 'te'; id: string; data: TechnicalElementSelection }
  | { type: 'da'; id: string; data: DaElementSelection };

interface ElementData {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees?: string | null;
  extra_value?: number | null;
  symbol_image: string | null;
}

export interface TechnicalElementSelection {
  id: string;
  code: string;
  name: string;
  description: string;
  symbol_image: string | null;
}

export interface DaElementSelection {
  id: string;
  name: string;
  symbolImages: string[];
  value: number;
  selectedCriteria: string[];
}

interface ElementInformationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: ElementData | null;
  elementType: 'jump' | 'rotation' | 'balance' | null;
  onSave: (data: {
    element: ElementData;
    elementType: 'jump' | 'rotation' | 'balance';
    rotationCount: number;
    totalValue: number;
    technicalElements?: TechnicalElementSelection[];
    daElements?: DaElementSelection[];
    handlingOrder?: Array<{ type: 'te' | 'da'; id: string }>; // Preserves drag-drop order
    withApparatusHandling: boolean;
    fouetteComponents?: FouetteComponent[];
    isSeries?: boolean; // Whether this is a series of rotations
  }) => void;
  onCancel: () => void;
  getSymbolUrl: (symbolImage: string | null, bucketName: string) => string | null;
  getTechnicalElementSymbol?: (filename: string | null, apparatus: ApparatusType) => string | null;
  apparatus: ApparatusType | null;
  onOpenApparatusDialog: () => void;
  onOpenTechnicalElementsDialog: () => void;
  // For showing selected TE/DA
  selectedTechnicalElements?: TechnicalElementSelection[];
  selectedDaElements?: DaElementSelection[];
  // Unified handling items array (preserves insertion order for drag-and-drop)
  handlingItems?: HandlingItem[];
  // For modifying existing element
  initialRotationCount?: number;
  initialIsSeries?: boolean;
  isModifying?: boolean;
  // Callbacks for removing individual TE/DA
  onRemoveTechnicalElement?: (id: string) => void;
  onRemoveDaElement?: (id: string) => void;
  // Callback for reordering unified handling items
  onReorderHandlingItems?: (items: HandlingItem[]) => void;
  // Callback for rotation count changes (to persist state when navigating to TE/DA dialogs)
  onRotationCountChange?: (count: number) => void;
  // Callback for series state changes (to persist state when navigating to TE/DA dialogs)
  onSeriesChange?: (isSeries: boolean) => void;
  // For Fouetté elements
  initialFouetteComponents?: FouetteComponent[];
  onFouetteComponentsChange?: (components: FouetteComponent[]) => void;
}

// Sortable handling item component
interface SortableHandlingItemProps {
  item: HandlingItem;
  apparatus: ApparatusType | null;
  getTechnicalElementSymbol?: (filename: string | null, apparatus: ApparatusType) => string | null;
  onRemove: () => void;
}

const SortableHandlingItem = ({ item, apparatus, getTechnicalElementSymbol, onRemove }: SortableHandlingItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (item.type === 'te') {
    const te = item.data;
    const teSymbolUrl = te.symbol_image && apparatus && getTechnicalElementSymbol
      ? getTechnicalElementSymbol(te.symbol_image, apparatus)
      : null;
    
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between p-2 bg-background border rounded-md"
      >
        <div className="flex items-center gap-2">
          <div
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing flex items-center justify-center"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded dark:text-green-300 dark:bg-green-900/30">TE</span>
          {teSymbolUrl && (
            <img src={teSymbolUrl} alt={te.name} className="h-6 w-6 object-contain" />
          )}
          <span className="text-sm">{te.name}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  } else {
    const da = item.data;
    
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="flex items-center justify-between p-2 bg-background border rounded-md"
      >
        <div className="flex items-center gap-2">
          <div
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing flex items-center justify-center"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded dark:text-orange-300 dark:bg-orange-900/30">DA</span>
          {da.symbolImages.map((url, idx) => (
            url.startsWith('TEXT:') ? (
              <span key={idx} className="text-sm font-bold">{url.replace('TEXT:', '')}</span>
            ) : (
              <img key={idx} src={url} alt={da.name} className="h-6 w-6 object-contain" />
            )
          ))}
          <span className="text-sm">{da.name}</span>
          <span className="text-xs text-muted-foreground">({da.value.toFixed(1)})</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }
};

export const ElementInformationDialog = ({
  open,
  onOpenChange,
  element,
  elementType,
  onSave,
  onCancel,
  getSymbolUrl,
  getTechnicalElementSymbol,
  apparatus,
  onOpenApparatusDialog,
  onOpenTechnicalElementsDialog,
  selectedTechnicalElements = [],
  selectedDaElements = [],
  handlingItems: handlingItemsProp,
  initialRotationCount,
  initialIsSeries = false,
  isModifying = false,
  onRemoveTechnicalElement,
  onRemoveDaElement,
  onReorderHandlingItems,
  onRotationCountChange,
  onSeriesChange,
  initialFouetteComponents,
  onFouetteComponentsChange,
}: ElementInformationDialogProps) => {
  const [rotationCount, setRotationCount] = useState<number>(1);
  const [isSeries, setIsSeries] = useState<boolean>(false);
  
  // Fouetté components state (for 3.1601 and 3.1602)
  const [fouetteComponents, setFouetteComponents] = useState<FouetteComponent[]>([
    { id: crypto.randomUUID(), rotations: 1 }
  ]);
  
  // Drag and drop sensors for handling items
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Use the provided handlingItems prop if available (preserves insertion order), 
  // otherwise fall back to constructing from separate TE/DA arrays
  const handlingItems: HandlingItem[] = useMemo(() => {
    if (handlingItemsProp && handlingItemsProp.length > 0) {
      return handlingItemsProp;
    }
    // Fallback: construct from separate arrays (TEs first, then DAs)
    const teItems: HandlingItem[] = selectedTechnicalElements.map(te => ({
      type: 'te' as const,
      id: `te-${te.id}`,
      data: te,
    }));
    const daItems: HandlingItem[] = selectedDaElements.map(da => ({
      type: 'da' as const,
      id: `da-${da.id}`,
      data: da,
    }));
    return [...teItems, ...daItems];
  }, [handlingItemsProp, selectedTechnicalElements, selectedDaElements]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = handlingItems.findIndex(item => item.id === active.id);
    const newIndex = handlingItems.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedItems = arrayMove(handlingItems, oldIndex, newIndex);
    
    // Call the unified reorder callback if available
    if (onReorderHandlingItems) {
      onReorderHandlingItems(reorderedItems);
    }
  };

  // Wrap setRotationCount to also notify parent
  const updateRotationCount = (count: number) => {
    setRotationCount(count);
    onRotationCountChange?.(count);
  };
  
  // Wrap Fouetté components update to notify parent
  const updateFouetteComponents = (components: FouetteComponent[]) => {
    setFouetteComponents(components);
    onFouetteComponentsChange?.(components);
  };
  
  // Wrap setIsSeries to also notify parent (persist state when navigating to TE/DA dialogs)
  const updateIsSeries = (value: boolean) => {
    setIsSeries(value);
    onSeriesChange?.(value);
  };
  
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  // Determine if this is a rotation with 180-degree base
  const is180Degrees = useMemo(() => {
    if (!element?.turn_degrees || elementType !== 'rotation') return false;
    return element.turn_degrees === "180" || element.turn_degrees.includes("180");
  }, [element, elementType]);

  // Check if this is a fixed rotation (codes 3.2101 or 3.2202)
  const isFixedRotation = useMemo(() => {
    if (!element?.code || elementType !== 'rotation') return false;
    return element.code === "3.2101" || element.code === "3.2202";
  }, [element, elementType]);

  // Check if this is a per-rotation element (code 3.1704) - each rotation counts at full value and needs its own TE/DA
  const isPerRotationElement = useMemo(() => {
    if (!element?.code || elementType !== 'rotation') return false;
    return element.code === "3.1704";
  }, [element, elementType]);
  
  // Check if this is a Fouetté element (codes 3.1601 or 3.1602) - component-based rotation counting
  const isFouetteElement = useMemo(() => {
    if (!element?.code || elementType !== 'rotation') return false;
    return element.code === "3.1601" || element.code === "3.1602";
  }, [element, elementType]);

  // Check if this rotation cannot be done in series
  // Codes: 3.1601, 3.1602 (Fouetté), 3.1801, 3.1902, 3.2003, 3.2101, 3.2202 (fixed)
  const cannotBeSeries = useMemo(() => {
    if (!element?.code || elementType !== 'rotation') return false;
    const nonSeriesCodes = ["3.1601", "3.1602", "3.1801", "3.1902", "3.2003", "3.2101", "3.2202"];
    return nonSeriesCodes.includes(element.code);
  }, [element, elementType]);

  // Check if rotation count is applicable (only for rotations)
  const showRotationCount = elementType === 'rotation';

  // Set default rotation count and series state when element changes
  useEffect(() => {
    if (element && elementType === 'rotation') {
      // Reset series state
      setIsSeries(initialIsSeries);
      
      // For Fouetté elements, use component-based counting
      if (isFouetteElement) {
        if (initialFouetteComponents && initialFouetteComponents.length > 0) {
          setFouetteComponents(initialFouetteComponents);
        } else {
          setFouetteComponents([{ id: crypto.randomUUID(), rotations: 1 }]);
        }
        // Calculate total rotations from components for rotationCount state
        const totalRotations = initialFouetteComponents 
          ? initialFouetteComponents.reduce((sum, c) => sum + c.rotations, 0)
          : 1;
        setRotationCount(totalRotations);
      } else if (initialRotationCount !== undefined) {
        setRotationCount(initialRotationCount);
      } else if (isFixedRotation) {
        setRotationCount(1);
      } else {
        setRotationCount(is180Degrees ? 0.5 : 1);
      }
    } else {
      setRotationCount(1);
      setIsSeries(false);
    }
  }, [element, elementType, is180Degrees, isFixedRotation, isFouetteElement, initialRotationCount, initialFouetteComponents, initialIsSeries]);

  const minValue = is180Degrees ? 0.5 : 1;

  // Calculate total value based on element type
  const totalValue = useMemo(() => {
    if (!element) return 0;
    const baseValue = element.value;
    
    if (elementType !== 'rotation') {
      return baseValue;
    }
    
    const extraValue = element.extra_value || 0;
    
    if (isFixedRotation) {
      return baseValue;
    }

    // For 3.1704: each rotation counts at full value (no extra_value, just multiply)
    if (isPerRotationElement) {
      return baseValue * rotationCount;
    }
    
    // For Fouetté elements (3.1601, 3.1602): each rotation = 0.1 value
    if (isFouetteElement) {
      const totalRotations = fouetteComponents.reduce((sum, c) => sum + c.rotations, 0);
      return totalRotations * 0.1;
    }
    
    // For series: each rotation counts at base value (no extra_value progression)
    if (isSeries) {
      return baseValue * Math.floor(rotationCount);
    }
    
    // Default: base value + extra_value for additional rotations
    if (is180Degrees) {
      const additionalHalfRotations = (rotationCount - 0.5) / 0.5;
      return baseValue + (additionalHalfRotations * extraValue);
    } else {
      const additionalFullRotations = Math.floor(rotationCount) - 1;
      return baseValue + (Math.max(0, additionalFullRotations) * extraValue);
    }
  }, [element, elementType, rotationCount, is180Degrees, isFixedRotation, isPerRotationElement, isFouetteElement, fouetteComponents, isSeries]);

  const handleIncrement = () => {
    if (isFixedRotation || elementType !== 'rotation') return;
    const step = is180Degrees ? 0.5 : 1;
    updateRotationCount(rotationCount + step);
  };

  const handleDecrement = () => {
    if (isFixedRotation || elementType !== 'rotation') return;
    if (rotationCount <= minValue) return;
    const step = is180Degrees ? 0.5 : 1;
    updateRotationCount(rotationCount - step);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFixedRotation || elementType !== 'rotation') return;
    
    const value = parseFloat(e.target.value);
    if (isNaN(value)) return;
    
    if (value < minValue) {
      updateRotationCount(minValue);
      return;
    }
    
    if (is180Degrees) {
      const roundedValue = Math.round(value * 2) / 2;
      updateRotationCount(Math.max(minValue, roundedValue));
    } else {
      const roundedValue = Math.round(value);
      updateRotationCount(Math.max(minValue, roundedValue));
    }
  };

  const hasApparatusHandling = selectedTechnicalElements.length > 0 || selectedDaElements.length > 0;
  
  // For 3.1704 or series: each rotation needs its own TE or DA
  // Series requires at least 2 rotations with handling for each
  const seriesRotationCount = isSeries ? Math.max(2, Math.floor(rotationCount)) : 0;
  const requiredHandlingCount = isPerRotationElement 
    ? rotationCount 
    : isSeries 
      ? seriesRotationCount 
      : 1;
  const currentHandlingCount = selectedTechnicalElements.length + selectedDaElements.length;
  const hasEnoughHandling = currentHandlingCount >= requiredHandlingCount;

  const handleSave = () => {
    // For 3.1704: must have at least one TE/DA per rotation, no skipping allowed
    if (isPerRotationElement && !hasEnoughHandling) {
      setShowWarningDialog(true);
      return;
    }
    
    // For series: must have handling for each rotation in the series
    if (isSeries && !hasEnoughHandling) {
      setShowWarningDialog(true);
      return;
    }
    
    // For Fouetté elements: warn if no handling, but allow saving
    if (isFouetteElement && !hasApparatusHandling) {
      setShowWarningDialog(true);
      return;
    }
    
    if (!hasApparatusHandling && !isFouetteElement && !isSeries) {
      // Show warning that element needs apparatus handling
      setShowWarningDialog(true);
      return;
    }
    
    if (element && elementType) {
      // Calculate final rotationCount for Fouetté elements
      const finalRotationCount = isFouetteElement 
        ? fouetteComponents.reduce((sum, c) => sum + c.rotations, 0)
        : rotationCount;
      
      onSave({
        element,
        elementType,
        rotationCount: finalRotationCount,
        totalValue,
        technicalElements: selectedTechnicalElements.length > 0 ? selectedTechnicalElements : undefined,
        daElements: selectedDaElements.length > 0 ? selectedDaElements : undefined,
        handlingOrder: handlingItems.length > 0 ? handlingItems.map(item => ({ type: item.type, id: item.type === 'te' ? item.data.id : item.data.id })) : undefined,
        withApparatusHandling: hasApparatusHandling,
        fouetteComponents: isFouetteElement ? fouetteComponents : undefined,
        isSeries: isSeries,
      });
      onOpenChange(false);
    }
  };

  const handleWarningYes = () => {
    setShowWarningDialog(false);
    // Stay in dialog so user can add apparatus handling
  };

  const handleWarningNo = () => {
    // Save without apparatus handling
    if (element && elementType) {
      // Calculate final rotationCount for Fouetté elements
      const finalRotationCount = isFouetteElement 
        ? fouetteComponents.reduce((sum, c) => sum + c.rotations, 0)
        : rotationCount;
      
      onSave({
        element,
        elementType,
        rotationCount: finalRotationCount,
        totalValue,
        technicalElements: selectedTechnicalElements.length > 0 ? selectedTechnicalElements : undefined,
        daElements: selectedDaElements.length > 0 ? selectedDaElements : undefined,
        handlingOrder: handlingItems.length > 0 ? handlingItems.map(item => ({ type: item.type, id: item.data.id })) : undefined,
        withApparatusHandling: hasApparatusHandling,
        fouetteComponents: isFouetteElement ? fouetteComponents : undefined,
        isSeries: isSeries,
      });
      setShowWarningDialog(false);
      onOpenChange(false);
    }
  };

  // For 3.1704 or series: No = save with missing handling anyway
  const handleWarningNoSeriesOr3_1704 = () => {
    if (element && elementType) {
      onSave({
        element,
        elementType,
        rotationCount,
        totalValue,
        technicalElements: selectedTechnicalElements.length > 0 ? selectedTechnicalElements : undefined,
        daElements: selectedDaElements.length > 0 ? selectedDaElements : undefined,
        handlingOrder: handlingItems.length > 0 ? handlingItems.map(item => ({ type: item.type, id: item.data.id })) : undefined,
        withApparatusHandling: hasApparatusHandling,
        isSeries: isSeries,
      });
      setShowWarningDialog(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleApparatusDifficultyClick = () => {
    // Close this dialog first, then open apparatus dialog
    onOpenChange(false);
    setTimeout(() => onOpenApparatusDialog(), 100);
  };

  const handleTechnicalElementsClick = () => {
    // Close this dialog first, then open technical elements dialog
    onOpenChange(false);
    setTimeout(() => onOpenTechnicalElementsDialog(), 100);
  };

  if (!element) return null;

  const symbolUrl = getSymbolUrl(element.symbol_image, 'jump-symbols');

  // Get element type label
  const getElementTypeLabel = () => {
    switch (elementType) {
      case 'jump': return 'Jump';
      case 'rotation': return 'Rotation';
      case 'balance': return 'Balance';
      default: return 'Element';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md z-[60] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Element Information</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[60vh] overflow-auto">
            <div className="space-y-4 py-4 pr-4">
            {/* ==================== ELEMENT SECTION ==================== */}
            <div className="p-4 bg-muted/30 rounded-lg border">
              {/* Header row with symbol, name/description, and value */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 flex-shrink-0 flex items-center justify-center bg-background rounded-lg border">
                  {symbolUrl ? (
                    <img
                      src={symbolUrl}
                      alt={element.name || element.description}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      Symbol
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">{getElementTypeLabel()}</p>
                  <p className="font-medium text-foreground text-sm">
                    {element.name || element.description}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">Value</p>
                  <p className="text-lg font-bold text-primary">{totalValue.toFixed(1)}</p>
                </div>
              </div>

              {/* Rotation Count Input (only for rotations) */}
              {showRotationCount && !isFouetteElement && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <Label htmlFor="rotation-count" className="text-sm">Number of Rotations</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDecrement}
                      disabled={isFixedRotation || rotationCount <= minValue}
                      className="h-8 w-8"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    
                    <Input
                      id="rotation-count"
                      type="number"
                      step={is180Degrees ? 0.5 : 1}
                      min={minValue}
                      value={rotationCount}
                      onChange={handleInputChange}
                      disabled={isFixedRotation}
                      className="text-center text-sm font-semibold h-8 w-14"
                    />
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleIncrement}
                      disabled={isFixedRotation}
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    
                    {!isFixedRotation && (
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {is180Degrees ? "Min: 0.5" : "Min: 1"}
                      </div>
                    )}
                    
                    {/* Series button - toggles series mode (hidden for rotations that cannot be series) */}
                    {!cannotBeSeries && (
                      <Button
                        variant={isSeries ? "default" : "outline"}
                        size="sm"
                        className={`ml-auto h-8 px-3 ${isSeries ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => {
                          const newSeriesState = !isSeries;
                          updateIsSeries(newSeriesState);
                          // If activating series and rotation count < 2, set to 2
                          if (newSeriesState && rotationCount < 2) {
                            updateRotationCount(2);
                          }
                        }}
                      >
                        Series
                      </Button>
                    )}
                    {!cannotBeSeries && (
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="left" 
                            align="center"
                            className="max-w-[250px] text-sm z-[200]"
                            sideOffset={8}
                          >
                            <p>A series refers to two or more identical pivots or illusions performed consecutively with heel support. Each counts as a separate Difficulty. Each rotation should have a valid apparatus handling.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  
                  {/* Series handling requirement notice */}
                  {isSeries && !isPerRotationElement && (
                    <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded text-xs text-purple-700 dark:text-purple-300">
                      <div className="flex justify-between items-center">
                        <span><span className="font-medium">Series active:</span> {Math.floor(rotationCount)} × {element.value.toFixed(1)} = {totalValue.toFixed(1)}</span>
                        <span className="text-purple-600 dark:text-purple-400">({currentHandlingCount}/{seriesRotationCount} handling)</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Value breakdown for rotations (non-series) */}
                  {!isFixedRotation && !isPerRotationElement && !isSeries && element.extra_value && rotationCount > minValue && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Base: {element.value.toFixed(1)} + Extra: {is180Degrees
                        ? (((rotationCount - 0.5) / 0.5) * element.extra_value).toFixed(1)
                        : ((Math.floor(rotationCount) - 1) * element.extra_value).toFixed(1)
                      }
                    </div>
                  )}
                  
                  {/* Value breakdown for per-rotation element (3.1704) */}
                  {isPerRotationElement && rotationCount > 1 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {rotationCount} × {element.value.toFixed(1)} = {totalValue.toFixed(1)}
                    </div>
                  )}
                  
                  {/* Per-rotation handling requirement notice */}
                  {isPerRotationElement && (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
                      Each rotation requires its own TE or DA ({currentHandlingCount}/{requiredHandlingCount} added)
                    </div>
                  )}
                </div>
              )}
              
              {/* Fouetté Component Editor (only for 3.1601 and 3.1602) */}
              {showRotationCount && isFouetteElement && (
                <div className="mt-4 pt-4 border-t">
                  <FouetteComponentsEditor
                    components={fouetteComponents}
                    onChange={updateFouetteComponents}
                    baseValue={element.value}
                    maxComponents={10}
                  />
                </div>
              )}
            </div>

            {/* ==================== APPARATUS HANDLING SECTION ==================== */}
            <div className="p-4 bg-secondary/30 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Apparatus Handling</h4>
                {(selectedTechnicalElements.length > 0 || selectedDaElements.length > 0) && (
                  <span className="text-xs text-muted-foreground">
                    Value: {selectedDaElements.reduce((sum, da) => sum + da.value, 0).toFixed(1)}
                  </span>
                )}
              </div>

              {/* Combined list of TE and DA elements with drag-and-drop reordering */}
              {handlingItems.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={handlingItems.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {handlingItems.map((item) => (
                        <SortableHandlingItem
                          key={item.id}
                          item={item}
                          apparatus={apparatus}
                          getTechnicalElementSymbol={getTechnicalElementSymbol}
                          onRemove={() => {
                            if (item.type === 'te' && onRemoveTechnicalElement) {
                              onRemoveTechnicalElement(item.data.id);
                            } else if (item.type === 'da' && onRemoveDaElement) {
                              onRemoveDaElement(item.data.id);
                            }
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Buttons - For rotations, both TE and DA are allowed (multiple); for jumps/balances they are mutually exclusive */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTechnicalElementsClick}
                  disabled={!apparatus || (elementType !== 'rotation' && selectedDaElements.length > 0)}
                  className="flex-1 text-xs"
                >
                  {elementType === 'rotation' 
                    ? '+ Technical Elements' 
                    : (selectedTechnicalElements.length > 0 ? 'Change TE' : '+ Technical Elements')
                  }
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApparatusDifficultyClick}
                  disabled={!apparatus || (elementType !== 'rotation' && selectedTechnicalElements.length > 0)}
                  className="flex-1 text-xs"
                >
                  {elementType === 'rotation' 
                    ? '+ Apparatus Difficulty' 
                    : (selectedDaElements.length > 0 ? 'Change DA' : '+ Apparatus Difficulty')
                  }
                </Button>
              </div>

              {!apparatus && (
                <p className="text-xs text-center text-destructive">
                  Select an apparatus to enable handling options.
                </p>
              )}
            </div>

            {/* ==================== TOTAL VALUE SECTION ==================== */}
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Total Value</span>
                <span className="text-xl font-bold text-primary">
                  {(totalValue + selectedDaElements.reduce((sum, da) => sum + da.value, 0)).toFixed(1)}
                </span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground border-t pt-2">
                <div className="flex justify-between">
                  <span>DB:</span>
                  <span>{totalValue.toFixed(1)}</span>
                </div>
                {selectedTechnicalElements.length > 0 && (
                  <div className="flex justify-between">
                    <span>TE:</span>
                    <span>0.0</span>
                  </div>
                )}
                {selectedDaElements.length > 0 && (
                  <div className="flex justify-between">
                    <span>DA:</span>
                    <span>{selectedDaElements.reduce((sum, da) => sum + da.value, 0).toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          </ScrollArea>

          <DialogFooter className="flex gap-2 sm:gap-2 flex-shrink-0 pt-4 border-t">
            <Button onClick={handleSave}>
              Save
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog - higher z-index to appear above other dialogs */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isFouetteElement 
                ? 'Missing Apparatus Handling' 
                : isPerRotationElement || isSeries
                  ? 'Missing Apparatus Handling' 
                  : `${getElementTypeLabel()} Without Apparatus Handling`
              }
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>
                {isFouetteElement
                  ? 'To validate the element, apparatus handling must be performed within the first 2 rotations of fouetté. Do you want to add apparatus handling?'
                  : isPerRotationElement 
                    ? `A Backward Illusion requires one TE or DA for each rotation to be valid. You have added ${currentHandlingCount} of ${requiredHandlingCount} required. Would you like to add the missing apparatus handling to validate the DB?`
                    : isSeries
                      ? `A series requires one TE or DA for each rotation. You have added ${currentHandlingCount} of ${seriesRotationCount} required. Would you like to add the missing apparatus handling?`
                      : `You have added a new ${getElementTypeLabel().toLowerCase()} to the routine. However, the ${getElementTypeLabel().toLowerCase()} is not valid without an apparatus technical element or apparatus difficulty. Do you want to add apparatus handling?`
                }
              </span>
              {isPerRotationElement && (
                <span className="block text-xs text-muted-foreground italic">
                  Please note that each rotation in a Backward Illusion is counted as a separate DB. Therefore, apparatus handling must be selected for each rotation to be valid.
                </span>
              )}
              {isSeries && !isPerRotationElement && (
                <span className="block text-xs text-muted-foreground italic">
                  Each rotation in a series counts as a separate Difficulty and requires its own apparatus handling.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleWarningYes}>
              Yes
            </AlertDialogAction>
            <AlertDialogCancel onClick={(isPerRotationElement || isSeries) ? handleWarningNoSeriesOr3_1704 : handleWarningNo}>No</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
