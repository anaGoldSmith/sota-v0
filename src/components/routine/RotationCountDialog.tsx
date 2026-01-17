import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ApparatusType } from "@/types/apparatus";

interface Rotation {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
  extra_value: number | null;
  symbol_image: string | null;
}

interface RotationCountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rotation: Rotation | null;
  onConfirm: (rotation: Rotation, rotationCount: number, totalValue: number, withApparatusHandling?: boolean) => void;
  onConfirmWithoutHandling: (rotation: Rotation, rotationCount: number, totalValue: number) => void;
  getSymbolUrl: (symbolImage: string | null, bucketName: string) => string | null;
  apparatus: ApparatusType | null;
  onOpenApparatusDialog: () => void;
  onOpenTechnicalElementsDialog: () => void;
}

export const RotationCountDialog = ({
  open,
  onOpenChange,
  rotation,
  onConfirm,
  onConfirmWithoutHandling,
  getSymbolUrl,
  apparatus,
  onOpenApparatusDialog,
  onOpenTechnicalElementsDialog,
}: RotationCountDialogProps) => {
  const [rotationCount, setRotationCount] = useState<number>(1);
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  // Determine if this is a 180-degree rotation
  const is180Degrees = useMemo(() => {
    if (!rotation?.turn_degrees) return false;
    return rotation.turn_degrees === "180" || rotation.turn_degrees.includes("180");
  }, [rotation]);

  // Check if this is a fixed rotation (codes 3.2101 or 3.2202)
  const isFixedRotation = useMemo(() => {
    if (!rotation?.code) return false;
    return rotation.code === "3.2101" || rotation.code === "3.2202";
  }, [rotation]);

  // Set default rotation count when rotation changes
  useEffect(() => {
    if (rotation) {
      // Fixed rotations always default to 1
      if (isFixedRotation) {
        setRotationCount(1);
      } else {
        setRotationCount(is180Degrees ? 0.5 : 1);
      }
    }
  }, [rotation, is180Degrees, isFixedRotation]);

  const minValue = is180Degrees ? 0.5 : 1;

  // Calculate total value based on rotation type
  const totalValue = useMemo(() => {
    if (!rotation) return 0;
    const baseValue = rotation.value;
    const extraValue = rotation.extra_value || 0;
    
    // Fixed rotations: no extra value calculation
    if (isFixedRotation) {
      return baseValue;
    }
    
    if (is180Degrees) {
      // For 180°: add extra_value for each additional 0.5 after the first 0.5
      const additionalHalfRotations = (rotationCount - 0.5) / 0.5;
      return baseValue + (additionalHalfRotations * extraValue);
    } else {
      // For other rotations: add extra_value only for full extra circles
      const additionalFullRotations = Math.floor(rotationCount) - 1;
      return baseValue + (Math.max(0, additionalFullRotations) * extraValue);
    }
  }, [rotation, rotationCount, is180Degrees, isFixedRotation]);

  const handleIncrement = () => {
    if (isFixedRotation) return;
    const step = is180Degrees ? 0.5 : 1;
    setRotationCount((prev) => prev + step);
  };

  const handleDecrement = () => {
    if (isFixedRotation) return;
    setRotationCount((prev) => {
      if (prev <= minValue) return prev;
      const step = is180Degrees ? 0.5 : 1;
      return prev - step;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFixedRotation) return;
    
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

  const handleAddToRoutine = () => {
    // Show warning that element is not valid without apparatus handling
    setShowWarningDialog(true);
  };

  const handleWarningYes = () => {
    // User wants to add apparatus handling - go back to this dialog
    setShowWarningDialog(false);
    // Stay in this dialog so user can choose apparatus handling
  };

  const handleWarningNo = () => {
    // User accepts adding without apparatus handling
    if (rotation) {
      onConfirmWithoutHandling(rotation, rotationCount, totalValue);
      setShowWarningDialog(false);
      onOpenChange(false);
    }
  };

  const handleApparatusDifficultyClick = () => {
    if (rotation) {
      // Confirm with apparatus handling flag and trigger apparatus difficulty flow
      onConfirm(rotation, rotationCount, totalValue, true);
      onOpenChange(false);
      setTimeout(() => {
        onOpenApparatusDialog();
      }, 100);
    }
  };

  const handleTechnicalElementsClick = () => {
    if (rotation) {
      // Confirm with apparatus handling flag and trigger technical elements flow
      onConfirm(rotation, rotationCount, totalValue, true);
      onOpenChange(false);
      setTimeout(() => {
        onOpenTechnicalElementsDialog();
      }, 100);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!rotation) return null;

  const symbolUrl = getSymbolUrl(rotation.symbol_image, 'jump-symbols');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md z-[60]">
          <DialogHeader>
            <DialogTitle>Specify Rotation Count</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Symbol and Name */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="h-16 w-16 flex items-center justify-center bg-background rounded-lg border">
                {symbolUrl ? (
                  <img
                    src={symbolUrl}
                    alt={rotation.name || rotation.description}
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                    Symbol
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">
                  {rotation.name || rotation.description}
                </p>
                {rotation.turn_degrees && rotation.turn_degrees !== "NA" && (
                  <p className="text-sm text-muted-foreground">
                    Base: {rotation.turn_degrees}°
                  </p>
                )}
              </div>
            </div>

            {/* Rotation Count Input */}
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

            {/* Value Calculation */}
            <div className="p-4 bg-primary/10 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base value:</span>
                <span>{rotation.value.toFixed(1)}</span>
              </div>
              {!isFixedRotation && rotation.extra_value && rotationCount > minValue && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {is180Degrees
                      ? `Extra (${(rotationCount - 0.5) / 0.5} × ${rotation.extra_value.toFixed(1)}):`
                      : `Extra (${Math.floor(rotationCount) - 1} × ${rotation.extra_value.toFixed(1)}):`
                    }
                  </span>
                  <span>
                    +{is180Degrees
                      ? (((rotationCount - 0.5) / 0.5) * rotation.extra_value).toFixed(1)
                      : ((Math.floor(rotationCount) - 1) * rotation.extra_value).toFixed(1)
                    }
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total Value:</span>
                <span className="text-primary">{totalValue.toFixed(1)}</span>
              </div>
            </div>

            {/* Apparatus Handling Buttons */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleTechnicalElementsClick}
                disabled={!apparatus}
                className="w-full"
              >
                + Technical Elements
              </Button>
              <Button
                variant="outline"
                onClick={handleApparatusDifficultyClick}
                disabled={!apparatus}
                className="w-full"
              >
                + Apparatus Difficulty
              </Button>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleAddToRoutine}>
              Add to Routine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotation Added Without Apparatus Handling</AlertDialogTitle>
            <AlertDialogDescription>
              You have added a new rotation to the routine. However, the rotation is not valid without an apparatus technical element. Do you want to add apparatus difficulty?
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