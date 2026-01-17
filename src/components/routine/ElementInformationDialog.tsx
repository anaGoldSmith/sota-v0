import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
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
}: ElementInformationDialogProps) => {
  const [rotationCount, setRotationCount] = useState<number>(1);
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
    
    if (is180Degrees) {
      const additionalHalfRotations = (rotationCount - 0.5) / 0.5;
      return baseValue + (additionalHalfRotations * extraValue);
    } else {
      const additionalFullRotations = Math.floor(rotationCount) - 1;
      return baseValue + (Math.max(0, additionalFullRotations) * extraValue);
    }
  }, [element, elementType, rotationCount, is180Degrees, isFixedRotation]);

  const handleIncrement = () => {
    if (isFixedRotation || elementType !== 'rotation') return;
    const step = is180Degrees ? 0.5 : 1;
    setRotationCount((prev) => prev + step);
  };

  const handleDecrement = () => {
    if (isFixedRotation || elementType !== 'rotation') return;
    setRotationCount((prev) => {
      if (prev <= minValue) return prev;
      const step = is180Degrees ? 0.5 : 1;
      return prev - step;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFixedRotation || elementType !== 'rotation') return;
    
    const value = parseFloat(e.target.value);
    if (isNaN(value)) return;
    
    if (value < minValue) {
      setRotationCount(minValue);
      return;
    }
    
    if (is180Degrees) {
      const roundedValue = Math.round(value * 2) / 2;
      setRotationCount(Math.max(minValue, roundedValue));
    } else {
      const roundedValue = Math.round(value);
      setRotationCount(Math.max(minValue, roundedValue));
    }
  };

  const hasApparatusHandling = selectedTechnicalElements.length > 0 || selectedDaElements.length > 0;

  const handleSave = () => {
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

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleApparatusDifficultyClick = () => {
    // Don't close this dialog - just trigger opening apparatus dialog
    onOpenApparatusDialog();
  };

  const handleTechnicalElementsClick = () => {
    // Don't close this dialog - just trigger opening technical elements dialog
    onOpenTechnicalElementsDialog();
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
        <DialogContent className="max-w-md z-[60]">
          <DialogHeader>
            <DialogTitle>Element Information</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Symbol and Name */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="h-16 w-16 flex items-center justify-center bg-background rounded-lg border">
                {symbolUrl ? (
                  <img
                    src={symbolUrl}
                    alt={element.name || element.description}
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                    Symbol
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">{getElementTypeLabel()}</p>
                <p className="font-medium text-foreground">
                  {element.name || element.description}
                </p>
                {elementType === 'rotation' && element.turn_degrees && element.turn_degrees !== "NA" && (
                  <p className="text-sm text-muted-foreground">
                    Base: {element.turn_degrees}°
                  </p>
                )}
              </div>
            </div>

            {/* Rotation Count Input (only for rotations) */}
            {showRotationCount && (
              <div className="space-y-3">
                <Label htmlFor="rotation-count">Number of Rotations</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleDecrement}
                    disabled={isFixedRotation || rotationCount <= minValue}
                    className="h-10 w-10"
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
                    className="text-center text-lg font-semibold h-10 w-24"
                  />
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleIncrement}
                    disabled={isFixedRotation}
                    className="h-10 w-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isFixedRotation
                    ? "This rotation has a fixed count of 1 and cannot be changed."
                    : is180Degrees 
                      ? "Minimum: 0.5 rotation. Increase by 0.5 increments."
                      : "Minimum: 1 rotation. Increase by full rotations only."
                  }
                </p>
              </div>
            )}

            {/* Value Calculation */}
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base value:</span>
                <span>{element.value.toFixed(1)}</span>
              </div>
              {showRotationCount && !isFixedRotation && element.extra_value && rotationCount > minValue && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {is180Degrees
                      ? `Extra (${(rotationCount - 0.5) / 0.5} × ${element.extra_value.toFixed(1)}):`
                      : `Extra (${Math.floor(rotationCount) - 1} × ${element.extra_value.toFixed(1)}):`
                    }
                  </span>
                  <span>
                    +{is180Degrees
                      ? (((rotationCount - 0.5) / 0.5) * element.extra_value).toFixed(1)
                      : ((Math.floor(rotationCount) - 1) * element.extra_value).toFixed(1)
                    }
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>{getElementTypeLabel()} Value:</span>
                <span className="text-primary">{totalValue.toFixed(1)}</span>
              </div>
            </div>

            {/* Selected Technical Elements */}
            {selectedTechnicalElements.length > 0 && (
              <div className="space-y-2">
                <Label>Technical Elements</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  {selectedTechnicalElements.map((te) => {
                    const teSymbolUrl = te.symbol_image && apparatus && getTechnicalElementSymbol
                      ? getTechnicalElementSymbol(te.symbol_image, apparatus)
                      : null;
                    return (
                      <div key={te.id} className="flex items-center gap-1 bg-background rounded px-2 py-1 border">
                        {teSymbolUrl && (
                          <img src={teSymbolUrl} alt={te.name} className="h-6 w-6 object-contain" />
                        )}
                        <span className="text-sm">{te.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected DA Elements */}
            {selectedDaElements.length > 0 && (
              <div className="space-y-2">
                <Label>Apparatus Difficulty</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  {selectedDaElements.map((da) => (
                    <div key={da.id} className="flex items-center gap-1 bg-background rounded px-2 py-1 border">
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
                  ))}
                </div>
              </div>
            )}

            {/* Apparatus Handling Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleTechnicalElementsClick}
                disabled={!apparatus}
                className="w-full"
              >
                {selectedTechnicalElements.length > 0 ? 'Change Technical Elements' : '+ Technical Elements'}
              </Button>
              <Button
                variant="outline"
                onClick={handleApparatusDifficultyClick}
                disabled={!apparatus}
                className="w-full"
              >
                {selectedDaElements.length > 0 ? 'Change Apparatus Difficulty' : '+ Apparatus Difficulty'}
              </Button>
            </div>

            {!apparatus && (
              <p className="text-xs text-center text-destructive">
                Select an apparatus in the routine calculator to enable apparatus handling.
              </p>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getElementTypeLabel()} Without Apparatus Handling</AlertDialogTitle>
            <AlertDialogDescription>
              You have added a new {getElementTypeLabel().toLowerCase()} to the routine. However, the {getElementTypeLabel().toLowerCase()} is not valid without an apparatus technical element or apparatus difficulty. Do you want to add apparatus handling?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleWarningNo}>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleWarningYes}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
