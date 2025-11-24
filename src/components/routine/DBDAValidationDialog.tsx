import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DBDAValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onReview: () => void;
}

export const DBDAValidationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  onReview
}: DBDAValidationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-center mb-2">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <DialogTitle className="text-center">Reminder</DialogTitle>
          <DialogDescription className="text-center pt-4">
            You selected a DA that does not include DB as one of its criteria. 
            When assigning DAs to a DB, at least one DA criteria should normally be DB. 
            Are you sure the selection is correct?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button onClick={onReview} variant="outline" className="w-full sm:w-auto">
            Review DA
          </Button>
          <Button onClick={onConfirm} className="w-full sm:w-auto">
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
