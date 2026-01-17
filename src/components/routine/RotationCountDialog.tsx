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

  // Set default rotation count when rotation changes
  useEffect(() => {
    if (rotation) {
      setRotationCount(is180Degrees ? 0.5 : 1);
    }
  }, [rotation, is180Degrees]);

  const minValue = is180Degrees ? 0.5 : 1;

  // Calculate total value: base value + (full rotations after first × extra_value)
  const totalValue = useMemo(() => {
    if (!rotation) return 0;
    const baseValue = rotation.value;
    const extraValue = rotation.extra_value || 0;
    
    // Calculate full rotations after the first one
    // For 180°: 0.5 is base, then each additional full rotation adds extra_value
    // For others: 1 is base, then each additional full rotation adds extra_value
    const baseRotations = is180Degrees ? 0.5 : 1;
    const additionalFullRotations = Math.floor(rotationCount - baseRotations);
    
    // Total = base value + (additional full rotations × extra_value)
    return baseValue + (additionalFullRotations * extraValue);
  }, [rotation, rotationCount, is180Degrees]);

  const handleIncrement = () => {
    setRotationCount((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setRotationCount((prev) => {
      // Don't go below minimum
      if (prev <= minValue) return prev;
      // Decrease by 1 (full rotation only)
      return prev - 1;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (isNaN(value)) return;
    
    // Validate the value
    if (value < minValue) {
      setRotationCount(minValue);
      return;
    }
    
    // For 180° rotations: allow 0.5, 1.5, 2.5, etc.
    // For others: allow 1, 2, 3, etc.
    if (is180Degrees) {
      // Must be 0.5 + whole number (0.5, 1.5, 2.5, etc.)
      const decimal = value % 1;
      if (decimal !== 0.5 && decimal !== 0) {
        // Round to nearest valid value
        setRotationCount(Math.round(value - 0.5) + 0.5);
        return;
      }
      if (decimal === 0 && value > 0.5) {
        // If they entered a whole number > 0.5, convert to .5 format
        setRotationCount(value - 0.5);
        return;
      }
    } else {
      // For non-180°, must be whole number
      if (value % 1 !== 0) {
        setRotationCount(Math.round(value));
        return;
      }
    }
    
    setRotationCount(value);
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
                disabled={rotationCount <= minValue}
                className="h-10 w-10"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                id="rotation-count"
                type="number"
                step={1}
                min={minValue}
                value={rotationCount}
                onChange={handleInputChange}
                className="text-center text-lg font-semibold h-10 w-24"
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleIncrement}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {is180Degrees 
                ? "Minimum: 0.5 rotation. Add full rotations (1, 2, 3...) after that."
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
            {rotation.extra_value && rotationCount > minValue && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Extra ({Math.floor(rotationCount - minValue)} × {rotation.extra_value.toFixed(1)}):
                </span>
                <span>+{(Math.floor(rotationCount - minValue) * rotation.extra_value).toFixed(1)}</span>
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
