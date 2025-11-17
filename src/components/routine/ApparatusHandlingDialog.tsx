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
    onSelectApparatusDifficulty();
    onOpenApparatusDialog();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apparatus Handling</DialogTitle>
          <DialogDescription>
            Please select at least 1 apparatus technical element or apparatus difficulty to make DB valid.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button onClick={onSelectTechnicalElements} className="w-full sm:w-auto">
            +Technical Elements
          </Button>
          <Button 
            onClick={handleApparatusDifficultyClick} 
            className="w-full sm:w-auto"
            disabled={!apparatus}
          >
            +Apparatus Difficulty
          </Button>
          <Button onClick={onSkip} variant="outline" className="w-full sm:w-auto">
            Skip Apparatus Handling
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
