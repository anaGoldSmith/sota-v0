import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ExistingHandlingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementName: string;
  handlingSymbols?: React.ReactNode;
  onAddTechnicalElements: () => void;
  onAddApparatusDifficulty: () => void;
  onCancel: () => void;
}

export const ExistingHandlingDialog = ({
  open,
  onOpenChange,
  elementName,
  handlingSymbols,
  onAddTechnicalElements,
  onAddApparatusDifficulty,
  onCancel
}: ExistingHandlingDialogProps) => {
  const [showModifyOptions, setShowModifyOptions] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        setShowModifyOptions(false);
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Current DB Handling</DialogTitle>
          <DialogDescription>
            View and modify apparatus handling for {elementName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h4 className="text-sm font-medium mb-3">Current Handling:</h4>
          <div className="min-h-[60px] border rounded-md p-3 flex items-center justify-center bg-muted/30">
            {handlingSymbols || <span className="text-sm text-muted-foreground">No handling assigned</span>}
          </div>
        </div>

        <DialogFooter>
          <div className="flex flex-col items-center justify-center w-full gap-2">
            {!showModifyOptions ? (
              <Button onClick={() => setShowModifyOptions(true)} className="w-64">
                Modify Handling
              </Button>
            ) : (
              <div className="flex flex-col gap-2 items-center w-full">
                <Button onClick={onAddTechnicalElements} className="w-64">
                  + Technical Elements
                </Button>
                <Button onClick={onAddApparatusDifficulty} className="w-64">
                  + Apparatus Difficulty
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
