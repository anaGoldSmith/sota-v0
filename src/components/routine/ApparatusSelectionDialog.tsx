import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ApparatusType, CombinedApparatusData } from "@/types/apparatus";
import { useApparatusData } from "@/hooks/useApparatusData";
import { ApparatusTable, SelectedCriterion } from "./ApparatusTable";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export interface ApparatusCombination {
  element: CombinedApparatusData;
  selectedCriteria: string[];
  apparatus: ApparatusType;
  calculatedValue?: number; // Used for special pairing rule (max value + 0.1)
}

interface ApparatusSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apparatus: ApparatusType | null;
  onSelectElements: (elements: CombinedApparatusData[]) => void;
  onSelectCombinations?: (combinations: ApparatusCombination[]) => void;
}

export const ApparatusSelectionDialog = ({
  open,
  onOpenChange,
  apparatus,
  onSelectElements,
  onSelectCombinations,
}: ApparatusSelectionDialogProps) => {
  const { apparatusData, criteria, isLoading } = useApparatusData(apparatus);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<SelectedCriterion[]>([]);
  const { toast } = useToast();

  const handleRowClick = (item: CombinedApparatusData) => {
    setSelectedIds((prev) => {
      if (prev.includes(item.id)) {
        return prev.filter((id) => id !== item.id);
      }
      return [...prev, item.id];
    });
  };

  const handleAddSelected = () => {
    // If using criterion-level selection
    if (onSelectCombinations && selectedCriteria.length > 0) {
      // Group selected criteria by row
      const combinationsByRow = new Map<string, string[]>();
      selectedCriteria.forEach(sc => {
        if (!combinationsByRow.has(sc.rowId)) {
          combinationsByRow.set(sc.rowId, []);
        }
        combinationsByRow.get(sc.rowId)!.push(sc.criterionCode);
      });

      // Special codes that can be paired with 1 matching criterion
      const specialCodes = ['B2', 'B10', 'H13', 'CL13', 'CL14', 'CL15', 'RIB14'];
      
      // Categorize rows based on validation rules
      const validStandaloneRows: string[] = [];
      const needsPairingRows: { rowId: string, criterion: string, element: CombinedApparatusData, isSpecialCode: boolean }[] = [];
      const invalidRows: string[] = [];

      combinationsByRow.forEach((criteriaList, rowId) => {
        const element = apparatusData.find(e => e.id === rowId);
        if (!element) return;
        
        const isSpecialCode = specialCodes.includes(element.code);
        
        if (criteriaList.length === 2) {
          // Valid standalone (works for all codes)
          validStandaloneRows.push(rowId);
        } else if (criteriaList.length === 1) {
          // Any row with 1 criterion - may need pairing
          needsPairingRows.push({
            rowId,
            criterion: criteriaList[0],
            element,
            isSpecialCode
          });
        } else {
          // Invalid: wrong number of criteria (0 or more than 2)
          invalidRows.push(element.description);
        }
      });

      // Validate pairing if there are rows that need pairing
      if (needsPairingRows.length > 0) {
        // Check if at least one row has a special code
        const hasSpecialCode = needsPairingRows.some(row => row.isSpecialCode);
        
        if (!hasSpecialCode) {
          toast({
            title: "Invalid selection",
            description: "Two criteria should be selected for one apparatus base to create a valid DA, or select a special code (B2, B10, H13, CL13, CL14, CL15, RIB14) with one criterion and pair it with another row with the same criterion.",
            variant: "destructive",
          });
          return;
        }
        
        if (needsPairingRows.length !== 2) {
          toast({
            title: "Invalid selection",
            description: "For special codes with one criterion selected, you must select exactly one more row with the same matching criterion.",
            variant: "destructive",
          });
          return;
        }
        
        if (needsPairingRows[0].criterion !== needsPairingRows[1].criterion) {
          toast({
            title: "Invalid selection",
            description: "Both rows must have the same criterion selected to form a valid pair.",
            variant: "destructive",
          });
          return;
        }
      }

      // Check for any invalid rows
      if (invalidRows.length > 0) {
        toast({
          title: "Invalid selection",
          description: "Two criteria should be selected for one apparatus base to create a valid DA.",
          variant: "destructive",
        });
        return;
      }

      const combinations: ApparatusCombination[] = [];
      
      // Check if this is a special pairing (2 rows with 1 criterion each)
      const isSpecialPairing = needsPairingRows.length === 2;
      
      if (isSpecialPairing) {
        // Calculate special value: max(value1, value2) + 0.1
        const value1 = needsPairingRows[0].element.value;
        const value2 = needsPairingRows[1].element.value;
        const calculatedValue = Math.max(value1, value2) + 0.1;
        
        // Create combinations with the calculated value
        needsPairingRows.forEach(({ rowId, criterion, element }) => {
          if (apparatus) {
            combinations.push({
              element,
              selectedCriteria: [criterion],
              apparatus,
              calculatedValue
            });
          }
        });
      } else {
        // Standard rule: each row has 2 criteria
        combinationsByRow.forEach((criteriaList, rowId) => {
          const element = apparatusData.find(e => e.id === rowId);
          if (element && apparatus) {
            combinations.push({
              element,
              selectedCriteria: criteriaList,
              apparatus
            });
          }
        });
      }

      if (combinations.length === 0) {
        toast({
          title: "No criteria selected",
          description: "Please select at least one criterion (v) to add.",
          variant: "destructive",
        });
        return;
      }

      onSelectCombinations(combinations);
      setSelectedCriteria([]);
      onOpenChange(false);
      
      toast({
        title: "Combinations added",
        description: `Added ${combinations.length} apparatus combination${combinations.length > 1 ? 's' : ''} to routine.`,
      });
      return;
    }

    // Legacy: whole element selection
    const selectedElements = apparatusData.filter((item) => selectedIds.includes(item.id));
    
    if (selectedElements.length === 0) {
      toast({
        title: "No elements selected",
        description: "Please select at least one element to add.",
        variant: "destructive",
      });
      return;
    }

    onSelectElements(selectedElements);
    setSelectedIds([]);
    onOpenChange(false);
    
    toast({
      title: "Elements added",
      description: `Added ${selectedElements.length} apparatus element${selectedElements.length > 1 ? 's' : ''} to routine.`,
    });
  };

  const handleCancel = () => {
    setSelectedIds([]);
    setSelectedCriteria([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Select Difficulty of Apparatus for {apparatus ? apparatus.charAt(0).toUpperCase() + apparatus.slice(1) : 'Apparatus'}
          </DialogTitle>
          <DialogDescription>
            To create a valid DA, choose one base with two criteria by clicking on two "v" cells in the same row. Or, choose the base "Catch from High Throw" with one criterion and another base with the same criterion — in this case, DA value = (highest base value) + 0.1.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Click on "v" cells to select difficulty criteria combinations. Selected rows: {new Set(selectedCriteria.map(sc => sc.rowId)).size}
            </div>

            <ApparatusTable
              data={apparatusData}
              criteria={criteria}
              selectedIds={selectedIds}
              onRowClick={handleRowClick}
              apparatus={apparatus!}
              selectedCriteria={selectedCriteria}
              onCriteriaChange={setSelectedCriteria}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleAddSelected} disabled={selectedCriteria.length === 0}>
                Add Selected ({new Set(selectedCriteria.map(sc => sc.rowId)).size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
