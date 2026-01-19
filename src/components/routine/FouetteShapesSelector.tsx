import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Info, X, Check, AlertTriangle, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface FouetteShape {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  leg_level: string | null;
  symbol_image: string | null;
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter available shapes for this element:
  // - Shapes with matching leg_level (HOR for 2.1803, HIGH for 2.1805)
  // - Shapes with NA leg_level (available for both)
  const availableShapes = useMemo(() => {
    return allFouetteShapes.filter(shape => {
      const level = shape.leg_level?.toUpperCase();
      return level === requiredLegLevel || level === 'NA' || !level;
    });
  }, [allFouetteShapes, requiredLegLevel]);

  // Separate shapes by category for display
  const primaryShapes = useMemo(() => 
    availableShapes.filter(s => s.leg_level?.toUpperCase() === requiredLegLevel),
    [availableShapes, requiredLegLevel]
  );
  
  const universalShapes = useMemo(() => 
    availableShapes.filter(s => !s.leg_level || s.leg_level.toUpperCase() === 'NA'),
    [availableShapes]
  );

  // Validation: count shapes by leg level
  const primaryLevelCount = selectedShapes.filter(
    s => s.leg_level?.toUpperCase() === requiredLegLevel
  ).length;
  
  const isValid = selectedShapes.length === 3 && primaryLevelCount >= 2;
  const hasThreeShapes = selectedShapes.length === 3;

  // Count how many times a shape is selected
  const getShapeCount = (shapeId: string) => {
    return selectedShapes.filter(s => s.id === shapeId).length;
  };

  // Add a shape (allows duplicates, max 3 total)
  const addShape = (shape: FouetteShape) => {
    if (selectedShapes.length < 3) {
      onChange([...selectedShapes, shape]);
    }
  };

  // Remove one instance of a shape (by index in selected array)
  const removeShapeAtIndex = (index: number) => {
    const newShapes = [...selectedShapes];
    newShapes.splice(index, 1);
    onChange(newShapes);
  };

  // Scroll handlers for the main container
  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -150, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 150, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading shapes...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Fouetté Shapes</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <p>
                  Select exactly 3 shapes for this fouetté balance. 
                  At least 2 shapes must be at {requiredLegLevelLabel.toLowerCase()} level.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className={`text-xs ${hasThreeShapes ? 'text-green-600' : 'text-muted-foreground'}`}>
          {selectedShapes.length}/3 selected
        </span>
      </div>

      {/* Selected Shapes Display */}
      {selectedShapes.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Selected shapes:</span>
          <div className="flex flex-wrap gap-1">
            {selectedShapes.map((shape, index) => {
              const symbolUrl = getSymbolUrl(shape.symbol_image, 'balance-symbols');
              const isPrimary = shape.leg_level?.toUpperCase() === requiredLegLevel;
              return (
                <div 
                  key={`${shape.id}-${index}`}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${
                    isPrimary 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' 
                      : 'bg-muted/50 border-muted'
                  }`}
                >
                  <span className="font-medium">#{index + 1}</span>
                  {symbolUrl && (
                    <img src={symbolUrl} alt={shape.name || ''} className="h-5 w-5 object-contain" />
                  )}
                  <span className="max-w-[120px] truncate">{shape.name || shape.code}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-destructive/10"
                    onClick={() => removeShapeAtIndex(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Validation Status */}
      {selectedShapes.length > 0 && (
        <div className={`p-2 rounded text-xs flex items-center gap-2 ${
          isValid 
            ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300'
            : hasThreeShapes 
              ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
              : 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
        }`}>
          {isValid ? (
            <>
              <Check className="h-4 w-4" />
              <span>Valid: {primaryLevelCount} {requiredLegLevelLabel} shapes selected</span>
            </>
          ) : hasThreeShapes ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              <span>Invalid: Need at least 2 {requiredLegLevelLabel} shapes (currently {primaryLevelCount})</span>
            </>
          ) : (
            <>
              <Info className="h-4 w-4" />
              <span>Select {3 - selectedShapes.length} more shape{3 - selectedShapes.length !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
      )}

      {/* Available Shapes with global horizontal scroll buttons */}
      <div className="rounded border">
        {/* Scroll buttons header */}
        <div className="flex items-center justify-between px-2 py-1 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Available Shapes</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={scrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={scrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="min-w-max p-2 space-y-3">
            {/* Primary Level Shapes */}
            {primaryShapes.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-green-700 dark:text-green-400 px-1">
                  {requiredLegLevelLabel} Level Shapes
                </div>
                <div className="space-y-1">
                  {primaryShapes.map(shape => {
                    const shapeCount = getShapeCount(shape.id);
                    const symbolUrl = getSymbolUrl(shape.symbol_image, 'balance-symbols');
                    const isDisabled = selectedShapes.length >= 3;
                    
                    return (
                      <button
                        type="button"
                        key={shape.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addShape(shape);
                        }}
                        disabled={isDisabled}
                        className={`flex items-center gap-2 p-2 rounded text-left text-xs transition-colors whitespace-nowrap w-full ${
                          isDisabled
                            ? 'bg-muted/30 opacity-50 cursor-not-allowed'
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {shapeCount > 0 ? (
                            <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">{shapeCount}</span>
                            </div>
                          ) : (
                            <Circle className={`h-5 w-5 ${isDisabled ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
                          )}
                        </div>
                        {symbolUrl && (
                          <img src={symbolUrl} alt={shape.name || ''} className="h-6 w-6 object-contain flex-shrink-0" />
                        )}
                        <span className="font-medium">{shape.name || shape.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Universal Shapes (NA leg level) */}
            {universalShapes.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground px-1">
                  Universal Shapes
                </div>
                <div className="space-y-1">
                  {universalShapes.map(shape => {
                    const shapeCount = getShapeCount(shape.id);
                    const symbolUrl = getSymbolUrl(shape.symbol_image, 'balance-symbols');
                    const isDisabled = selectedShapes.length >= 3;
                    
                    return (
                      <button
                        type="button"
                        key={shape.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addShape(shape);
                        }}
                        disabled={isDisabled}
                        className={`flex items-center gap-2 p-2 rounded text-left text-xs transition-colors whitespace-nowrap w-full ${
                          isDisabled
                            ? 'bg-muted/30 opacity-50 cursor-not-allowed'
                            : 'bg-muted/30 hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {shapeCount > 0 ? (
                            <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">{shapeCount}</span>
                            </div>
                          ) : (
                            <Circle className={`h-5 w-5 ${isDisabled ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
                          )}
                        </div>
                        {symbolUrl && (
                          <img src={symbolUrl} alt={shape.name || ''} className="h-6 w-6 object-contain flex-shrink-0" />
                        )}
                        <span className="font-medium">{shape.name || shape.code}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {selectedShapes.length > 0 && (
        <div className="p-3 bg-secondary/50 rounded-md border">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Shapes Selected:</span>
            <span className="font-medium">{selectedShapes.length}/3</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{requiredLegLevelLabel} Level:</span>
            <span className={`font-medium ${primaryLevelCount >= 2 ? 'text-green-600' : 'text-amber-600'}`}>
              {primaryLevelCount}/2 minimum
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
