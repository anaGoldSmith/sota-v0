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

      // Validate that each row has exactly 2 criteria selected
      const invalidRows: string[] = [];
      combinationsByRow.forEach((criteriaList, rowId) => {
        if (criteriaList.length !== 2) {
          const element = apparatusData.find(e => e.id === rowId);
          if (element) {
            invalidRows.push(element.description);
          }
        }
      });

      if (invalidRows.length > 0) {
        toast({
          title: "Invalid selection",
          description: "Two criteria should be selected for one apparatus base to create a valid DA.",
          variant: "destructive",
        });
        return;
      }

      const combinations: ApparatusCombination[] = [];
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
            Select {apparatus ? apparatus.charAt(0).toUpperCase() + apparatus.slice(1) : 'Apparatus'} Difficulty Elements
          </DialogTitle>
          <DialogDescription>
            Click on rows to select apparatus difficulty elements for your routine
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Click on "v" cells to select difficulty criteria combinations. Selected: {selectedCriteria.length}
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
                Add Selected ({selectedCriteria.length})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
