import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApparatusType } from "@/types/apparatus";

interface ApparatusHandlingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTechnicalElements: () => void;
  onSelectApparatusDifficulty: () => void;
  onSkip: () => void;
  apparatus: ApparatusType | null;
  onOpenApparatusDialog: () => void;
  sourceElementType?: 'jump' | 'rotation' | 'balance';
}

export const ApparatusHandlingDialog = ({
  open,
  onOpenChange,
  onSelectTechnicalElements,
  onSelectApparatusDifficulty,
  onSkip,
  apparatus,
  onOpenApparatusDialog,
  sourceElementType
}: ApparatusHandlingDialogProps) => {
  const handleApparatusDifficultyClick = () => {
    if (!apparatus) {
      // Show error or warning if no apparatus selected
      return;
    }
    // First trigger the selection logic
    onSelectApparatusDifficulty();
    // Close this dialog
    onOpenChange(false);
    // Then open the apparatus dialog
    setTimeout(() => {
      onOpenApparatusDialog();
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      console.log("ApparatusHandlingDialog onOpenChange called:", isOpen);
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Apparatus Handling</DialogTitle>
          <DialogDescription>
            Please select at least 1 apparatus technical element or apparatus difficulty to make DB valid.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-3 flex-col sm:flex-col items-center">
          <Button onClick={onSelectTechnicalElements} className="w-64">
            +Technical Elements
          </Button>
          <Button 
            onClick={handleApparatusDifficultyClick} 
            className="w-64"
            disabled={!apparatus}
          >
            +Apparatus Difficulty
          </Button>
          <Button onClick={onSkip} variant="outline" className="w-64">
            Skip Apparatus Handling
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
