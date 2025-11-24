import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

interface DBDASuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeDA: () => void;
  onSaveCombination: () => void;
  dbSymbols: string[];
  daSymbols: string[];
}

export const DBDASuccessDialog = ({
  open,
  onOpenChange,
  onChangeDA,
  onSaveCombination,
  dbSymbols,
  daSymbols
}: DBDASuccessDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-center mb-2">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">Congratulations!</DialogTitle>
          <DialogDescription className="text-center">
            You created a valid DB with DA
          </DialogDescription>
        </DialogHeader>
        
        {/* Display DB and DA symbols */}
        <div className="flex flex-col gap-4 items-center py-4">
          <div className="flex flex-wrap gap-2 items-center justify-center">
            {/* DB Symbols */}
            {dbSymbols.map((symbol, index) => (
              <div key={`db-${index}`} className="flex items-center justify-center">
                <img 
                  src={symbol} 
                  alt={`DB symbol ${index + 1}`}
                  className="w-16 h-16 object-contain"
                />
              </div>
            ))}
            
            {/* Plus sign separator */}
            {dbSymbols.length > 0 && daSymbols.length > 0 && (
              <span className="text-2xl font-bold text-muted-foreground mx-2">+</span>
            )}
            
            {/* DA Symbols */}
            {daSymbols.map((symbol, index) => (
              <div key={`da-${index}`} className="flex items-center justify-center">
                {symbol.startsWith('TEXT:') ? (
                  <span className="text-5xl font-bold">
                    {symbol.replace('TEXT:', '')}
                  </span>
                ) : (
                  <img 
                    src={symbol} 
                    alt={`DA symbol ${index + 1}`}
                    className="w-16 h-16 object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          <Button onClick={onChangeDA} variant="outline" className="w-full sm:w-auto">
            Change DA
          </Button>
          <Button onClick={onSaveCombination} className="w-full sm:w-auto">
            Save Combo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
