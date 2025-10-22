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
  const [completedDaGroups, setCompletedDaGroups] = useState<{ cells: SelectedCriterion[]; color: string }[]>([]);
  const [colorIndex, setColorIndex] = useState(0);
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
      setCompletedDaGroups([]);
      setColorIndex(0);
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
    setCompletedDaGroups([]);
    setColorIndex(0);
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

  // Analyze selected criteria in order to form discrete DA pairs (respecting selection order)
  const analyzeDaGroups = () => {
    const groups: { cells: SelectedCriterion[]; color: string }[] = [...completedDaGroups];
    const used = new Set<string>(); // key: `${rowId}:${criterionCode}`

    const getKey = (c: SelectedCriterion) => `${c.rowId}:${c.criterionCode}`;

    // Mark all completed DA cells as used
    completedDaGroups.forEach(group => {
      group.cells.forEach(cell => used.add(getKey(cell)));
    });

    for (let i = 0; i < selectedCriteria.length; i++) {
      const a = selectedCriteria[i];
      const aKey = getKey(a);
      if (used.has(aKey)) continue;

      // Find the NEAREST valid partner after 'a' to respect selection order
      let partnerIndex = -1;
      let type: 'type1' | 'type2' | null = null;

      // Check the very next cell first to respect user's selection order
      if (i + 1 < selectedCriteria.length) {
        const b = selectedCriteria[i + 1];
        if (!used.has(getKey(b))) {
          // Check if next cell forms valid Type 1 DA
          if (b.rowId === a.rowId && b.criterionCode !== a.criterionCode) {
            partnerIndex = i + 1;
            type = 'type1';
          }
          // Check if next cell forms valid Type 2 DA
          else if (b.rowId !== a.rowId && b.criterionCode === a.criterionCode) {
            const elementA = apparatusData.find(e => e.id === a.rowId);
            const elementB = apparatusData.find(e => e.id === b.rowId);
            const hasSpecial = (elementA && specialCodes.includes(elementA.code)) || (elementB && specialCodes.includes(elementB.code));
            if (hasSpecial) {
              partnerIndex = i + 1;
              type = 'type2';
            }
          }
        }
      }

      // If immediate next doesn't work, search further for Type 1 (same row priority)
      if (partnerIndex === -1) {
        for (let j = i + 1; j < selectedCriteria.length; j++) {
          const b = selectedCriteria[j];
          if (used.has(getKey(b))) continue;
          if (b.rowId === a.rowId && b.criterionCode !== a.criterionCode) {
            partnerIndex = j;
            type = 'type1';
            break;
          }
        }
      }

      // If still no match, look for Type 2 (same criterion across special code rows)
      if (partnerIndex === -1) {
        for (let j = i + 1; j < selectedCriteria.length; j++) {
          const b = selectedCriteria[j];
          if (used.has(getKey(b))) continue;
          if (b.rowId !== a.rowId && b.criterionCode === a.criterionCode) {
            const elementA = apparatusData.find(e => e.id === a.rowId);
            const elementB = apparatusData.find(e => e.id === b.rowId);
            const hasSpecial = (elementA && specialCodes.includes(elementA.code)) || (elementB && specialCodes.includes(elementB.code));
            if (hasSpecial) {
              partnerIndex = j;
              type = 'type2';
              break;
            }
          }
        }
      }

      if (partnerIndex !== -1 && type) {
        const b = selectedCriteria[partnerIndex];
        const cells: SelectedCriterion[] = [a, b];
        used.add(aKey);
        used.add(getKey(b));
        const color = DA_COLORS[colorIndex % DA_COLORS.length];
        groups.push({ cells, color });
        setColorIndex(prev => prev + 1);
      }
    }

    return groups;
  };

  const daGroups = analyzeDaGroups();
  const daCount = daGroups.length;
  
  // Track when new DAs are completed
  React.useEffect(() => {
    const newDaCount = daGroups.length;
    const completedCount = completedDaGroups.length;
    
    if (newDaCount > completedCount) {
      // New DA(s) completed - lock them
      setCompletedDaGroups(daGroups);
    }
  }, [daGroups.length]);

  // Handle cell deselection - unlock DA if any cell from completed DA is deselected
  const handleCriteriaChange = (newCriteria: SelectedCriterion[]) => {
    if (newCriteria.length < selectedCriteria.length) {
      // User is deselecting - find which cell was removed
      const removed = selectedCriteria.find(sc => 
        !newCriteria.some(nc => nc.rowId === sc.rowId && nc.criterionCode === sc.criterionCode)
      );
      
      if (removed) {
        // Check if this cell belongs to a completed DA
        const affectedDaIndex = completedDaGroups.findIndex(group =>
          group.cells.some(cell => cell.rowId === removed.rowId && cell.criterionCode === removed.criterionCode)
        );
        
        if (affectedDaIndex !== -1) {
          // Just unlock this DA by removing it from completed groups
          // Keep the remaining cell(s) selected
          setCompletedDaGroups(prev => prev.filter((_, idx) => idx !== affectedDaIndex));
        }
      }
    } else if (newCriteria.length > selectedCriteria.length) {
      // User is selecting - check if we've reached the limit
      if (completedDaGroups.length >= 15) {
        toast({
          title: "DA Limit Reached",
          description: "You've reached the limit for DAs creation. Save your current selections to add more later.",
          variant: "destructive",
        });
        return; // Don't allow new selection
      }
    }
    
    setSelectedCriteria(newCriteria);
  };

  // Validate selections and auto-remove invalid ones
  useEffect(() => {
    if (selectedCriteria.length === 0) return;
    
    // Calculate incomplete criteria (not part of completed DAs)
    const cellsInCompletedDas = new Set<string>();
    completedDaGroups.forEach(group => {
      group.cells.forEach(cell => {
        cellsInCompletedDas.add(`${cell.rowId}:${cell.criterionCode}`);
      });
    });
    
    const incompleteCriteria = selectedCriteria.filter(sc => 
      !cellsInCompletedDas.has(`${sc.rowId}:${sc.criterionCode}`)
    );
    
    const incompleteCount = incompleteCriteria.length;
    
    // Only validate when we have 2+ incomplete criteria
    if (incompleteCount < 2) return;
    
    // Validate after a short pause
    const timeoutId = setTimeout(() => {
      // Group incomplete criteria
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
      
      // Check Type 1: 2 criteria in same row
      let hasPotentialType1DA = false;
      incompleteByRow.forEach((criteriaList) => {
        if (criteriaList.length >= 2) {
          hasPotentialType1DA = true;
        }
      });
      
      // Check Type 2: matching criteria across special code rows
      let hasPotentialType2DA = false;
      incompleteByCriterion.forEach((rowIds) => {
        if (rowIds.length >= 2) {
          const hasSpecialCode = rowIds.some(rowId => {
            const element = apparatusData.find(e => e.id === rowId);
            return element && specialCodes.includes(element.code);
          });
          if (hasSpecialCode) {
            hasPotentialType2DA = true;
          }
        }
      });
      
      // If invalid, remove last selected criterion
      if (!hasPotentialType1DA && !hasPotentialType2DA) {
        const lastCriterion = selectedCriteria[selectedCriteria.length - 1];
        setSelectedCriteria(prev => prev.slice(0, -1));
        
        toast({
          title: "Invalid DA selection",
          description: "Please select two criteria for one base. Or, choose the base \"Catch from High Throw\" with one criterion and another base with the same criterion.",
          variant: "destructive",
        });
      }
    }, 800);
    
    return () => clearTimeout(timeoutId);
  }, [selectedCriteria, completedDaGroups, apparatusData, specialCodes, toast]);

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
              onCriteriaChange={handleCriteriaChange}
              daGroups={daGroups}
              currentColorIndex={colorIndex}
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
