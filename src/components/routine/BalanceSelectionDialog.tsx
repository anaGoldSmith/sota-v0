import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BalanceIcon } from "@/components/icons/DbSymbols";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApparatusHandlingDialog } from "./ApparatusHandlingDialog";
import { ApparatusType } from "@/types/apparatus";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Balance {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  symbol_image: string | null;
}

interface BalanceSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBalance: (balance: Balance, withApparatusHandling?: boolean) => void;
  apparatus: ApparatusType | null;
  onOpenApparatusDialog: () => void;
  selectedBalanceIds?: Set<string>;
  shouldReopenApparatusHandling?: boolean;
  onApparatusHandlingReopened?: () => void;
  elementsWithoutApparatusHandling?: Set<string>;
  onMarkWithoutApparatusHandling?: (id: string) => void;
  onRemoveElement?: (id: string) => void;
}

export const BalanceSelectionDialog = ({
  open,
  onOpenChange,
  onSelectBalance,
  apparatus,
  onOpenApparatusDialog,
  selectedBalanceIds,
  shouldReopenApparatusHandling = false,
  onApparatusHandlingReopened,
  elementsWithoutApparatusHandling,
  onMarkWithoutApparatusHandling,
  onRemoveElement
}: BalanceSelectionDialogProps) => {
  const [searchText, setSearchText] = useState("");
  const [selectedBalances, setSelectedBalances] = useState<Set<string>>(selectedBalanceIds || new Set());
  const [showApparatusHandling, setShowApparatusHandling] = useState(false);
  const [pendingBalance, setPendingBalance] = useState<Balance | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [balanceToRemove, setBalanceToRemove] = useState<Balance | null>(null);

  // Watch for signal to reopen apparatus handling dialog
  useEffect(() => {
    if (open && shouldReopenApparatusHandling) {
      setShowApparatusHandling(true);
      onApparatusHandlingReopened?.();
    }
  }, [open, shouldReopenApparatusHandling, onApparatusHandlingReopened]);

  const {
    data: balances,
    isLoading,
    error
  } = useQuery({
    queryKey: ["balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("balances")
        .select("*")
        .order("code", { ascending: true });
      if (error) throw error;
      return data as Balance[];
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const parseBalanceCode = (code: string) => {
    const parts = code.split('.');
    if (parts.length !== 2 || parts[0] !== '2') return null;
    const afterDot = parts[1];
    if (afterDot.length < 3) return null;
    const rowNumber = parseInt(afterDot.slice(0, -2));
    const valueCode = afterDot.slice(-2);
    const value = parseFloat(`0.${valueCode}`);
    return { rowNumber, value };
  };

  const { matrix, rowNumbers, values } = useMemo(() => {
    if (!balances) return { matrix: new Map(), rowNumbers: [], values: [] };

    const filtered = balances.filter(balance => {
      if (searchText === "") return true;
      return balance.code.toLowerCase().includes(searchText.toLowerCase()) ||
        balance.description.toLowerCase().includes(searchText.toLowerCase()) ||
        (balance.name && balance.name.toLowerCase().includes(searchText.toLowerCase()));
    });

    const matrixMap = new Map<number, Map<number, Balance>>();
    const valueSet = new Set<number>();

    filtered.forEach(balance => {
      const parsed = parseBalanceCode(balance.code);
      if (!parsed) return;
      const { rowNumber, value } = parsed;
      if (!matrixMap.has(rowNumber)) {
        matrixMap.set(rowNumber, new Map());
      }
      matrixMap.get(rowNumber)!.set(value, balance);
      valueSet.add(value);
    });

    const sortedRows = Array.from(matrixMap.keys()).sort((a, b) => a - b);
    const sortedValues = Array.from(valueSet).sort((a, b) => a - b);

    return { matrix: matrixMap, rowNumbers: sortedRows, values: sortedValues };
  }, [balances, searchText]);

  const getRowDescription = (rowNumber: number) => {
    const rowBalances = matrix.get(rowNumber);
    if (!rowBalances) return "";
    const firstBalance = Array.from(rowBalances.values())[0] as Balance | undefined;
    return firstBalance?.description || "";
  };

  const handleBalanceToggle = (balance: Balance) => {
    const isCurrentlySelected = selectedBalances.has(balance.id);
    const isPreviouslySelected = selectedBalanceIds ? selectedBalanceIds.has(balance.id) : false;
    
    if (isCurrentlySelected || isPreviouslySelected) {
      // If already selected (locally or in parent), show confirmation dialog
      setBalanceToRemove(balance);
      setShowRemoveDialog(true);
    } else {
      // If not selected, show apparatus handling dialog
      setPendingBalance(balance);
      setShowApparatusHandling(true);
    }
  };

  const handleConfirmRemove = () => {
    if (balanceToRemove) {
      // Deselect from local state
      setSelectedBalances(prev => {
        const newSet = new Set(prev);
        newSet.delete(balanceToRemove.id);
        return newSet;
      });
      
      // Remove from calculator
      onRemoveElement?.(balanceToRemove.id);
      
      // Clear the pending removal
      setBalanceToRemove(null);
    }
    setShowRemoveDialog(false);
  };

  const handleCancelRemove = () => {
    setBalanceToRemove(null);
    setShowRemoveDialog(false);
  };

  const handleApparatusHandlingComplete = (isApparatusDifficulty: boolean = false) => {
    if (pendingBalance) {
      setSelectedBalances(prev => {
        const newSet = new Set(prev);
        newSet.add(pendingBalance.id);
        return newSet;
      });
      
      // If user chose apparatus difficulty, add balance with apparatus handling flag
      if (isApparatusDifficulty) {
        onSelectBalance(pendingBalance, true);
        // Reset and close
        setSelectedBalances(new Set());
        setSearchText("");
        onOpenChange(false);
      }
      
      setPendingBalance(null);
    }
    setShowApparatusHandling(false);
  };

  const handleSkipApparatusHandling = () => {
    if (pendingBalance) {
      // Mark this element as saved without apparatus handling
      onMarkWithoutApparatusHandling?.(pendingBalance.id);
      
      // Add the balance to the routine calculator without apparatus handling
      onSelectBalance(pendingBalance, false);
      
      // Don't add to local selectedBalances state to avoid duplication when "Add to Routine" is clicked
      // The element will still show as previously selected via selectedBalanceIds prop
      
      setPendingBalance(null);
    }
    setShowApparatusHandling(false);
  };

  const handleConfirmSelection = () => {
    // Add all locally selected balances to the routine
    const selectedBalanceObjects = balances?.filter(b => selectedBalances.has(b.id)) || [];
    selectedBalanceObjects.forEach(balance => onSelectBalance(balance));
    
    // Reset and close (elements skipped via apparatus handling are already added)
    setSelectedBalances(new Set());
    setSearchText("");
    onOpenChange(false);
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedBalances(new Set());
      setSearchText("");
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-7xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BalanceIcon className="!h-6 !w-6" />
            Select Balance
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="search">Search by balance name or value</Label>
          <Input
            id="search"
            placeholder="Type to search..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isLoading ? "Loading..." : `${rowNumbers.length} balance type${rowNumbers.length !== 1 ? 's' : ''} found`}
          </span>
          {selectedBalances.size > 0 && (
            <span className="font-medium text-foreground">
              {selectedBalances.size} balance{selectedBalances.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        <div className="border rounded-md flex-1 min-h-0 relative">
          <div className="h-[50vh] overflow-x-auto overflow-y-auto [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-background">
                <TableRow>
                  <TableHead className="sticky left-0 z-30 bg-background min-w-[300px] border-r">
                    Types of balances
                  </TableHead>
                  {values.map(value => (
                    <TableHead key={value} className="text-center min-w-[120px]">
                      {value.toFixed(2)} p.
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={values.length + 1} className="text-center py-8">
                      Loading balances...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={values.length + 1} className="text-center py-8">
                      <div className="space-y-2">
                        <p className="text-destructive font-medium">Failed to load balances</p>
                        <p className="text-sm text-muted-foreground">Please try again</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rowNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={values.length + 1} className="text-center py-8 text-muted-foreground">
                      No balances found matching your search
                    </TableCell>
                  </TableRow>
                ) : (
                  rowNumbers.map(rowNumber => (
                    <TableRow key={rowNumber}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium border-r text-sm">
                        {getRowDescription(rowNumber)}
                      </TableCell>
                       {values.map(value => {
                        const balance = matrix.get(rowNumber)?.get(value);
                        const isSelected = balance ? selectedBalances.has(balance.id) : false;
                        const isPreviouslySelected = balance && selectedBalanceIds ? selectedBalanceIds.has(balance.id) : false;
                        const isWithoutApparatusHandling = balance && elementsWithoutApparatusHandling ? elementsWithoutApparatusHandling.has(balance.id) : false;
                        return (
                          <TableCell
                            key={`${rowNumber}-${value}`}
                            className={`text-center p-3 relative ${
                              balance
                                ? `cursor-pointer transition-colors ${
                                    isWithoutApparatusHandling 
                                      ? 'ring-2 ring-red-600 bg-red-100 dark:bg-red-900/40'
                                      : isSelected || isPreviouslySelected
                                        ? 'bg-primary/20 hover:bg-primary/30 ring-2 ring-primary ring-inset'
                                        : 'hover:bg-accent/50'
                                  }`
                                : 'bg-muted/30'
                            }`}
                            onClick={() => balance && handleBalanceToggle(balance)}
                          >
                            {balance ? (
                              <div className="flex flex-col items-center gap-1">
                                 <div className="w-16 h-16 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground mb-1 relative">
                                  Symbol
                                  {(isSelected || isPreviouslySelected) && (
                                    <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  )}
                                </div>
                                <Badge variant={isSelected ? "default" : "secondary"} className="font-mono text-xs">
                                  {balance.code}
                                </Badge>
                              </div>
                            ) : null}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleDialogChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSelection}>
            {selectedBalances.size > 0 
              ? `Add ${selectedBalances.size} Balance${selectedBalances.size !== 1 ? 's' : ''} to Routine`
              : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ApparatusHandlingDialog
        open={showApparatusHandling}
        onOpenChange={setShowApparatusHandling}
        onSelectTechnicalElements={() => handleApparatusHandlingComplete(false)}
        onSelectApparatusDifficulty={() => handleApparatusHandlingComplete(true)}
        onSkip={handleSkipApparatusHandling}
        apparatus={apparatus}
        onOpenApparatusDialog={onOpenApparatusDialog}
        sourceElementType="balance"
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
    </Dialog>
  );
};
