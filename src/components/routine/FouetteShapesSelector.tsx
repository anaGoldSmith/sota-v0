import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Info, X, Check, AlertTriangle, Circle, Plus, GripVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface FouetteShape {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  leg_level: string | null;
  symbol_image: string | null;
  isCustom?: boolean; // Flag for user-entered custom shapes
}

// Sortable shape item component
function SortableShapeItem({ 
  shape, 
  index, 
  onRemove 
}: { 
  shape: FouetteShape; 
  index: number; 
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `shape-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
        shape.isCustom ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300' : 'bg-muted/50'
      }`}
    >
      <div
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
      <span className="font-medium text-muted-foreground">#{index + 1}</span>
      <span className="truncate max-w-[80px]">{shape.name || shape.code}</span>
      {shape.isCustom && <span className="text-[9px] text-orange-600">(custom)</span>}
      <button type="button" onClick={onRemove} className="hover:text-destructive">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface FouetteShapesSelectorProps {
  elementCode: string; // "2.1803" or "2.1805"
  selectedShapes: FouetteShape[];
  onChange: (shapes: FouetteShape[]) => void;
  getSymbolUrl: (symbolImage: string | null, bucketName: string) => string | null;
}

export const FouetteShapesSelector = ({
  elementCode,
  selectedShapes,
  onChange,
  getSymbolUrl,
}: FouetteShapesSelectorProps) => {
  const [customShapeInput, setCustomShapeInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Determine which leg level is required (primary)
  const requiredLegLevel = elementCode === "2.1803" ? "HOR" : "HIGH";
  const requiredLegLevelLabel = elementCode === "2.1803" ? "Horizontal" : "High (split)";
  
  // Fetch fouetté shapes from database
  const { data: allFouetteShapes = [], isLoading } = useQuery({
    queryKey: ['fouette-shapes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('balances')
        .select('id, code, name, description, value, leg_level, symbol_image')
        .eq('fouette', true)
        .order('code');
      
      if (error) throw error;
      return data as FouetteShape[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter available shapes
  const availableShapes = useMemo(() => {
    return allFouetteShapes.filter(shape => {
      const level = shape.leg_level?.toUpperCase();
      return level === requiredLegLevel || level === 'NA' || !level;
    });
  }, [allFouetteShapes, requiredLegLevel]);

  const primaryShapes = useMemo(() => 
    availableShapes.filter(s => s.leg_level?.toUpperCase() === requiredLegLevel),
    [availableShapes, requiredLegLevel]
  );
  
  const universalShapes = useMemo(() => 
    availableShapes.filter(s => !s.leg_level || s.leg_level.toUpperCase() === 'NA'),
    [availableShapes]
  );

  // Validation - custom shapes don't count toward leg level requirement
  const nonCustomShapes = selectedShapes.filter(s => !s.isCustom);
  const customShapesCount = selectedShapes.filter(s => s.isCustom).length;
  const primaryLevelCount = nonCustomShapes.filter(
    s => s.leg_level?.toUpperCase() === requiredLegLevel
  ).length;
  
  // Valid if 3 shapes AND (at least 2 primary level OR has custom shapes which bypass the check)
  const isValid = selectedShapes.length === 3 && (primaryLevelCount >= 2 || customShapesCount > 0);

  const getShapeCount = (shapeId: string) => selectedShapes.filter(s => s.id === shapeId && !s.isCustom).length;

  const addShape = (shape: FouetteShape) => {
    if (selectedShapes.length < 3) {
      onChange([...selectedShapes, shape]);
    }
  };

  const addCustomShape = () => {
    if (customShapeInput.trim() && selectedShapes.length < 3) {
      const customShape: FouetteShape = {
        id: `custom-${Date.now()}`,
        code: 'CUSTOM',
        name: customShapeInput.trim(),
        description: customShapeInput.trim(),
        value: 0,
        leg_level: null,
        symbol_image: null,
        isCustom: true,
      };
      onChange([...selectedShapes, customShape]);
      setCustomShapeInput("");
      setShowCustomInput(false);
    }
  };

  const removeShapeAtIndex = (index: number) => {
    const newShapes = [...selectedShapes];
    newShapes.splice(index, 1);
    onChange(newShapes);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(String(active.id).replace('shape-', ''));
      const newIndex = parseInt(String(over.id).replace('shape-', ''));
      
      const newShapes = arrayMove(selectedShapes, oldIndex, newIndex);
      onChange(newShapes);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading shapes...</div>;
  }

  const shapeIds = selectedShapes.map((_, index) => `shape-${index}`);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm">Fouetté Shapes</Label>
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="center" className="max-w-[280px] text-sm z-[200]" sideOffset={8}>
              <p>Select exactly 3 shapes. At least 2 must be {requiredLegLevelLabel} level, or use "Other" to enter custom shapes. Drag to reorder.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className={`ml-auto text-xs ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
          {selectedShapes.length}/3 {isValid && <Check className="inline h-3 w-3" />}
        </span>
      </div>

      {/* Selected shapes display with drag-and-drop */}
      {selectedShapes.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={shapeIds} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-wrap gap-1">
              {selectedShapes.map((shape, index) => (
                <SortableShapeItem
                  key={`${shape.id}-${index}`}
                  shape={shape}
                  index={index}
                  onRemove={() => removeShapeAtIndex(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Validation message */}
      {selectedShapes.length > 0 && selectedShapes.length === 3 && !isValid && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          <span>Need at least 2 {requiredLegLevelLabel} shapes ({primaryLevelCount}/2)</span>
        </div>
      )}

      {/* Shape selection - scrollable list */}
      <ScrollArea className="h-[140px] rounded border">
        <div className="p-2 space-y-2">
          {/* Primary shapes */}
          {primaryShapes.length > 0 && (
            <div>
              <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                {requiredLegLevelLabel} Level
              </div>
              <div className="space-y-1">
                {primaryShapes.map(shape => {
                  const count = getShapeCount(shape.id);
                  const disabled = selectedShapes.length >= 3;
                  return (
                    <button
                      type="button"
                      key={shape.id}
                      onClick={() => addShape(shape)}
                      disabled={disabled}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
                      }`}
                    >
                      {count > 0 ? (
                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-white">{count}</span>
                        </div>
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate">{shape.name || shape.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Universal shapes */}
          {universalShapes.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Universal</div>
              <div className="space-y-1">
                {universalShapes.map(shape => {
                  const count = getShapeCount(shape.id);
                  const disabled = selectedShapes.length >= 3;
                  return (
                    <button
                      type="button"
                      key={shape.id}
                      onClick={() => addShape(shape)}
                      disabled={disabled}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
                      }`}
                    >
                      {count > 0 ? (
                        <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-white">{count}</span>
                        </div>
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="truncate">{shape.name || shape.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other (custom) option */}
          <div>
            <div className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">Other</div>
            {showCustomInput ? (
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={customShapeInput}
                  onChange={(e) => setCustomShapeInput(e.target.value)}
                  placeholder="Enter shape name..."
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomShape();
                    }
                  }}
                  disabled={selectedShapes.length >= 3}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addCustomShape}
                  disabled={!customShapeInput.trim() || selectedShapes.length >= 3}
                  className="h-7 px-2 text-xs"
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomShapeInput("");
                  }}
                  className="h-7 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                disabled={selectedShapes.length >= 3}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                  selectedShapes.length >= 3 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'
                }`}
              >
                <Plus className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span className="text-muted-foreground">Enter custom shape...</span>
              </button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
