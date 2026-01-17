import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";

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
  onConfirm: (rotation: Rotation, rotationCount: number, totalValue: number) => void;
  getSymbolUrl: (symbolImage: string | null, bucketName: string) => string | null;
}

export const RotationCountDialog = ({
  open,
  onOpenChange,
  rotation,
  onConfirm,
  getSymbolUrl,
}: RotationCountDialogProps) => {
  const [rotationCount, setRotationCount] = useState<number>(1);

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
      // e.g., 0.5 -> base only, 1.0 -> base + 1*extra, 1.5 -> base + 2*extra, 2.0 -> base + 3*extra
      const additionalHalfRotations = (rotationCount - 0.5) / 0.5;
      return baseValue + (additionalHalfRotations * extraValue);
    } else {
      // For other rotations: add extra_value only for full extra circles (not for extra 0.5)
      // e.g., 1 -> base only, 2 -> base + 1*extra, 3 -> base + 2*extra
      const additionalFullRotations = Math.floor(rotationCount) - 1;
      return baseValue + (Math.max(0, additionalFullRotations) * extraValue);
    }
  }, [rotation, rotationCount, is180Degrees, isFixedRotation]);

  const handleIncrement = () => {
    if (isFixedRotation) return;
    // For 180° rotations, increment by 0.5; for others, increment by 1
    const step = is180Degrees ? 0.5 : 1;
    setRotationCount((prev) => prev + step);
  };

  const handleDecrement = () => {
    if (isFixedRotation) return;
    setRotationCount((prev) => {
      // Don't go below minimum
      if (prev <= minValue) return prev;
      // For 180° rotations, decrement by 0.5; for others, decrement by 1
      const step = is180Degrees ? 0.5 : 1;
      return prev - step;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFixedRotation) return;
    
    const value = parseFloat(e.target.value);
    if (isNaN(value)) return;
    
    // Validate the value
    if (value < minValue) {
      setRotationCount(minValue);
      return;
    }
    
    if (is180Degrees) {
      // For 180° rotations: allow 0.5 increments (0.5, 1.0, 1.5, 2.0, etc.)
      const roundedValue = Math.round(value * 2) / 2;
      setRotationCount(Math.max(minValue, roundedValue));
    } else {
      // For non-180°: allow only whole numbers (1, 2, 3, etc.)
      const roundedValue = Math.round(value);
      setRotationCount(Math.max(minValue, roundedValue));
    }
  };

  const handleConfirm = () => {
    if (rotation) {
      onConfirm(rotation, rotationCount, totalValue);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!rotation) return null;

  const symbolUrl = getSymbolUrl(rotation.symbol_image, 'jump-symbols');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Add to Routine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
