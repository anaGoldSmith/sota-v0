import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Info, X, Check, AlertTriangle, Circle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
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

  // Validation
  const primaryLevelCount = selectedShapes.filter(
    s => s.leg_level?.toUpperCase() === requiredLegLevel
  ).length;
  
  const isValid = selectedShapes.length === 3 && primaryLevelCount >= 2;

  const getShapeCount = (shapeId: string) => selectedShapes.filter(s => s.id === shapeId).length;

  const addShape = (shape: FouetteShape) => {
    if (selectedShapes.length < 3) {
      onChange([...selectedShapes, shape]);
    }
  };

  const removeShapeAtIndex = (index: number) => {
    const newShapes = [...selectedShapes];
    newShapes.splice(index, 1);
    onChange(newShapes);
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground">Loading shapes...</div>;
  }

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
              <p>Select exactly 3 shapes. At least 2 must be {requiredLegLevelLabel} level.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className={`ml-auto text-xs ${isValid ? 'text-green-600' : 'text-muted-foreground'}`}>
          {selectedShapes.length}/3 {isValid && <Check className="inline h-3 w-3" />}
        </span>
      </div>

      {/* Selected shapes display */}
      {selectedShapes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedShapes.map((shape, index) => (
            <div 
              key={`${shape.id}-${index}`}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted/50 border"
            >
              <span className="font-medium text-muted-foreground">#{index + 1}</span>
              <span className="truncate max-w-[100px]">{shape.name || shape.code}</span>
              <button type="button" onClick={() => removeShapeAtIndex(index)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
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
        </div>
      </ScrollArea>
    </div>
  );
};
