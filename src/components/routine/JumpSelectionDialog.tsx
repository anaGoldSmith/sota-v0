import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JumpIcon } from "@/components/icons/DbSymbols";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApparatusHandlingDialog } from "./ApparatusHandlingDialog";
import { ApparatusType } from "@/types/apparatus";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExistingHandlingDialog } from "./ExistingHandlingDialog";

interface Jump {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
  symbol_image: string | null;
}
interface JumpSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectJump: (jump: Jump, withApparatusHandling?: boolean, modifyingElementId?: string) => void;
  apparatus: ApparatusType | null;
  onOpenApparatusDialog: () => void;
  onOpenTechnicalElementsDialog: () => void;
  selectedJumpIds?: Set<string>;
  shouldReopenApparatusHandling?: boolean;
  onApparatusHandlingReopened?: () => void;
  elementsWithoutApparatusHandling?: Set<string>;
  onMarkWithoutApparatusHandling?: (id: string) => void;
  onRemoveElement?: (id: string) => void;
  routineElementsMap?: Map<string, string>; // Maps jump ID to routineElement ID
  routineElements?: Array<{
    id: string;
    symbolImages: string[];
    type: string;
  }>;
}
export const JumpSelectionDialog = ({
  open,
  onOpenChange,
  onSelectJump,
  apparatus,
  onOpenApparatusDialog,
  onOpenTechnicalElementsDialog,
  selectedJumpIds,
  shouldReopenApparatusHandling = false,
  onApparatusHandlingReopened,
  elementsWithoutApparatusHandling,
  onMarkWithoutApparatusHandling,
  onRemoveElement,
  routineElementsMap,
  routineElements
}: JumpSelectionDialogProps) => {
  const [searchText, setSearchText] = useState("");
  const [selectedJumps, setSelectedJumps] = useState<Set<string>>(selectedJumpIds || new Set());
  const [showApparatusHandling, setShowApparatusHandling] = useState(false);
  const [pendingJump, setPendingJump] = useState<Jump | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [jumpToRemove, setJumpToRemove] = useState<Jump | null>(null);
  const [showExistingHandling, setShowExistingHandling] = useState(false);
  const [existingHandlingJump, setExistingHandlingJump] = useState<Jump | null>(null);

  // Watch for signal to reopen apparatus handling dialog
  useEffect(() => {
    if (open && shouldReopenApparatusHandling) {
      setShowApparatusHandling(true);
      onApparatusHandlingReopened?.();
    }
  }, [open, shouldReopenApparatusHandling, onApparatusHandlingReopened]);

  // Sync selectedJumps with parent's selectedJumpIds when dialog opens
  useEffect(() => {
    if (open) {
      // Don't override local selections, just ensure we're aware of parent state
    }
  }, [open, selectedJumpIds]);

  // Fetch all jumps
  const {
    data: jumps,
    isLoading,
    error
  } = useQuery({
    queryKey: ["jumps"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("jumps").select("*").order("code", {
        ascending: true
      });
      if (error) throw error;
      return data as Jump[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Parse jump code to extract row number and value
  const parseJumpCode = (code: string) => {
    const parts = code.split('.');
    if (parts.length !== 2 || parts[0] !== '1') return null;
    const afterDot = parts[1];
    if (afterDot.length < 3) return null;
    const rowNumber = parseInt(afterDot.slice(0, -2));
    const valueCode = afterDot.slice(-2);
    const value = parseFloat(`0.${valueCode}`);
    return {
      rowNumber,
      value
    };
  };

  // Build matrix structure and filter based on search
  const {
    matrix,
    rowNumbers,
    values
  } = useMemo(() => {
    if (!jumps) return {
      matrix: new Map(),
      rowNumbers: [],
      values: []
    };

    // Filter jumps based on search text
    const filtered = jumps.filter(jump => {
      if (searchText === "") return true;
      return jump.code.toLowerCase().includes(searchText.toLowerCase()) || jump.description.toLowerCase().includes(searchText.toLowerCase()) || jump.name && jump.name.toLowerCase().includes(searchText.toLowerCase());
    });
    const matrixMap = new Map<number, Map<number, Jump>>();
    const valueSet = new Set<number>();
    filtered.forEach(jump => {
      const parsed = parseJumpCode(jump.code);
      if (!parsed) return;
      const {
        rowNumber,
        value
      } = parsed;
      if (!matrixMap.has(rowNumber)) {
        matrixMap.set(rowNumber, new Map());
      }
      matrixMap.get(rowNumber)!.set(value, jump);
      valueSet.add(value);
    });
    const sortedRows = Array.from(matrixMap.keys()).sort((a, b) => a - b);
    const sortedValues = Array.from(valueSet).sort((a, b) => a - b);
    return {
      matrix: matrixMap,
      rowNumbers: sortedRows,
      values: sortedValues
    };
  }, [jumps, searchText]);

  // Get description for a row (from the first jump in that row)
  const getRowDescription = (rowNumber: number) => {
    const rowJumps = matrix.get(rowNumber);
    if (!rowJumps) return "";
    const firstJump = Array.from(rowJumps.values())[0] as Jump | undefined;
    return firstJump?.description || "";
  };
  const handleJumpClick = (jump: Jump) => {
    const isCurrentlySelected = selectedJumps.has(jump.id);
    const isPreviouslySelected = selectedJumpIds ? selectedJumpIds.has(jump.id) : false;
    
    if (isCurrentlySelected || isPreviouslySelected) {
      // If already selected, show confirmation dialog to remove
      setJumpToRemove(jump);
      setShowRemoveDialog(true);
    } else {
      // If not selected, select it immediately and show apparatus handling dialog
      setSelectedJumps(prev => {
        const newSet = new Set(prev);
        newSet.add(jump.id);
        return newSet;
      });
      setPendingJump(jump);
      setShowApparatusHandling(true);
    }
  };

  const handleExistingHandling = (jump: Jump) => {
    setExistingHandlingJump(jump);
    setShowExistingHandling(true);
  };

  // Function to render symbol images for existing handling
  const renderHandlingSymbols = (jump: Jump | null) => {
    if (!jump || !routineElementsMap || !routineElements) {
      return <span className="text-sm text-muted-foreground">No handling assigned</span>;
    }
    
    // Find the routine element for this jump
    const routineElementId = routineElementsMap.get(jump.id);
    if (!routineElementId) {
      return <span className="text-sm text-muted-foreground">No handling assigned</span>;
    }
    
    // Find the actual routine element
    const routineElement = routineElements.find(el => el.id === routineElementId);
    if (!routineElement || !routineElement.symbolImages || routineElement.symbolImages.length === 0) {
      return <span className="text-sm text-muted-foreground">No handling assigned</span>;
    }
    
    // Render symbols
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {routineElement.symbolImages.map((url, imgIndex) => {
          // Check if this is a text-based symbol (W or DB)
          const isTextSymbol = url && url.startsWith('TEXT:');
          
          if (isTextSymbol) {
            // Extract the text after 'TEXT:'
            const text = url.replace('TEXT:', '');
            return (
              <div 
                key={`symbol-${imgIndex}`}
                className="h-8 w-8 flex items-center justify-center"
              >
                <span className="text-2xl font-bold">{text}</span>
              </div>
            );
          }
          
          // Render as image
          return url && (
            <img
              key={`symbol-${imgIndex}`}
              src={url}
              alt="Symbol"
              className="h-8 w-8 object-contain"
            />
          );
        })}
      </div>
    );
  };

  const handleConfirmRemove = () => {
    if (jumpToRemove) {
      // Deselect from local state
      setSelectedJumps(prev => {
        const newSet = new Set(prev);
        newSet.delete(jumpToRemove.id);
        return newSet;
      });
      
      // Remove from calculator
      onRemoveElement?.(jumpToRemove.id);
      
      // Clear the pending removal
      setJumpToRemove(null);
    }
    setShowRemoveDialog(false);
  };

  const handleCancelRemove = () => {
    setJumpToRemove(null);
    setShowRemoveDialog(false);
  };

  const handleApparatusHandlingComplete = (isApparatusDifficulty: boolean = false, isTechnicalElements: boolean = false) => {
    if (pendingJump) {
      if (isApparatusDifficulty || isTechnicalElements) {
        // Call onSelectJump to set pendingDbElement in parent for both DA and TE
        onSelectJump(pendingJump, true);
        // Don't close the dialog or clear state yet - DA/TE table will handle that
      } else {
        // For skip, reset and close
        setSelectedJumps(new Set());
        setSearchText("");
        onOpenChange(false);
        setPendingJump(null);
      }
    }
    setShowApparatusHandling(false);
  };

  const handleSkipApparatusHandling = () => {
    if (pendingJump) {
      // Mark this element as saved without apparatus handling
      onMarkWithoutApparatusHandling?.(pendingJump.id);
      
      // Add the jump to the routine calculator without apparatus handling
      onSelectJump(pendingJump, false);
      
      // Remove from local selected state since it's now in the calculator
      setSelectedJumps(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingJump.id);
        return newSet;
      });
      
      setPendingJump(null);
    }
    setShowApparatusHandling(false);
  };
  const handleConfirmSelection = () => {
    const selectedJumpObjects = jumps?.filter(j => selectedJumps.has(j.id)) || [];
    
    // Only add jumps that are NOT already in the routine (not being modified)
    selectedJumpObjects.forEach(jump => {
      const isBeingModified = routineElementsMap?.has(jump.id);
      if (!isBeingModified) {
        onSelectJump(jump);
      }
    });
    
    setSelectedJumps(new Set());
    setSearchText("");
    setPendingJump(null);
    setShowApparatusHandling(false);
    setShowExistingHandling(false);
    onOpenChange(false);
  };
  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedJumps(new Set());
      setSearchText("");
      setPendingJump(null);
      setShowApparatusHandling(false);
      setShowExistingHandling(false);
    }
    onOpenChange(isOpen);
  };
  return <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="max-w-7xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <JumpIcon className="!h-6 !w-6" />
            Select Jump
          </DialogTitle>
        </DialogHeader>

        {/* Search Section */}
        <div className="space-y-2">
          <Label htmlFor="search">Search by jump name or value</Label>
          <Input id="search" placeholder="Type to search..." value={searchText} onChange={e => setSearchText(e.target.value)} />
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isLoading ? "Loading..." : `${rowNumbers.length} jump type${rowNumbers.length !== 1 ? 's' : ''} found`}
          </span>
          {selectedJumps.size > 0 && <span className="font-medium text-foreground">
              {selectedJumps.size} jump{selectedJumps.size !== 1 ? 's' : ''} selected
            </span>}
        </div>

        {/* Matrix Table */}
        <div className="border rounded-md flex-1 min-h-0 relative">
          <div className="h-[50vh] overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-background">
                <TableRow>
                  <TableHead className="sticky left-0 z-30 bg-background min-w-[300px] border-r">
                    Types of jumps/leaps
                  </TableHead>
                  {values.map(value => <TableHead key={value} className="text-center min-w-[120px]">
                      {value.toFixed(2)} p.
                    </TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <TableRow>
                    <TableCell colSpan={values.length + 1} className="text-center py-8">
                      Loading jumps...
                    </TableCell>
                  </TableRow> : error ? <TableRow>
                    <TableCell colSpan={values.length + 1} className="text-center py-8">
                      <div className="space-y-2">
                        <p className="text-destructive font-medium">Failed to load jumps</p>
                        <p className="text-sm text-muted-foreground">Please try again</p>
                      </div>
                    </TableCell>
                  </TableRow> : rowNumbers.length === 0 ? <TableRow>
                    <TableCell colSpan={values.length + 1} className="text-center py-8 text-muted-foreground">
                      No jumps found matching your search
                    </TableCell>
                  </TableRow> : rowNumbers.map(rowNumber => <TableRow key={rowNumber}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium border-r text-sm">
                        {getRowDescription(rowNumber)}
                      </TableCell>
                  {values.map(value => {
                   const jump = matrix.get(rowNumber)?.get(value);
                  const isSelected = jump ? selectedJumps.has(jump.id) : false;
                  const isPreviouslySelected = jump && selectedJumpIds ? selectedJumpIds.has(jump.id) : false;
                  const isWithoutApparatusHandling = jump && elementsWithoutApparatusHandling ? elementsWithoutApparatusHandling.has(jump.id) : false;
                  return <TableCell 
                    key={`${rowNumber}-${value}`} 
                    className={`text-center p-3 relative ${jump ? `${isWithoutApparatusHandling ? 'ring-2 ring-red-600 bg-red-100 dark:bg-red-900/40' : isSelected || isPreviouslySelected ? 'bg-primary/20 hover:bg-primary/30 ring-2 ring-primary ring-inset' : 'hover:bg-accent/50'}` : 'bg-muted/30'}`}
                  >
                            {jump ? <div 
                                className="flex flex-col items-center gap-2 cursor-pointer relative"
                                onClick={() => handleJumpClick(jump)}
                              >
                                {/* Selection circle indicator */}
                                {(isSelected || isPreviouslySelected) && (
                                  <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-md z-10 border-2 border-background">
                                    <Check className="h-4 w-4" />
                                  </div>
                                )}
                                {/* Symbol image */}
                                <div className="w-16 h-16 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground mb-1">
                                  Symbol
                                </div>
                                {/* Turn degrees */}
                                {jump.turn_degrees && jump.turn_degrees !== "NA" && <span className="text-xs text-muted-foreground">
                                    {jump.turn_degrees}°
                                  </span>}
                                {/* Handling button - only show for selected elements */}
                                {(isSelected || isPreviouslySelected) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs px-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExistingHandling(jump);
                                    }}
                                  >
                                    Handling
                                  </Button>
                                )}
                              </div> : null}
                          </TableCell>;
                })}
                    </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleDialogChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSelection}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>

      <ApparatusHandlingDialog
        open={showApparatusHandling}
        onOpenChange={setShowApparatusHandling}
        onSelectTechnicalElements={() => handleApparatusHandlingComplete(false, true)}
        onSelectApparatusDifficulty={() => handleApparatusHandlingComplete(true, false)}
        onSkip={handleSkipApparatusHandling}
        apparatus={apparatus}
        onOpenApparatusDialog={onOpenApparatusDialog}
        onOpenTechnicalElementsDialog={onOpenTechnicalElementsDialog}
        sourceElementType="jump"
      />

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Element?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this element? The element, along with its associated apparatus difficulty, will also be removed from the Routine Calculator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRemove}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>Yes, remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExistingHandlingDialog
        open={showExistingHandling}
        onOpenChange={setShowExistingHandling}
        elementName={existingHandlingJump?.description || ""}
        handlingSymbols={renderHandlingSymbols(existingHandlingJump)}
        onAddTechnicalElements={() => {
          setShowExistingHandling(false);
          // TODO: Implement technical elements flow
        }}
        onAddApparatusDifficulty={() => {
          if (existingHandlingJump) {
            // Get the routineElement ID for this jump
            const routineElementId = routineElementsMap?.get(existingHandlingJump.id);
            // Call the parent's callback to set pendingDbElement with modifying ID
            onSelectJump(existingHandlingJump, true, routineElementId);
            setShowExistingHandling(false);
            // Close the jump dialog so apparatus dialog can open
            onOpenChange(false);
            // Open apparatus dialog
            onOpenApparatusDialog();
          }
        }}
        onCancel={() => setShowExistingHandling(false)}
      />
    </Dialog>
};