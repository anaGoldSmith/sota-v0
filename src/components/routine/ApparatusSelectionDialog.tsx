import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ApparatusType, CombinedApparatusData } from "@/types/apparatus";
import { useApparatusData } from "@/hooks/useApparatusData";
import { ApparatusTable, SelectedCriterion } from "./ApparatusTable";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
      const validPairs: { rowId: string, criteria: string[] }[] = [];
      const needsPairingRows: { rowId: string, criterion: string, element: CombinedApparatusData, isSpecialCode: boolean }[] = [];
      const invalidRows: string[] = [];

      combinationsByRow.forEach((criteriaList, rowId) => {
        const element = apparatusData.find(e => e.id === rowId);
        if (!element) return;
        
        const isSpecialCode = specialCodes.includes(element.code);
        
        // Group criteria into pairs - each pair forms one DA
        const numCompletePairs = Math.floor(criteriaList.length / 2);
        
        if (numCompletePairs > 0) {
          // Create pairs of criteria
          for (let i = 0; i < numCompletePairs; i++) {
            const pairCriteria = [criteriaList[i * 2], criteriaList[i * 2 + 1]];
            validPairs.push({ rowId, criteria: pairCriteria });
          }
        }
        
        // If there's an odd criterion left, it may need pairing
        if (criteriaList.length % 2 === 1) {
          needsPairingRows.push({
            rowId,
            criterion: criteriaList[criteriaList.length - 1],
            element,
            isSpecialCode
          });
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

      const combinations: ApparatusCombination[] = [];
      
      // First, process all standard DAs (pairs of criteria in same row)
      validPairs.forEach(({ rowId, criteria }) => {
        const element = apparatusData.find(e => e.id === rowId);
        if (element && apparatus) {
          combinations.push({
            element,
            selectedCriteria: criteria,
            apparatus
          });
        }
      });
      
      // Then, process special pairing if exists (2 rows with 1 criterion each)
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

  // Get the proper storage URL for base symbols
  const getBaseSymbol = (filename: string | null) => {
    if (!filename || !apparatus) return null;
    
    const bucketName = `${apparatus}-bases-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);
    
    return publicUrl;
  };

  // Get special codes for the current apparatus
  const getSpecialCodes = () => {
    if (!apparatus) return [];
    const specialCodesMap: Record<ApparatusType, string[]> = {
      hoop: ['H13'],
      ball: ['B2', 'B10'],
      clubs: ['CL13', 'CL14', 'CL15'],
      ribbon: ['RIB14'],
    };
    return specialCodesMap[apparatus] || [];
  };

  const specialCodes = getSpecialCodes();
  const specialElements = apparatusData.filter(item => specialCodes.includes(item.code));

  // Color palette for DA groups (15 distinct colors)
  const DA_COLORS = [
    'border-purple-500',
    'border-blue-500',
    'border-rose-500',
    'border-green-500',
    'border-orange-500',
    'border-cyan-500',
    'border-pink-500',
    'border-indigo-500',
    'border-yellow-500',
    'border-teal-500',
    'border-red-500',
    'border-lime-500',
    'border-violet-500',
    'border-amber-500',
    'border-emerald-500',
  ];

  // Analyze selected criteria to identify DA groups
  const analyzeDaGroups = () => {
    const daGroups: { cells: SelectedCriterion[], color: string }[] = [];
    
    // Group selected criteria by row
    const combinationsByRow = new Map<string, string[]>();
    selectedCriteria.forEach(sc => {
      if (!combinationsByRow.has(sc.rowId)) {
        combinationsByRow.set(sc.rowId, []);
      }
      combinationsByRow.get(sc.rowId)!.push(sc.criterionCode);
    });

    // Find rows with 2+ criteria (Type 1 DAs) and rows with 1 criterion (potential Type 2 DAs)
    const needsPairingRows: { rowId: string, criterion: string }[] = [];
    
    combinationsByRow.forEach((criteriaList, rowId) => {
      const element = apparatusData.find(e => e.id === rowId);
      if (!element) return;
      
      if (criteriaList.length >= 2) {
        // Create multiple DAs from this row, grouping criteria into pairs
        // Each pair of criteria forms one DA
        const numCompleteDAs = Math.floor(criteriaList.length / 2);
        
        for (let i = 0; i < numCompleteDAs; i++) {
          const pairCriteria = [criteriaList[i * 2], criteriaList[i * 2 + 1]];
          const cells = pairCriteria.map(criterion => ({ rowId, criterionCode: criterion }));
          const colorIndex = daGroups.length % DA_COLORS.length;
          daGroups.push({ cells, color: DA_COLORS[colorIndex] });
        }
        
        // If there's an odd criterion left, add it to needsPairingRows
        if (criteriaList.length % 2 === 1) {
          needsPairingRows.push({ rowId, criterion: criteriaList[criteriaList.length - 1] });
        }
      } else if (criteriaList.length === 1) {
        needsPairingRows.push({ rowId, criterion: criteriaList[0] });
      }
    });

    // Find criterion-based pairs (Type 2 DAs)
    if (needsPairingRows.length === 2 && needsPairingRows[0].criterion === needsPairingRows[1].criterion) {
      const hasSpecialCode = needsPairingRows.some(row => {
        const element = apparatusData.find(e => e.id === row.rowId);
        return element && specialCodes.includes(element.code);
      });
      
      if (hasSpecialCode) {
        // Add these paired cells as a DA group with unique color
        const cells = needsPairingRows.map(row => ({ rowId: row.rowId, criterionCode: row.criterion }));
        const colorIndex = daGroups.length % DA_COLORS.length;
        daGroups.push({ cells, color: DA_COLORS[colorIndex] });
      }
    }

    return daGroups;
  };

  const daGroups = analyzeDaGroups();
  const daCount = daGroups.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">
            Select Difficulty of Apparatus for {apparatus ? apparatus.charAt(0).toUpperCase() + apparatus.slice(1) : 'Apparatus'}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <span>
              To create a valid DA, choose one base with two criteria by clicking on two "v" cells in the same row. Or, choose the base "Catch from High Throw" with one criterion and another base with the same criterion — in this case, DA value = (highest base value) + 0.1.
            </span>
            {specialElements.length > 0 && (
              <span className="inline-flex items-center gap-2 text-xs">
                <span>*For {apparatus ? apparatus.charAt(0).toUpperCase() + apparatus.slice(1) : 'apparatus'} DAs "Catch from High Throw" is valid for</span>
                {specialElements.map((element, index) => (
                  <React.Fragment key={element.id}>
                    <span className="inline-flex items-center">
                      {element.symbol_image && (
                        <img 
                          src={getBaseSymbol(element.symbol_image) || ''} 
                          alt={element.code}
                          className="h-12 w-auto inline-block align-middle"
                          onError={(e) => {
                            console.error('Failed to load symbol:', element.symbol_image);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </span>
                    {index < specialElements.length - 1 && (
                      index === specialElements.length - 2 ? 
                        <span className="mx-1">and</span> : 
                        <span className="mx-1">,</span>
                    )}
                  </React.Fragment>
                ))}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <ApparatusTable
              data={apparatusData}
              criteria={criteria}
              selectedIds={selectedIds}
              onRowClick={handleRowClick}
              apparatus={apparatus!}
              selectedCriteria={selectedCriteria}
              onCriteriaChange={setSelectedCriteria}
              daGroups={daGroups}
            />

            <div className="flex justify-end gap-3 pt-4 flex-shrink-0">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleAddSelected} disabled={selectedCriteria.length === 0}>
                Add Selected {daCount > 0 && `(${daCount} DA${daCount > 1 ? 's' : ''})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
