import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Handling for {elementName}</DialogTitle>
          <DialogDescription>
            View and modify apparatus handling for this element.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h4 className="text-sm font-medium mb-3">Current Handling:</h4>
          <div className="min-h-[60px] border rounded-md p-3 flex items-center justify-center bg-muted/30">
            {handlingSymbols || <span className="text-sm text-muted-foreground">No handling assigned</span>}
          </div>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-between">
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Change Handling
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAddTechnicalElements}>
                + Technical Elements
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddApparatusDifficulty}>
                + Apparatus Difficulty
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
