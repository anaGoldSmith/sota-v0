import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ApparatusType, CombinedApparatusData } from "@/types/apparatus";
import { useApparatusData } from "@/hooks/useApparatusData";
import { ApparatusTable, SelectedCriterion } from "./ApparatusTable";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
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
  const [lastCompletedDaCount, setLastCompletedDaCount] = useState(0);
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
      // Use analyzeDaGroups to find all valid DAs (including overlapping ones)
      const validDaGroups = analyzeDaGroups();
      
      if (validDaGroups.length === 0) {
        toast({
          title: "Invalid selection",
          description: "Please select criteria that form valid DAs.",
          variant: "destructive",
        });
        return;
      }

      const combinations: ApparatusCombination[] = [];
      
      // Create combinations from each DA group
      validDaGroups.forEach(daGroup => {
        const { cells } = daGroup;
        
        // Check if this is a Type 1 DA (same row) or Type 2 DA (different rows)
        const uniqueRows = new Set(cells.map(c => c.rowId));
        
        if (uniqueRows.size === 1) {
          // Type 1 DA: 2 criteria in same row
          const rowId = cells[0].rowId;
          const element = apparatusData.find(e => e.id === rowId);
          if (element && apparatus) {
            combinations.push({
              element,
              selectedCriteria: cells.map(c => c.criterionCode),
              apparatus
            });
          }
        } else if (uniqueRows.size === 2) {
          // Type 2 DA: same criterion across 2 rows (special code pairing)
          // Calculate special value: max(value1, value2) + 0.1
          const element1 = apparatusData.find(e => e.id === cells[0].rowId);
          const element2 = apparatusData.find(e => e.id === cells[1].rowId);
          
          if (element1 && element2 && apparatus) {
            const calculatedValue = Math.max(element1.value, element2.value) + 0.1;
            const criterion = cells[0].criterionCode; // Same criterion for both
            
            // Create one combination for each row
            combinations.push({
              element: element1,
              selectedCriteria: [criterion],
              apparatus,
              calculatedValue
            });
            combinations.push({
              element: element2,
              selectedCriteria: [criterion],
              apparatus,
              calculatedValue
            });
          }
        }
      });

      if (combinations.length === 0) {
        toast({
          title: "No valid combinations",
          description: "Please select valid criteria to form DAs.",
          variant: "destructive",
        });
        return;
      }

      onSelectCombinations(combinations);
      setSelectedCriteria([]);
      setLastCompletedDaCount(0);
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
    setLastCompletedDaCount(0);
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

  // Analyze selected criteria to identify DA groups with support for overlapping selections
  const analyzeDaGroups = () => {
    const daGroups: { cells: SelectedCriterion[], color: string }[] = [];
    
    // Group selected criteria by row
    const combinationsByRow = new Map<string, SelectedCriterion[]>();
    selectedCriteria.forEach(sc => {
      if (!combinationsByRow.has(sc.rowId)) {
        combinationsByRow.set(sc.rowId, []);
      }
      combinationsByRow.get(sc.rowId)!.push(sc);
    });

    // PHASE 1: Find all Type 1 DAs (2+ criteria in same row)
    // These can use any combination of criteria in the row
    combinationsByRow.forEach((criteriaObjs, rowId) => {
      const element = apparatusData.find(e => e.id === rowId);
      if (!element) return;
      
      const criteriaList = criteriaObjs.map(c => c.criterionCode);
      
      if (criteriaList.length >= 2) {
        // Generate all possible pairs from this row
        for (let i = 0; i < criteriaList.length - 1; i++) {
          for (let j = i + 1; j < criteriaList.length; j++) {
            const pairCriteria = [criteriaList[i], criteriaList[j]];
            const cells = pairCriteria.map(criterion => ({ rowId, criterionCode: criterion }));
            const colorIndex = daGroups.length % DA_COLORS.length;
            daGroups.push({ cells, color: DA_COLORS[colorIndex] });
          }
        }
      }
    });

    // PHASE 2: Find all Type 2 DAs (same criterion across different rows with special code)
    // Group all selected criteria by their criterion code
    const byCriterion = new Map<string, { rowId: string, criterionObj: SelectedCriterion }[]>();
    selectedCriteria.forEach(sc => {
      if (!byCriterion.has(sc.criterionCode)) {
        byCriterion.set(sc.criterionCode, []);
      }
      byCriterion.get(sc.criterionCode)!.push({ 
        rowId: sc.rowId, 
        criterionObj: sc 
      });
    });
    
    // For each criterion, check all possible pairs of rows
    byCriterion.forEach((rows, criterion) => {
      if (rows.length >= 2) {
        // Generate all possible pairs of rows with this criterion
        for (let i = 0; i < rows.length - 1; i++) {
          for (let j = i + 1; j < rows.length; j++) {
            const row1 = rows[i];
            const row2 = rows[j];
            
            // Check if at least one has special code
            const element1 = apparatusData.find(e => e.id === row1.rowId);
            const element2 = apparatusData.find(e => e.id === row2.rowId);
            
            const hasSpecialCode = 
              (element1 && specialCodes.includes(element1.code)) ||
              (element2 && specialCodes.includes(element2.code));
            
            if (hasSpecialCode) {
              // This is a valid Type 2 DA
              const cells = [
                { rowId: row1.rowId, criterionCode: criterion },
                { rowId: row2.rowId, criterionCode: criterion }
              ];
              const colorIndex = daGroups.length % DA_COLORS.length;
              daGroups.push({ cells, color: DA_COLORS[colorIndex] });
            }
          }
        }
      }
    });

    return daGroups;
  };

  const daGroups = analyzeDaGroups();
  const daCount = daGroups.length;

  // Track completed DAs and validate only new selections
  useEffect(() => {
    const currentDaCount = daGroups.length;
    
    // Check if a new DA was just completed
    if (currentDaCount > lastCompletedDaCount) {
      setLastCompletedDaCount(currentDaCount);
      return; // Don't validate, DA was successfully formed
    }
    
    // Calculate how many criteria are "in progress" (not part of completed DAs)
    const cellsInCompletedDas = new Set<string>();
    daGroups.forEach(group => {
      group.cells.forEach(cell => {
        cellsInCompletedDas.add(`${cell.rowId}:${cell.criterionCode}`);
      });
    });
    
    const incompleteCriteria = selectedCriteria.filter(sc => 
      !cellsInCompletedDas.has(`${sc.rowId}:${sc.criterionCode}`)
    );
    
    const incompleteCount = incompleteCriteria.length;
    
    // Validation rules:
    // - 0 incomplete = all good, no validation needed
    // - 1 incomplete = user is selecting first criterion of new DA, wait for second
    // - 2+ incomplete = user has selected criteria that don't form valid DA, validate after pause
    if (incompleteCount === 0 || incompleteCount === 1) {
      return; // No validation needed
    }
    
    // Wait for user to pause before validating incomplete selections
    const timeoutId = setTimeout(() => {
      // Group incomplete criteria by row and by criterion
      const incompleteByRow = new Map<string, string[]>();
      const incompleteByCriterion = new Map<string, string[]>();
      
      incompleteCriteria.forEach(sc => {
        if (!incompleteByRow.has(sc.rowId)) {
          incompleteByRow.set(sc.rowId, []);
        }
        incompleteByRow.get(sc.rowId)!.push(sc.criterionCode);
        
        if (!incompleteByCriterion.has(sc.criterionCode)) {
          incompleteByCriterion.set(sc.criterionCode, []);
        }
        incompleteByCriterion.get(sc.criterionCode)!.push(sc.rowId);
      });
      
      // Check if incomplete criteria can form valid DAs
      let isInvalid = false;
      
      // Check Type 1 DA possibility: 2 criteria in same row
      let hasPotentialType1DA = false;
      incompleteByRow.forEach((criteriaList) => {
        if (criteriaList.length >= 2) {
          hasPotentialType1DA = true;
        }
      });
      
      // Check Type 2 DA possibility: matching criteria across special code rows
      let hasPotentialType2DA = false;
      incompleteByCriterion.forEach((rowIds, criterion) => {
        if (rowIds.length === 2) {
          const hasSpecialCode = rowIds.some(rowId => {
            const element = apparatusData.find(e => e.id === rowId);
            return element && specialCodes.includes(element.code);
          });
          if (hasSpecialCode) {
            hasPotentialType2DA = true;
          }
        }
      });
      
      // If no potential valid DA formations, it's invalid
      if (!hasPotentialType1DA && !hasPotentialType2DA) {
        isInvalid = true;
      }
      
      // Additional check: if there are 3+ incomplete criteria and they can't form valid pairs
      if (incompleteCount >= 3 && !hasPotentialType1DA && !hasPotentialType2DA) {
        isInvalid = true;
      }
      
      if (isInvalid) {
        toast({
          title: "Invalid DA criteria",
          description: "Please select two criteria for one base. Or, choose the base \"Catch from High Throw\" with one criterion and another base with the same criterion.",
          variant: "destructive",
        });
      }
    }, 1500); // Wait 1.5 seconds after last selection change
    
    return () => clearTimeout(timeoutId);
  }, [selectedCriteria, daGroups.length, lastCompletedDaCount]);

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
