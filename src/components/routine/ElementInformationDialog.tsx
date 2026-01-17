import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ApparatusType } from "@/types/apparatus";

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
    withApparatusHandling: boolean;
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
  // For modifying existing element
  initialRotationCount?: number;
  isModifying?: boolean;
  // Callbacks for removing individual TE/DA
  onRemoveTechnicalElement?: (id: string) => void;
  onRemoveDaElement?: (id: string) => void;
  // Callback for rotation count changes (to persist state when navigating to TE/DA dialogs)
  onRotationCountChange?: (count: number) => void;
}

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
  initialRotationCount,
  isModifying = false,
  onRemoveTechnicalElement,
  onRemoveDaElement,
  onRotationCountChange,
}: ElementInformationDialogProps) => {
  const [rotationCount, setRotationCount] = useState<number>(1);
  
  // Wrap setRotationCount to also notify parent
  const updateRotationCount = (count: number) => {
    setRotationCount(count);
    onRotationCountChange?.(count);
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

  // Check if rotation count is applicable (only for rotations)
  const showRotationCount = elementType === 'rotation';

  // Set default rotation count when element changes
  useEffect(() => {
    if (element && elementType === 'rotation') {
      if (initialRotationCount !== undefined) {
        setRotationCount(initialRotationCount);
      } else if (isFixedRotation) {
        setRotationCount(1);
      } else {
        setRotationCount(is180Degrees ? 0.5 : 1);
      }
    } else {
      setRotationCount(1);
    }
  }, [element, elementType, is180Degrees, isFixedRotation, initialRotationCount]);

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
    
    if (is180Degrees) {
      const additionalHalfRotations = (rotationCount - 0.5) / 0.5;
      return baseValue + (additionalHalfRotations * extraValue);
    } else {
      const additionalFullRotations = Math.floor(rotationCount) - 1;
      return baseValue + (Math.max(0, additionalFullRotations) * extraValue);
    }
  }, [element, elementType, rotationCount, is180Degrees, isFixedRotation, isPerRotationElement]);

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
  
  // For 3.1704: each rotation needs its own TE or DA
  const requiredHandlingCount = isPerRotationElement ? rotationCount : 1;
  const currentHandlingCount = selectedTechnicalElements.length + selectedDaElements.length;
  const hasEnoughHandling = currentHandlingCount >= requiredHandlingCount;

  const handleSave = () => {
    // For 3.1704: must have at least one TE/DA per rotation, no skipping allowed
    if (isPerRotationElement && !hasEnoughHandling) {
      setShowWarningDialog(true);
      return;
    }
    
    if (!hasApparatusHandling) {
      // Show warning that element needs apparatus handling
      setShowWarningDialog(true);
      return;
    }
    
    if (element && elementType) {
      onSave({
        element,
        elementType,
        rotationCount,
        totalValue,
        technicalElements: selectedTechnicalElements.length > 0 ? selectedTechnicalElements : undefined,
        daElements: selectedDaElements.length > 0 ? selectedDaElements : undefined,
        withApparatusHandling: hasApparatusHandling,
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
      onSave({
        element,
        elementType,
        rotationCount,
        totalValue,
        withApparatusHandling: false,
      });
      setShowWarningDialog(false);
      onOpenChange(false);
    }
  };

  // For 3.1704: No = save with missing handling anyway
  const handleWarningNo3_1704 = () => {
    if (element && elementType) {
      onSave({
        element,
        elementType,
        rotationCount,
        totalValue,
        technicalElements: selectedTechnicalElements.length > 0 ? selectedTechnicalElements : undefined,
        daElements: selectedDaElements.length > 0 ? selectedDaElements : undefined,
        withApparatusHandling: hasApparatusHandling,
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
              {showRotationCount && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <Label htmlFor="rotation-count" className="text-sm">Number of Rotations</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDecrement}
                      disabled={isFixedRotation || rotationCount <= minValue}
                      className="h-9 w-9"
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
                      className="text-center text-lg font-semibold h-9 w-20"
                    />
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleIncrement}
                      disabled={isFixedRotation}
                      className="h-9 w-9"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex-1 text-xs text-muted-foreground">
                      {isFixedRotation
                        ? "Fixed rotation"
                        : is180Degrees 
                          ? "Min: 0.5"
                          : "Min: 1"
                      }
                    </div>
                  </div>
                  
                  {/* Value breakdown for rotations */}
                  {!isFixedRotation && !isPerRotationElement && element.extra_value && rotationCount > minValue && (
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

              {/* Selected Technical Elements */}
              {selectedTechnicalElements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Technical Elements</p>
                  {selectedTechnicalElements.map((te) => {
                    const teSymbolUrl = te.symbol_image && apparatus && getTechnicalElementSymbol
                      ? getTechnicalElementSymbol(te.symbol_image, apparatus)
                      : null;
                    return (
                      <div 
                        key={te.id} 
                        className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          {teSymbolUrl && (
                            <img src={teSymbolUrl} alt={te.name} className="h-6 w-6 object-contain" />
                          )}
                          <span className="text-sm">{te.name}</span>
                        </div>
                        {onRemoveTechnicalElement && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onRemoveTechnicalElement(te.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected DA Elements */}
              {selectedDaElements.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Apparatus Difficulty</p>
                  {selectedDaElements.map((da) => (
                    <div 
                      key={da.id} 
                      className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-md"
                    >
                      <div className="flex items-center gap-2">
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
                      {onRemoveDaElement && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onRemoveDaElement(da.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Buttons - Mutually exclusive (except for 3.1704 which allows multiple) */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTechnicalElementsClick}
                  disabled={!apparatus || (!isPerRotationElement && selectedDaElements.length > 0)}
                  className="flex-1 text-xs"
                >
                  {selectedTechnicalElements.length > 0 ? (isPerRotationElement ? '+ More TE' : 'Change TE') : '+ Technical Elements'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApparatusDifficultyClick}
                  disabled={!apparatus || (!isPerRotationElement && selectedTechnicalElements.length > 0)}
                  className="flex-1 text-xs"
                >
                  {selectedDaElements.length > 0 ? (isPerRotationElement ? '+ More DA' : 'Change DA') : '+ Apparatus Difficulty'}
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
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog - higher z-index to appear above other dialogs */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPerRotationElement ? 'Missing Apparatus Handling' : `${getElementTypeLabel()} Without Apparatus Handling`}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span>
                {isPerRotationElement 
                  ? `A Backward Illusion requires one TE or DA for each rotation to be valid. You have added ${currentHandlingCount} of ${requiredHandlingCount} required. Would you like to add the missing apparatus handling to validate the DB?`
                  : `You have added a new ${getElementTypeLabel().toLowerCase()} to the routine. However, the ${getElementTypeLabel().toLowerCase()} is not valid without an apparatus technical element or apparatus difficulty. Do you want to add apparatus handling?`
                }
              </span>
              {isPerRotationElement && (
                <span className="block text-xs text-muted-foreground italic">
                  Please note that each rotation in a Backward Illusion is counted as a separate DB. Therefore, apparatus handling must be selected for each rotation to be valid.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={isPerRotationElement ? handleWarningNo3_1704 : handleWarningNo}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleWarningYes}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
