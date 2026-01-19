import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Info, X, Check, AlertTriangle, Circle } from "lucide-react";
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

  // Toggle shape selection
  const toggleShape = (shape: FouetteShape) => {
    const isSelected = selectedShapes.some(s => s.id === shape.id);
    
    if (isSelected) {
      // Remove
      onChange(selectedShapes.filter(s => s.id !== shape.id));
    } else {
      // Add (max 3)
      if (selectedShapes.length < 3) {
        onChange([...selectedShapes, shape]);
      }
    }
  };

  // Calculate total value from selected shapes
  const totalValue = selectedShapes.reduce((sum, s) => sum + s.value, 0);

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
                  key={shape.id}
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
                  <span className="text-muted-foreground">({shape.value.toFixed(1)})</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-destructive/10"
                    onClick={() => toggleShape(shape)}
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

      {/* Available Shapes */}
      <ScrollArea className="h-[200px] rounded border">
        <div className="p-2 space-y-3">
          {/* Primary Level Shapes */}
          {primaryShapes.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-green-700 dark:text-green-400 px-1">
                {requiredLegLevelLabel} Level Shapes
              </div>
              <div className="grid gap-1">
                {primaryShapes.map(shape => {
                  const isSelected = selectedShapes.some(s => s.id === shape.id);
                  const symbolUrl = getSymbolUrl(shape.symbol_image, 'balance-symbols');
                  const isDisabled = !isSelected && selectedShapes.length >= 3;
                  
                  return (
                    <button
                      key={shape.id}
                      onClick={() => !isDisabled && toggleShape(shape)}
                      disabled={isDisabled}
                      className={`flex items-center gap-2 p-2 rounded text-left text-xs transition-colors ${
                        isDisabled
                          ? 'bg-muted/30 opacity-50 cursor-not-allowed'
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      {/* Circle selection indicator */}
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <Circle className={`h-5 w-5 ${isDisabled ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
                        )}
                      </div>
                      {symbolUrl && (
                        <img src={symbolUrl} alt={shape.name || ''} className="h-6 w-6 object-contain flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{shape.name || shape.code}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-muted-foreground">{shape.value.toFixed(1)}</div>
                      </div>
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
              <div className="grid gap-1">
                {universalShapes.map(shape => {
                  const isSelected = selectedShapes.some(s => s.id === shape.id);
                  const symbolUrl = getSymbolUrl(shape.symbol_image, 'balance-symbols');
                  const isDisabled = !isSelected && selectedShapes.length >= 3;
                  
                  return (
                    <button
                      key={shape.id}
                      onClick={() => !isDisabled && toggleShape(shape)}
                      disabled={isDisabled}
                      className={`flex items-center gap-2 p-2 rounded text-left text-xs transition-colors ${
                        isDisabled
                          ? 'bg-muted/30 opacity-50 cursor-not-allowed'
                          : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      {/* Circle selection indicator */}
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <Circle className={`h-5 w-5 ${isDisabled ? 'text-muted-foreground/30' : 'text-muted-foreground'}`} />
                        )}
                      </div>
                      {symbolUrl && (
                        <img src={symbolUrl} alt={shape.name || ''} className="h-6 w-6 object-contain flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{shape.name || shape.code}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-muted-foreground">{shape.value.toFixed(1)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      {selectedShapes.length > 0 && (
        <div className="p-3 bg-secondary/50 rounded-md border">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Shapes Selected:</span>
            <span className="font-medium">{selectedShapes.length}/3</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{requiredLegLevelLabel} Level:</span>
            <span className={`font-medium ${primaryLevelCount >= 2 ? 'text-green-600' : 'text-amber-600'}`}>
              {primaryLevelCount}/2 minimum
            </span>
          </div>
          <div className="flex justify-between text-sm pt-1 border-t">
            <span className="font-medium">Shapes Value:</span>
            <span className="font-bold text-primary">
              {selectedShapes.map(s => s.value.toFixed(1)).join(' + ')} = {totalValue.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};


