import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

interface DBSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMoreElements: () => void;
  onReturnToCalculator: () => void;
}

export const DBSuccessDialog = ({
  open,
  onOpenChange,
  onAddMoreElements,
  onReturnToCalculator
}: DBSuccessDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-center mb-2">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Congratulations!</DialogTitle>
          <DialogDescription className="text-center">
            Valid DB with DA was created.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button onClick={onAddMoreElements} className="w-full sm:w-auto">
            +Add More Elements
          </Button>
          <Button onClick={onReturnToCalculator} variant="outline" className="w-full sm:w-auto">
            Return to Routine Calculator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
