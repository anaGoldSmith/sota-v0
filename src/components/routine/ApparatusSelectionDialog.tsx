import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ApparatusType, CombinedApparatusData } from "@/types/apparatus";
import { useApparatusData } from "@/hooks/useApparatusData";
import { ApparatusTable, SelectedCriterion } from "./ApparatusTable";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronUp, ChevronDown } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { PreAcrobaticElement } from "./PreAcrobaticSelectionDialog";
import type { VerticalRotation } from "./VerticalRotationSelectionDialog";
import { AcrobaticsDialog, type AcroSelection } from "./AcrobaticsDialog";

export interface ApparatusCombination {
  element: CombinedApparatusData;
  selectedCriteria: string[];
  apparatus: ApparatusType;
  calculatedValue?: number; // Used for special pairing rule (max value + 0.1)
  rotationalElement?: {
    kind: 'pre-acrobatic' | 'vertical-rotation';
    name: string;
    data: any;
  };
}

export interface EditingDAData {
  elementId: string; // routine element id
  rowId: string; // apparatus data row id (element.id from CombinedApparatusData)
  selectedCriteria: string[]; // criterion codes e.g. ['Cr1V', 'Cr3L']
  isPaired: boolean;
  pairedRowId?: string; // second row id for type2 DAs
  rotationalElement?: ApparatusCombination['rotationalElement'];
}

interface ApparatusSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apparatus: ApparatusType | null;
  onSelectElements: (elements: CombinedApparatusData[]) => void;
  onSelectCombinations?: (combinations: ApparatusCombination[]) => void;
  isForDbElement?: boolean; // Indicates if DA is being added to a DB element
  onGoBackToApparatusHandling?: () => void; // Callback to go back to Apparatus Handling dialog
  preAcrobaticElements?: PreAcrobaticElement[];
  verticalRotations?: VerticalRotation[];
  editingDA?: EditingDAData | null;
  onConfirmEditDA?: (elementId: string, combinations: ApparatusCombination[]) => void;
}

export const ApparatusSelectionDialog = ({
  open,
  onOpenChange,
  apparatus,
  onSelectElements,
  onSelectCombinations,
  isForDbElement = false,
  onGoBackToApparatusHandling,
  preAcrobaticElements = [],
  verticalRotations = [],
  editingDA = null,
  onConfirmEditDA,
}: ApparatusSelectionDialogProps) => {
  const { apparatusData, criteria, specialCodes, specialCodeElements, daComments, isLoading, error } = useApparatusData(apparatus);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<SelectedCriterion[]>([]);
  const [completedDaGroups, setCompletedDaGroups] = useState<{ cells: SelectedCriterion[]; color: string }[]>([]);
  const [availableSlot, setAvailableSlot] = useState<number | null>(null);
  const [stagedDAs, setStagedDAs] = useState<ApparatusCombination[]>([]);
  const [daCount, setDaCount] = useState(0);
  const { toast } = useToast();
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const acroSaveHandledRef = useRef(false);

  // Cr7R rotational element prompt state
  const [showCr7RPrompt, setShowCr7RPrompt] = useState(false);
  const [pendingCr7RCombinations, setPendingCr7RCombinations] = useState<ApparatusCombination[]>([]);
  const [showAcroPickerForDA, setShowAcroPickerForDA] = useState(false);
  const [pendingEditCombinations, setPendingEditCombinations] = useState<ApparatusCombination[] | null>(null);

  // Reset state when dialog opens/closes
  const editInitializedRef = useRef(false);
  const editModifiedRef = useRef(false);
  
  // For editing DAs with rotational elements: track the current rotational element
  const [editRotationalElement, setEditRotationalElement] = useState<ApparatusCombination['rotationalElement'] | null>(null);
  const isEditWithRotation = !!editingDA?.rotationalElement;
  
  
  useEffect(() => {
    if (!open) {
      // Clear state when dialog closes
      setSelectedIds([]);
      setSelectedCriteria([]);
      setCompletedDaGroups([]);
      setAvailableSlot(null);
      setStagedDAs([]);
      setDaCount(0);
      editInitializedRef.current = false;
      editModifiedRef.current = false;
      setEditRotationalElement(null);
    } else if (open && editingDA && !editInitializedRef.current && apparatusData.length > 0) {
      // Edit mode: pre-populate with existing DA selection
      editInitializedRef.current = true;
      editModifiedRef.current = false;
      setSelectedIds([]);
      setStagedDAs([]);
      setDaCount(0);
      setAvailableSlot(null);
      
      // Initialize rotational element for Cr7R DAs
      if (editingDA.rotationalElement) {
        setEditRotationalElement(editingDA.rotationalElement);
      }
      
      if (editingDA.isPaired && editingDA.pairedRowId) {
        // Type 2 DA: two rows, same criterion
        const criterion = editingDA.selectedCriteria[0];
        if (criterion) {
          const initialCriteria: SelectedCriterion[] = [
            { rowId: editingDA.rowId, criterionCode: criterion },
            { rowId: editingDA.pairedRowId, criterionCode: criterion },
          ];
          setSelectedCriteria(initialCriteria);
          setCompletedDaGroups([{ cells: initialCriteria, color: DA_COLORS[0] }]);
        }
      } else {
        // Type 1 DA: one row, two criteria
        const initialCriteria: SelectedCriterion[] = editingDA.selectedCriteria.map(cr => ({
          rowId: editingDA.rowId,
          criterionCode: cr,
        }));
        setSelectedCriteria(initialCriteria);
        if (initialCriteria.length === 2) {
          setCompletedDaGroups([{ cells: initialCriteria, color: DA_COLORS[0] }]);
        }
      }
    } else if (open && !isForDbElement && !editingDA) {
      // Fresh reset when opening for pure DA selection (not for DB element, not edit)
      setSelectedIds([]);
      setSelectedCriteria([]);
      setCompletedDaGroups([]);
      setAvailableSlot(null);
      setStagedDAs([]);
      setDaCount(0);
    }
  }, [open, isForDbElement, editingDA, apparatusData]);

  // In edit mode, only allow exactly 1 DA
  const isEditMode = !!editingDA;

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
    if (onSelectCombinations && stagedDAs.length > 0) {
      onSelectCombinations(stagedDAs);
      setSelectedCriteria([]);
      setCompletedDaGroups([]);
      setAvailableSlot(null);
      setStagedDAs([]);
      const dasAddedCount = daCount; // Store before reset
      setDaCount(0);
      onOpenChange(false);
      
      toast({
        title: "DAs added",
        description: `Added ${dasAddedCount} DA${dasAddedCount !== 1 ? 's' : ''} to routine.`,
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
    setAvailableSlot(null);
    setStagedDAs([]);
    setDaCount(0);
    setPendingEditCombinations(null);
    onOpenChange(false);
  };

  // Finalize DA combinations (stage or submit for DB element)
  const finalizeDACombinations = (combinations: ApparatusCombination[]) => {
    if (isEditMode && onConfirmEditDA && editingDA) {
      // Edit mode: confirm immediately
      onConfirmEditDA(editingDA.elementId, combinations);
      onOpenChange(false);
      return;
    }
    
    setStagedDAs(prev => [...prev, ...combinations]);
    setDaCount(prev => prev + 1);
    setSelectedCriteria([]);
    setCompletedDaGroups([]);

    if (isForDbElement && onSelectCombinations) {
      onSelectCombinations(combinations);
      setStagedDAs([]);
      setDaCount(0);
      setSelectedIds([]);
      setAvailableSlot(null);
      setSelectedCriteria([]);
      setCompletedDaGroups([]);
      onOpenChange(false);
    } else {
      toast({
        title: "Valid DA was created",
        description: "Continue selecting to create more DAs or click 'Add DAs' to finish.",
      });
    }
  };

  // Cr7R prompt handlers
  const handleCr7RYes = () => {
    setShowCr7RPrompt(false);
    acroSaveHandledRef.current = false;
    setShowAcroPickerForDA(true);
  };

  const handleCr7RNo = () => {
    setShowCr7RPrompt(false);
    if (isEditMode) {
      setPendingEditCombinations(pendingCr7RCombinations);
    } else {
      finalizeDACombinations(pendingCr7RCombinations);
    }
    setPendingCr7RCombinations([]);
  };

  const handleAcroPickerSave = (selections: AcroSelection[]) => {
    acroSaveHandledRef.current = true;
    if (selections.length > 0) {
      const sel = selections[0];
      const rotationalElement = {
        kind: sel.kind,
        name: sel.kind === 'pre-acrobatic' ? sel.data.name : (sel.data.name || sel.data.code),
        data: sel.data,
      };
      const enriched = pendingCr7RCombinations.map(c => ({ ...c, rotationalElement }));
      if (isEditMode) {
        setPendingEditCombinations(enriched);
      } else {
        finalizeDACombinations(enriched);
      }
    } else {
      if (isEditMode) {
        setPendingEditCombinations(pendingCr7RCombinations);
      } else {
        finalizeDACombinations(pendingCr7RCombinations);
      }
    }
    setPendingCr7RCombinations([]);
    setShowAcroPickerForDA(false);
  };

  const scrollDialog = (direction: 'up' | 'down') => {
    if (dialogContentRef.current) {
      const scrollAmount = 300;
      const currentScroll = dialogContentRef.current.scrollTop;
      const targetScroll = direction === 'up' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      dialogContentRef.current.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    }
  };

  // Get the proper storage URL for base symbols
  const getBaseSymbol = (filename: string | null) => {
    if (!filename || !apparatus) return null;
    
    // If it's already a full URL, return it directly
    if (filename.startsWith('http')) {
      return filename;
    }
    
    // Try bases bucket first
    const basesBucket = `${apparatus}-bases-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(basesBucket)
      .getPublicUrl(filename);
    
    return publicUrl;
  };

  const getBaseSymbolFallback = (filename: string | null) => {
    if (!filename || !apparatus) return null;
    
    // Try technical elements bucket as fallback
    const teBucket = `${apparatus}-technical-elements-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(teBucket)
      .getPublicUrl(filename);
    
    return publicUrl;
  };

  // Get technical element symbols for storage URL construction
  const getTechnicalElementSymbol = (filename: string | null) => {
    if (!filename || !apparatus) return null;
    
    // If it's already a full URL, return it directly
    if (filename.startsWith('http')) {
      return filename;
    }
    
    // Use technical elements bucket for special code symbols
    const teBucket = `${apparatus}-technical-elements-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(teBucket)
      .getPublicUrl(filename);
    
    return publicUrl;
  };

  // Color palette for DA groups (15 distinct colors optimized for visibility on light backgrounds)
  const DA_COLORS = [
    'border-purple-700',     // Deep Purple
    'border-indigo-800',     // Navy
    'border-blue-700',       // Royal Blue
    'border-sky-500',        // Sky Blue
    'border-teal-600',       // Teal
    'border-green-700',      // Forest Green
    'border-emerald-800',    // Olive/Dark Green
    'border-lime-600',       // Lime Green
    'border-yellow-500',     // Golden Yellow
    'border-amber-800',      // Brown/Rust
    'border-orange-700',     // Deep Orange
    'border-red-700',        // Deep Red
    'border-rose-500',       // Coral
    'border-pink-600',       // Bright Pink
    'border-fuchsia-600',    // Magenta
  ];

  // Helper to generate a stable key for a DA group (order-independent)
  const getDaKey = (cells: SelectedCriterion[]) => {
    const keys = cells.map(c => `${c.rowId}:${c.criterionCode}`).sort();
    return keys.join('|');
  };

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
        // Don't assign color here - will be assigned when DA is completed
        groups.push({ cells, color: '' });
      }
    }

    return groups;
  };

  const daGroups = analyzeDaGroups();
  
  // Position-based color assignment: each DA's position determines its color
  React.useEffect(() => {
    // Build lookup maps for previous and current groups
    const prevLookup = new Map(
      completedDaGroups.map(g => [getDaKey(g.cells), g as { cells: SelectedCriterion[]; color: string }])
    );
    const currLookup = new Map(
      daGroups.map(g => [getDaKey(g.cells), g as { cells: SelectedCriterion[]; color: string }])
    );

    const previousKeys = new Set(prevLookup.keys());
    const currentKeys = new Set(currLookup.keys());

    const removedKeys: string[] = [];
    const addedKeys: string[] = [];

    previousKeys.forEach(k => { if (!currentKeys.has(k)) removedKeys.push(k); });
    currentKeys.forEach(k => { if (!previousKeys.has(k)) addedKeys.push(k); });

    // Nothing changed
    if (removedKeys.length === 0 && addedKeys.length === 0 && prevLookup.size === currLookup.size) {
      return;
    }

    // Helper to check if two DAs share at least one cell
    const cellsSet = (cells: SelectedCriterion[]) => new Set(cells.map(c => `${c.rowId}:${c.criterionCode}`));
    
    const sharesCell = (cells1: SelectedCriterion[], cells2: SelectedCriterion[]) => {
      const set1 = cellsSet(cells1);
      const set2 = cellsSet(cells2);
      for (const cell of set1) {
        if (set2.has(cell)) return true;
      }
      return false;
    };

    // Build new completed groups list maintaining position-based coloring
    const newGroups: { cells: SelectedCriterion[]; color: string }[] = [];
    const processedAddedKeys = new Set<string>();

    // Step 1: For each existing DA position, either keep it or replace with modified version
    completedDaGroups.forEach((prevGroup, index) => {
      const prevKey = getDaKey(prevGroup.cells);
      
      if (currentKeys.has(prevKey)) {
        // DA still exists at this position
        newGroups.push({ cells: prevGroup.cells, color: DA_COLORS[index % DA_COLORS.length] });
      } else if (removedKeys.includes(prevKey)) {
        // This DA was removed - check if there's a new DA that shares cells (modification)
        let replacementKey: string | null = null;
        for (const addedKey of addedKeys) {
          if (processedAddedKeys.has(addedKey)) continue;
          const addedDA = currLookup.get(addedKey)!;
          if (sharesCell(prevGroup.cells, addedDA.cells)) {
            replacementKey = addedKey;
            break;
          }
        }
        
        if (replacementKey && availableSlot === index) {
          // Insert modified DA at the same position
          const addedDA = currLookup.get(replacementKey)!;
          newGroups.push({ cells: addedDA.cells, color: DA_COLORS[index % DA_COLORS.length] });
          processedAddedKeys.add(replacementKey);
          setAvailableSlot(null); // Clear the slot
        }
        // If no replacement, leave this slot empty (DA was deleted)
      }
    });

    // Step 2: Add any remaining new DAs that weren't replacements
    addedKeys.forEach(addedKey => {
      if (processedAddedKeys.has(addedKey)) return;
      
      const addedDA = currLookup.get(addedKey)!;
      
      // Use availableSlot if set, otherwise append to end
      if (availableSlot !== null && newGroups.length <= availableSlot) {
        // Insert at the available slot
        while (newGroups.length < availableSlot) {
          newGroups.push({ cells: [], color: '' }); // Placeholder
        }
        newGroups.splice(availableSlot, 0, { 
          cells: addedDA.cells, 
          color: DA_COLORS[availableSlot % DA_COLORS.length] 
        });
        setAvailableSlot(null);
      } else {
        // Append to end
        const nextIndex = newGroups.length;
        newGroups.push({ 
          cells: addedDA.cells, 
          color: DA_COLORS[nextIndex % DA_COLORS.length] 
        });
      }
    });

    // Filter out any empty placeholders
    const filteredGroups = newGroups.filter(g => g.cells.length > 0);

    setCompletedDaGroups(filteredGroups);
  }, [
    JSON.stringify(completedDaGroups.map(g => getDaKey(g.cells)).sort()),
    JSON.stringify(daGroups.map(g => getDaKey(g.cells)).sort()),
    availableSlot
  ]);

  // Handle cell deselection - unlock DA if any cell from completed DA is deselected
  const handleCriteriaChange = (newCriteria: SelectedCriterion[]) => {
    // When editing a DA with a rotational element, criteria are locked — only the acro element can be changed
    if (isEditWithRotation) {
      toast({
        title: "Criteria locked",
        description: "For DAs with rotational elements, you can only change the acrobatic element.",
        variant: "destructive",
      });
      return;
    }
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
          // Store the position of the DA being modified so new DA can reuse this position
          setAvailableSlot(affectedDaIndex);
          // Unlock this DA by removing it from completed groups
          setCompletedDaGroups(prev => prev.filter((_, idx) => idx !== affectedDaIndex));
        }
      }
    } else if (newCriteria.length > selectedCriteria.length) {
      // In edit mode, block new selections until user deselects one first
      if (isEditMode && completedDaGroups.length > 0) {
        toast({
          title: "Deselect first",
          description: "Please deselect an existing criterion before selecting a new one.",
          variant: "destructive",
        });
        return;
      }
      // User is selecting - check if we've reached the limit
      if (completedDaGroups.length >= 15) {
        toast({
          title: "DA Limit Reached",
          description: "You've reached the limit for DAs creation. Save your current selections to add more later.",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (isEditMode) editModifiedRef.current = true;
    setSelectedCriteria(newCriteria);
  };

  // Detect when a valid DA is completed and stage it, or warn about invalid DA
  useEffect(() => {
    if (selectedCriteria.length !== 2) return;
    
    // In edit mode, don't auto-validate until the user has actually changed something
    if (isEditMode && !editModifiedRef.current) return;
    
    // Check if we've reached the limit of 15 staged DAs (skip in edit mode)
    if (!isEditMode && daCount >= 15) {
      setSelectedCriteria(prev => prev.slice(0, -1));
      
      toast({
        title: "Maximum DAs reached",
        description: "You have created 15 DAs. Please add them to your routine before creating more. Please note that maximum 15 DAs will be evaluated in chronological order in line with FIG CoP.",
        variant: "destructive",
      });
      return;
    }
    
    // If this is for a DB element and we already have one DA, don't allow more
    if (isForDbElement && daCount >= 1) {
      setSelectedCriteria(prev => prev.slice(0, -1));
      
      toast({
        title: "One DA per DB",
        description: "You can only add one DA to a DB element.",
        variant: "destructive",
      });
      return;
    }
    
    const timeoutId = setTimeout(() => {
      // Check if these 2 cells form a valid DA
      const [a, b] = selectedCriteria;
      let isValidDA = false;
      let daType: 'type1' | 'type2' | null = null;
      
      // Type 1: Same row, different criteria
      if (a.rowId === b.rowId && a.criterionCode !== b.criterionCode) {
        isValidDA = true;
        daType = 'type1';
      }
      // Type 2: Different rows, same criterion, at least one special code
      else if (a.rowId !== b.rowId && a.criterionCode === b.criterionCode) {
        const elementA = apparatusData.find(e => e.id === a.rowId);
        const elementB = apparatusData.find(e => e.id === b.rowId);
        const hasSpecial = (elementA && specialCodes.includes(elementA.code)) || 
                          (elementB && specialCodes.includes(elementB.code));
        if (hasSpecial) {
          isValidDA = true;
          daType = 'type2';
        }
      }
      
      if (isValidDA && daType && apparatus) {
        // Create the DA combination(s)
        const newCombinations: ApparatusCombination[] = [];
        
        if (daType === 'type1') {
          // Type 1: Single element with 2 criteria
          const element = apparatusData.find(e => e.id === a.rowId);
          if (element) {
            newCombinations.push({
              element,
              selectedCriteria: [a.criterionCode, b.criterionCode],
              apparatus
            });
          }
        } else if (daType === 'type2') {
          // Type 2: Two elements, same criterion, special pairing
          const element1 = apparatusData.find(e => e.id === a.rowId);
          const element2 = apparatusData.find(e => e.id === b.rowId);
          
          if (element1 && element2) {
            const calculatedValue = Math.max(element1.value, element2.value) + 0.1;
            const criterion = a.criterionCode;
            
            newCombinations.push({
              element: element1,
              selectedCriteria: [criterion],
              apparatus,
              calculatedValue
            });
            newCombinations.push({
              element: element2,
              selectedCriteria: [criterion],
              apparatus,
              calculatedValue
            });
          }
        }
        
        if (newCombinations.length > 0) {
          if (isEditMode) {
            // In edit mode, don't auto-finalize — stage for user confirmation
            // Check for Cr7R first
            const hasCr7R = newCombinations.some(c => c.selectedCriteria.includes('Cr7R'));
            if (hasCr7R && (preAcrobaticElements.length > 0 || verticalRotations.length > 0)) {
              setPendingCr7RCombinations(newCombinations);
              setShowCr7RPrompt(true);
            } else {
              setPendingEditCombinations(newCombinations);
            }
            // Lock the new selection as a completed group
            setCompletedDaGroups([{ cells: [a, b], color: DA_COLORS[availableSlot ?? 0] }]);
          } else {
            // Check if any criterion in this DA is Cr7R (rotation)
            const hasCr7R = newCombinations.some(c => c.selectedCriteria.includes('Cr7R'));
            
            if (hasCr7R && (preAcrobaticElements.length > 0 || verticalRotations.length > 0)) {
              // Pause and ask the user if they want to specify a rotational element
              setPendingCr7RCombinations(newCombinations);
              setSelectedCriteria([]);
              setCompletedDaGroups([]);
              setShowCr7RPrompt(true);
            } else {
              // Normal flow - stage the DA immediately
              finalizeDACombinations(newCombinations);
            }
          }
        }
      } else {
        // Invalid DA - remove the last selected cell and show warning
        setSelectedCriteria(prev => prev.slice(0, -1));
        
        toast({
          title: "Invalid DA selection",
          description: "Please select two criteria for one base. Or, choose the base \"Catch from High Throw\" with one criterion and another base with the same criterion.",
          variant: "destructive",
        });
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [selectedCriteria, apparatusData, specialCodes, apparatus, toast, isForDbElement, daCount, onSelectCombinations]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col p-0">
        <div ref={dialogContentRef} className="flex flex-col overflow-y-auto p-6">
        <div className="fixed right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[60]">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollDialog('up')}
            className="rounded-full shadow-lg bg-background hover:bg-primary/10"
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scrollDialog('down')}
            className="rounded-full shadow-lg bg-background hover:bg-primary/10"
          >
            <ChevronDown className="h-5 w-5" />
          </Button>
        </div>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">
            {isEditMode ? 'Edit' : 'Select'} Difficulty of Apparatus for {apparatus ? apparatus.charAt(0).toUpperCase() + apparatus.slice(1) : 'Apparatus'}
          </DialogTitle>
          {isEditMode && (
            <DialogDescription className="text-sm text-muted-foreground">
              Modify your criteria selection below. The current selection is highlighted. Deselect a criterion and select a new one, then the DA will be validated automatically.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* General Rules for DA creation */}
        <Collapsible defaultOpen={!isForDbElement} className="rounded-lg border bg-muted/30 mx-6 mt-4 mb-2">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
            <h3 className="font-semibold text-sm">General Rules for DA creation</h3>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=closed]]:rotate-[-90deg]" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                To create a valid DA, choose one base with two criteria by clicking on two "v" cells in the same row. Or, choose the base "Catch from High Throw" with one criterion and another base with the same criterion — in this case, DA value = (highest base value) + 0.1.
              </p>
              {specialCodeElements.length > 0 && (
                <p className="flex items-center gap-2 text-xs flex-wrap">
                  <span>*For {apparatus ? apparatus.charAt(0).toUpperCase() + apparatus.slice(1) : 'apparatus'} DAs "Catch from High Throw" is valid for</span>
                  {specialCodeElements.map((element, index) => (
                    <React.Fragment key={element.code}>
                      {element.symbol_image && (
                        <img 
                          src={getTechnicalElementSymbol(element.symbol_image) || ''} 
                          alt={element.code}
                          className="h-12 w-auto inline-block align-middle"
                          onError={(e) => {
                            console.error('Failed to load symbol:', element.symbol_image);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      {index < specialCodeElements.length - 1 && (
                        index === specialCodeElements.length - 2 ? 
                          <span className="mx-1">and</span> : 
                          <span className="mx-1">,</span>
                      )}
                    </React.Fragment>
                  ))}
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* DA creation for DB section - only show in DB module */}
        {isForDbElement && (
          <Collapsible defaultOpen className="rounded-lg border bg-muted/30 mx-6 mt-2 mb-2">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <h3 className="font-semibold text-sm">DA creation for DB</h3>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=closed]]:rotate-[-90deg]" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="text-sm text-muted-foreground">
                <p>
                  When assigning DAs to DBs, at least one DA criterion should normally be a DB. To create a valid DA for DB, you could firstly select a cell in the final "DB" column for the relevant base, and then add a second criterion by selecting another cell in the same row (i.e., a second criterion for that same base).
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Extra DA Information section */}
        {daComments && daComments.length > 0 && (
          <Collapsible defaultOpen={false} className="rounded-lg border bg-muted/30 mx-6 mt-2 mb-4">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <h3 className="font-semibold text-sm">Extra DA Information</h3>
              <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=closed]]:rotate-[-90deg]" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-2">
                {daComments.map((comment, idx) => {
                  const codes = comment.code.split('&').map(c => c.trim());
                  return (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-0.5 flex-shrink-0 min-w-[80px]">
                        {codes.map((code, index) => {
                          const element = apparatusData.find(d => d.code === code);
                          if (element?.symbol_image) {
                            return (
                              <img 
                                key={`${code}-${index}`}
                                src={getTechnicalElementSymbol(element.symbol_image) || ''} 
                                alt={code}
                                className="h-6 w-auto inline-block align-middle mx-0.5"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                      <span className="text-muted-foreground flex-1">{comment.comment}</span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">Failed to load apparatus data</p>
              <p className="text-sm text-muted-foreground">Please try again</p>
            </div>
          </div>
        ) : apparatusData.length === 0 ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <p className="text-muted-foreground">No apparatus data available</p>
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
              daGroups={completedDaGroups}
              daComments={daComments || []}
            />

            <div className="flex justify-end gap-3 pt-3 pb-4 flex-shrink-0">
              {isEditMode ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
            {/* Rotational element display for edit mode */}
            {isEditWithRotation && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <span className="text-sm font-medium text-foreground">Rotational Element:</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-purple-100 text-purple-800 text-sm font-semibold border border-purple-200">
                  {(editRotationalElement || editingDA?.rotationalElement)?.name || 'None'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    acroSaveHandledRef.current = false;
                    setShowAcroPickerForDA(true);
                  }}
                >
                  Change
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 pb-4 flex-shrink-0">
              {isEditMode ? (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  {isEditWithRotation ? (
                    <Button 
                      disabled={!editRotationalElement}
                      onClick={() => {
                        if (onConfirmEditDA && editingDA) {
                          // Rebuild combinations from existing DA data with updated rotational element
                          const element = apparatusData.find(e => e.id === editingDA.rowId);
                          if (element && apparatus) {
                            const combinations: ApparatusCombination[] = [{
                              element,
                              selectedCriteria: editingDA.selectedCriteria,
                              apparatus,
                              rotationalElement: editRotationalElement || editingDA.rotationalElement,
                            }];
                            onConfirmEditDA(editingDA.elementId, combinations);
                            onOpenChange(false);
                          }
                        }
                      }}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <Button 
                      disabled={!pendingEditCombinations}
                      onClick={() => {
                        if (pendingEditCombinations && onConfirmEditDA && editingDA) {
                          onConfirmEditDA(editingDA.elementId, pendingEditCombinations);
                          setPendingEditCombinations(null);
                          onOpenChange(false);
                        }
                      }}
                    >
                      Confirm
                    </Button>
                  )}
                </>
              ) : isForDbElement ? (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    onOpenChange(false);
                    onGoBackToApparatusHandling?.();
                  }}
                >
                  Go Back
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSelected} disabled={daCount === 0}>
                    Add DAs {daCount > 0 && `(${daCount})`}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Cr7R Rotation Prompt Dialog */}
    <Dialog open={showCr7RPrompt} onOpenChange={(open) => { if (!open) handleCr7RNo(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Specify Rotational Element?</DialogTitle>
          <DialogDescription>
            This DA includes a rotation criterion. Would you like to specify which rotational element is performed?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleCr7RNo}>No</Button>
          <Button onClick={handleCr7RYes}>Yes</Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Acrobatics Picker for DA (single-select) */}
    <AcrobaticsDialog
      open={showAcroPickerForDA}
      onOpenChange={(open) => {
        if (!open && showAcroPickerForDA) {
          // Only finalize if save callback didn't already handle it
          if (!acroSaveHandledRef.current && pendingCr7RCombinations.length > 0) {
            if (isEditMode) {
              setPendingEditCombinations(pendingCr7RCombinations);
            } else {
              finalizeDACombinations(pendingCr7RCombinations);
            }
            setPendingCr7RCombinations([]);
          }
          acroSaveHandledRef.current = false;
          setShowAcroPickerForDA(false);
        }
      }}
      preAcrobaticElements={preAcrobaticElements}
      verticalRotations={verticalRotations}
      onSaveSelections={handleAcroPickerSave}
      singleSelect
    />
    </>
  );
};
