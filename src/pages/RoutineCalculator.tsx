import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, X, Calculator, GripVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RotationIcon, JumpIcon, BalanceIcon } from "@/components/icons/DbSymbols";
import { JumpSelectionDialog } from "@/components/routine/JumpSelectionDialog";
import { BalanceSelectionDialog } from "@/components/routine/BalanceSelectionDialog";
import { RotationSelectionDialog } from "@/components/routine/RotationSelectionDialog";
import { ApparatusSelectionDialog, ApparatusCombination } from "@/components/routine/ApparatusSelectionDialog";
import { DBSuccessDialog } from "@/components/routine/DBSuccessDialog";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApparatusType, CombinedApparatusData } from "@/types/apparatus";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SelectedJump {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
  symbol_image: string | null;
}

interface SelectedBalance {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  symbol_image: string | null;
}

interface SelectedRotation {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
  symbol_image: string | null;
}

type RoutineElementType = 'DB' | 'DA' | 'R' | 'Steps';

interface RoutineElement {
  id: string;
  type: RoutineElementType;
  symbolImages: string[];
  value: number;
  originalData: SelectedJump | SelectedBalance | SelectedRotation | ApparatusCombination | {
    isPaired: true;
    combo1: ApparatusCombination;
    combo2: ApparatusCombination;
  };
  parentId?: string; // For DA sub-rows linked to DB parent rows
  isSubRow?: boolean; // Indicates if this is a sub-row
}

// Sortable Row Component
function SortableRow({ element, index, itemNumber, onRemove }: { 
  element: RoutineElement; 
  index: number;
  itemNumber: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={element.isSubRow ? "bg-muted/30" : ""}
    >
      <TableCell className="w-12">
        <div
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center justify-center"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className={`w-20 font-mono ${element.isSubRow ? 'pl-6' : ''}`}>
        {itemNumber}
      </TableCell>
      <TableCell className="w-24 font-medium">
        {element.isSubRow ? "DA" : "DB"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 flex-wrap">
          {element.symbolImages.map((url, imgIndex) => {
            const isWSymbol = url && url.includes('Cr5W.png');
            
            return url && (
              isWSymbol ? (
                <div 
                  key={`${element.id}-symbol-${imgIndex}`}
                  className="h-8 w-8 flex items-center justify-center"
                >
                  <span className="text-2xl font-bold">W</span>
                </div>
              ) : (
                <img
                  key={`${element.id}-symbol-${imgIndex}`}
                  src={url}
                  alt="Symbol"
                  className="h-8 w-8 object-contain"
                />
              )
            );
          })}
        </div>
      </TableCell>
      <TableCell className="w-24 text-right font-mono font-semibold">
        {element.value.toFixed(1)}
      </TableCell>
      <TableCell className="w-12">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          draggable={false}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

const RoutineCalculator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jumpDialogOpen, setJumpDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [rotationDialogOpen, setRotationDialogOpen] = useState(false);
  const [apparatusDialogOpen, setApparatusDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedApparatus, setSelectedApparatus] = useState<ApparatusType | null>(null);
  const [routineElements, setRoutineElements] = useState<RoutineElement[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [sourceElementType, setSourceElementType] = useState<'jump' | 'rotation' | 'balance' | null>(null);
  
  // Track pending DB element when adding apparatus difficulty
  const [pendingDbElement, setPendingDbElement] = useState<{
    element: SelectedJump | SelectedBalance | SelectedRotation;
    type: 'jump' | 'rotation' | 'balance';
  } | null>(null);
  
  const [selectedJumps, setSelectedJumps] = useState<SelectedJump[]>([]);
  const [selectedBalances, setSelectedBalances] = useState<SelectedBalance[]>([]);
  const [selectedRotations, setSelectedRotations] = useState<SelectedRotation[]>([]);
  const [selectedApparatusElements, setSelectedApparatusElements] = useState<CombinedApparatusData[]>([]);
  const [selectedApparatusCombinations, setSelectedApparatusCombinations] = useState<ApparatusCombination[]>([]);

  // Compute selected IDs for highlighting
  const selectedJumpIds = useMemo(() => new Set(selectedJumps.map(j => j.id)), [selectedJumps]);
  const selectedBalanceIds = useMemo(() => new Set(selectedBalances.map(b => b.id)), [selectedBalances]);
  const selectedRotationIds = useMemo(() => new Set(selectedRotations.map(r => r.id)), [selectedRotations]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setRoutineElements((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const movedElement = items[oldIndex];
        
        // If dragging a parent (DB with children), move parent and all children together
        if (!movedElement.isSubRow && movedElement.type === 'DB') {
          // Find all children of this parent
          const children = items.filter(item => item.parentId === movedElement.id);
          
          if (children.length > 0) {
            // Remove parent and children from original positions
            const itemsWithoutMoved = items.filter(item => 
              item.id !== movedElement.id && !children.some(child => child.id === item.id)
            );
            
            // Calculate insertion index (accounting for removed items)
            let insertIndex = newIndex;
            for (let i = 0; i < oldIndex && i < newIndex; i++) {
              if (items[i].id === movedElement.id || children.some(child => child.id === items[i].id)) {
                insertIndex--;
              }
            }
            
            // Insert parent and children at new position
            const newItems = [...itemsWithoutMoved];
            newItems.splice(insertIndex, 0, movedElement, ...children);
            return newItems;
          }
        }
        
        // If dragging a sub-row, don't allow it (sub-rows are linked to parent)
        if (movedElement.isSubRow) {
          return items;
        }
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSelectJump = (jump: SelectedJump, withApparatusHandling: boolean = false) => {
    setSelectedJumps((prev) => [...prev, jump]);
    
    // If withApparatusHandling is true, we'll wait for DA to be added before creating the routine element
    if (!withApparatusHandling) {
      // Add to routine elements immediately (without DA)
      const newElement: RoutineElement = {
        id: `jump-${jump.id}-${Date.now()}`,
        type: 'DB',
        symbolImages: jump.symbol_image ? [getSymbolUrl(jump.symbol_image, 'jump-symbols') || ''] : [],
        value: jump.value,
        originalData: jump,
      };
      setRoutineElements((prev) => [...prev, newElement]);
    } else {
      // Store as pending DB element to link with DA later
      setPendingDbElement({ element: jump, type: 'jump' });
    }
  };

  const handleRemoveJump = (index: number) => {
    setSelectedJumps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectBalance = (balance: SelectedBalance, withApparatusHandling: boolean = false) => {
    setSelectedBalances((prev) => [...prev, balance]);
    
    // If withApparatusHandling is true, we'll wait for DA to be added before creating the routine element
    if (!withApparatusHandling) {
      // Add to routine elements immediately (without DA)
      const newElement: RoutineElement = {
        id: `balance-${balance.id}-${Date.now()}`,
        type: 'DB',
        symbolImages: balance.symbol_image ? [getSymbolUrl(balance.symbol_image, 'jump-symbols') || ''] : [],
        value: balance.value,
        originalData: balance,
      };
      setRoutineElements((prev) => [...prev, newElement]);
    } else {
      // Store as pending DB element to link with DA later
      setPendingDbElement({ element: balance, type: 'balance' });
    }
  };

  const handleRemoveBalance = (index: number) => {
    setSelectedBalances((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectRotation = (rotation: SelectedRotation, withApparatusHandling: boolean = false) => {
    setSelectedRotations((prev) => [...prev, rotation]);
    
    // If withApparatusHandling is true, we'll wait for DA to be added before creating the routine element
    if (!withApparatusHandling) {
      // Add to routine elements immediately (without DA)
      const newElement: RoutineElement = {
        id: `rotation-${rotation.id}-${Date.now()}`,
        type: 'DB',
        symbolImages: rotation.symbol_image ? [getSymbolUrl(rotation.symbol_image, 'jump-symbols') || ''] : [],
        value: rotation.value,
        originalData: rotation,
      };
      setRoutineElements((prev) => [...prev, newElement]);
    } else {
      // Store as pending DB element to link with DA later
      setPendingDbElement({ element: rotation, type: 'rotation' });
    }
  };

  const handleRemoveRotation = (index: number) => {
    setSelectedRotations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectApparatusElements = (elements: CombinedApparatusData[]) => {
    setSelectedApparatusElements((prev) => [...prev, ...elements]);
  };

  const handleSelectApparatusCombinations = (combinations: ApparatusCombination[]) => {
    setSelectedApparatusCombinations((prev) => [...prev, ...combinations]);
    
    // Check if we have a pending DB element to link this DA to
    if (pendingDbElement) {
      const { element: dbElement, type: dbType } = pendingDbElement;
      
      // Create the parent DB row
      const parentId = `db-${dbType}-${dbElement.id}-${Date.now()}`;
      const parentElement: RoutineElement = {
        id: parentId,
        type: 'DB',
        symbolImages: dbElement.symbol_image ? [
          getSymbolUrl(dbElement.symbol_image, 'jump-symbols') || ''
        ] : [],
        value: dbElement.value,
        originalData: dbElement,
      };
      
      // Create DA sub-rows linked to the parent
      const daSubRows = processApparatusCombinationsToElements(combinations).map((daElement) => ({
        ...daElement,
        parentId: parentId,
        isSubRow: true,
      }));
      
      // Add parent and sub-rows to routine elements
      setRoutineElements((prev) => [...prev, parentElement, ...daSubRows]);
      
      // Clear pending DB element
      setPendingDbElement(null);
      setSourceElementType(dbType);
    } else {
      // No pending DB - add DA as standalone elements (original behavior)
      const newElements = processApparatusCombinationsToElements(combinations);
      setRoutineElements((prev) => [...prev, ...newElements]);
    }
    
    // Show success dialog if DA was added
    if (combinations.length > 0) {
      setShowSuccessDialog(true);
    }
  };

  const handleRemoveApparatusElement = (index: number) => {
    setSelectedApparatusElements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveApparatusCombination = (index: number) => {
    setSelectedApparatusCombinations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApparatusChange = (value: string) => {
    if (value === 'hoop' || value === 'ball' || value === 'clubs' || value === 'ribbon') {
      setSelectedApparatus(value);
    } else {
      setSelectedApparatus(null);
    }
  };

  const handleOpenApparatusDialog = () => {
    if (!selectedApparatus) {
      toast({
        title: "No apparatus selected",
        description: "Please select an apparatus (Hoop, Ball, Clubs, or Ribbon) first.",
        variant: "destructive",
      });
      return;
    }
    setApparatusDialogOpen(true);
  };

  const getSymbolUrl = (symbolImage: string | null, bucketName: string) => {
    if (!symbolImage) return null;
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(symbolImage);
    return publicUrl;
  };

  const getTechnicalElementSymbol = (filename: string | null, apparatus: ApparatusType) => {
    if (!filename) return null;
    
    // If it's already a full URL, return it directly
    if (filename.startsWith('http')) {
      return filename;
    }
    
    // Use technical elements bucket for DA symbols
    const teBucket = `${apparatus}-technical-elements-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(teBucket)
      .getPublicUrl(filename);
    
    return publicUrl;
  };

  const getCriteriaSymbolUrl = (criterionCode: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from('criteria-symbols')
      .getPublicUrl(`${criterionCode}.png`);
    return publicUrl;
  };

  // Process apparatus combinations with grouping logic for special pairings
  const processApparatusCombinationsToElements = (combinations: ApparatusCombination[]): RoutineElement[] => {
    const processedElements: RoutineElement[] = [];
    let i = 0;

    while (i < combinations.length) {
      const combo = combinations[i];
      
      // Check if this is part of a special pairing (has calculatedValue and next combo has same value)
      if (combo.calculatedValue !== undefined && 
          i + 1 < combinations.length &&
          combinations[i + 1].calculatedValue === combo.calculatedValue) {
        
        // This is a special pairing - combine both combinations into one element
        const combo2 = combinations[i + 1];
        const symbolImages = [];
        
        // Add both base symbols
        if (combo.element.symbol_image && selectedApparatus) {
          symbolImages.push(getTechnicalElementSymbol(combo.element.symbol_image, selectedApparatus) || '');
        }
        if (combo2.element.symbol_image && selectedApparatus) {
          symbolImages.push(getTechnicalElementSymbol(combo2.element.symbol_image, selectedApparatus) || '');
        }
        
        // Add only one criterion symbol (they're the same)
        if (combo.selectedCriteria.length > 0) {
          symbolImages.push(getCriteriaSymbolUrl(combo.selectedCriteria[0]));
        }
        
        processedElements.push({
          id: `apparatus-paired-${combo.element.id}-${combo2.element.id}-${Date.now()}`,
          type: 'DA' as RoutineElementType,
          symbolImages,
          value: combo.calculatedValue,
          originalData: { isPaired: true, combo1: combo, combo2: combo2 },
        });
        
        i += 2; // Skip next combination as it's already processed
      } else {
        // Standard combination - process normally
        const symbolImages = [];
        if (combo.element.symbol_image && selectedApparatus) {
          symbolImages.push(getTechnicalElementSymbol(combo.element.symbol_image, selectedApparatus) || '');
        }
        combo.selectedCriteria.forEach(criterionCode => {
          symbolImages.push(getCriteriaSymbolUrl(criterionCode));
        });
        
        processedElements.push({
          id: `apparatus-${combo.element.id}-${Date.now()}-${i}`,
          type: 'DA' as RoutineElementType,
          symbolImages,
          value: combo.calculatedValue || combo.element.value,
          originalData: combo,
        });
        
        i += 1;
      }
    }

    return processedElements;
  };

  // Calculate scores from routine elements
  const dbElements = routineElements.filter(el => el.type === 'DB');
  const totalDB = dbElements.reduce((sum, el) => sum + el.value, 0);
  const countDB = dbElements.length;
  
  const daElements = routineElements.filter(el => el.type === 'DA' || el.type === 'R');
  const totalDA = daElements.reduce((sum, el) => sum + el.value, 0);
  const countDA = daElements.length;

  const totalScore = totalDB + totalDA;

  const handleRemoveRoutineElement = (index: number) => {
    const element = routineElements[index];
    const originalData = element.originalData;

    // If removing a parent (DB), also remove all its children (DA sub-rows)
    if (!element.isSubRow && element.type === 'DB') {
      const childrenIds = routineElements
        .filter(item => item.parentId === element.id)
        .map(item => item.id);
      
      setRoutineElements(prev => 
        prev.filter(item => item.id !== element.id && !childrenIds.includes(item.id))
      );
    } else {
      // Remove single element (sub-row or standalone element)
      setRoutineElements(prev => prev.filter((_, idx) => idx !== index));
    }

    // Also remove from source arrays to keep them in sync
    // Check if this is a paired special DA
    if (originalData && typeof originalData === 'object' && 'isPaired' in originalData) {
      // Remove both combinations from the array
      const combo1Index = selectedApparatusCombinations.indexOf(originalData.combo1);
      const combo2Index = selectedApparatusCombinations.indexOf(originalData.combo2);
      
      setSelectedApparatusCombinations(prev => 
        prev.filter((_, idx) => idx !== combo1Index && idx !== combo2Index)
      );
    } else if ('turn_degrees' in originalData && 'description' in originalData && originalData.description) {
      // It's a Jump or Rotation
      if (selectedJumps.includes(originalData as SelectedJump)) {
        const jumpIndex = selectedJumps.indexOf(originalData as SelectedJump);
        handleRemoveJump(jumpIndex);
      } else {
        const rotationIndex = selectedRotations.indexOf(originalData as SelectedRotation);
        handleRemoveRotation(rotationIndex);
      }
    } else if ('element' in originalData) {
      // It's an ApparatusCombination
      const comboIndex = selectedApparatusCombinations.indexOf(originalData as ApparatusCombination);
      handleRemoveApparatusCombination(comboIndex);
    } else {
      // It's a Balance
      const balanceIndex = selectedBalances.indexOf(originalData as SelectedBalance);
      handleRemoveBalance(balanceIndex);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/routines")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">Routine Calculator</h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Basic Information Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name"
                type="text"
                placeholder="E.g. E. Kanaeva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apparatus">Apparatus</Label>
              <Select onValueChange={handleApparatusChange}>
                <SelectTrigger id="apparatus">
                  <SelectValue placeholder="Select apparatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoop">Hoop</SelectItem>
                  <SelectItem value="ball">Ball</SelectItem>
                  <SelectItem value="clubs">Clubs</SelectItem>
                  <SelectItem value="ribbon">Ribbon</SelectItem>
                  <SelectItem value="rope">Rope</SelectItem>
                  <SelectItem value="wa">WA</SelectItem>
                  <SelectItem value="gala">Gala</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input 
                id="year"
                type="text"
                placeholder="E.g 2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rulebook">Rulebook</Label>
              <Select>
                <SelectTrigger id="rulebook">
                  <SelectValue placeholder="Select rulebook" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fig-cop-2025-2028">FIG CoP 2025-2028</SelectItem>
                  <SelectItem value="sky-grace">Sky Grace</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Routine Elements Table */}
          {routineElements.length > 0 && (
            <Card className="p-6">
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Routine Elements</h2>
                  <div className="flex items-center gap-4">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">Total DB:</span>
                        <Badge variant="secondary" className="font-mono">{countDB}</Badge>
                        <span className="text-muted-foreground">Total DB Value:</span>
                        <Badge variant="secondary" className="font-mono">{totalDB.toFixed(2)}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">Total DA:</span>
                        <Badge variant="secondary" className="font-mono">{countDA}</Badge>
                        <span className="text-muted-foreground">Total DA Value:</span>
                        <Badge variant="secondary" className="font-mono">{totalDA.toFixed(2)}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">Total D-score:</span>
                        <Badge variant="default" className="font-mono">{totalScore.toFixed(2)}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-20">Item No.</TableHead>
                        <TableHead className="w-24">Item Type</TableHead>
                        <TableHead>Routine Elements</TableHead>
                        <TableHead className="w-24 text-right">D/Value</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <SortableContext
                      items={routineElements.map(el => el.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <TableBody>
                        {routineElements.map((element, index) => {
                          // Calculate item number based on parent-child relationship
                          let itemNumber = "";
                          if (element.isSubRow && element.parentId) {
                            // Find parent index to determine parent number
                            const parentIndex = routineElements.findIndex(el => el.id === element.parentId);
                            const parentNumber = routineElements.slice(0, parentIndex + 1).filter(el => !el.isSubRow).length;
                            // Find sub-index among siblings with same parent
                            const subIndex = routineElements
                              .slice(0, index)
                              .filter(el => el.isSubRow && el.parentId === element.parentId).length + 1;
                            itemNumber = `${parentNumber}.${subIndex}`;
                          } else {
                            // Count how many parent (non-sub-row) elements exist up to and including this one
                            const parentCount = routineElements.slice(0, index + 1).filter(el => !el.isSubRow).length;
                            itemNumber = `${parentCount}`;
                          }
                          
                          return (
                            <SortableRow
                              key={element.id}
                              element={element}
                              index={index}
                              itemNumber={itemNumber}
                              onRemove={() => handleRemoveRoutineElement(index)}
                            />
                          );
                        })}
                      </TableBody>
                    </SortableContext>
                  </Table>
                </DndContext>
              </div>
            </Card>
          )}

          {/* Category Buttons */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Construct Routine</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                className="h-16 text-base hover:scale-[1.02] transition-transform active:bg-purple-600 active:text-white active:border-purple-600"
                onClick={() => setActiveCategory(activeCategory === "elements" ? null : "elements")}
              >
                <span className="text-lg font-semibold mr-2">+</span> Elements (DB)
              </Button>
              
              <Button 
                variant="outline"
                className="h-16 text-base hover:scale-[1.02] transition-transform active:bg-purple-600 active:text-white active:border-purple-600"
                onClick={() => {
                  setActiveCategory(activeCategory === "apparatus" ? null : "apparatus");
                  if (activeCategory !== "apparatus") {
                    handleOpenApparatusDialog();
                  }
                }}
              >
                <span className="text-lg font-semibold mr-2">+</span> Apparatus Difficulty (DA)
              </Button>
              
              <Button 
                variant="outline"
                className="h-16 text-base hover:scale-[1.02] transition-transform active:bg-purple-600 active:text-white active:border-purple-600"
                onClick={() => setActiveCategory(activeCategory === "dynamic" ? null : "dynamic")}
              >
                <span className="text-lg font-semibold mr-2">+</span> Dynamic Element (R)
              </Button>
              
              <Button 
                variant="outline"
                className="h-16 text-base hover:scale-[1.02] transition-transform active:bg-purple-600 active:text-white active:border-purple-600"
                onClick={() => setActiveCategory(activeCategory === "dance" ? null : "dance")}
              >
                <span className="text-lg font-semibold mr-2">+</span> Dance Steps
              </Button>
            </div>

            {/* Elements (DB) - Jumps, Balances, Rotations */}
            {activeCategory === "elements" && (
              <div className="space-y-3 pt-4">
                <Button 
                  variant="outline"
                  className="w-full h-14 text-lg justify-between"
                  onClick={() => setJumpDialogOpen(true)}
                >
                  <div className="flex items-center gap-1">
                    <span>Jumps</span>
                    <JumpIcon className="!h-7 !w-7" />
                  </div>
                  <span className="text-sm">+ Add</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-14 text-lg justify-between"
                  onClick={() => setBalanceDialogOpen(true)}
                >
                  <div className="flex items-center gap-1">
                    <span>Balances</span>
                    <BalanceIcon className="!h-7 !w-7" />
                  </div>
                  <span className="text-sm">+ Add</span>
                </Button>

                <Button 
                  variant="outline"
                  className="w-full h-14 text-lg justify-between"
                  onClick={() => setRotationDialogOpen(true)}
                >
                  <div className="flex items-center gap-1">
                    <span>Rotations</span>
                    <RotationIcon className="!h-8 !w-8" />
                  </div>
                  <span className="text-sm">+ Add</span>
                </Button>
              </div>
            )}
            
            {activeCategory === "dynamic" && (
              <div className="pt-4 text-center text-muted-foreground">
                Dynamic Element configuration coming soon
              </div>
            )}
            
            {activeCategory === "dance" && (
              <div className="pt-4 text-center text-muted-foreground">
                Dance Steps configuration coming soon
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Jump Selection Dialog */}
      <JumpSelectionDialog
        open={jumpDialogOpen}
        onOpenChange={setJumpDialogOpen}
        onSelectJump={handleSelectJump}
        apparatus={selectedApparatus}
        onOpenApparatusDialog={() => {
          setSourceElementType('jump');
          setApparatusDialogOpen(true);
        }}
        selectedJumpIds={selectedJumpIds}
      />

      {/* Balance Selection Dialog */}
      <BalanceSelectionDialog
        open={balanceDialogOpen}
        onOpenChange={setBalanceDialogOpen}
        onSelectBalance={handleSelectBalance}
        apparatus={selectedApparatus}
        onOpenApparatusDialog={() => {
          setSourceElementType('balance');
          setApparatusDialogOpen(true);
        }}
        selectedBalanceIds={selectedBalanceIds}
      />

      {/* Rotation Selection Dialog */}
      <RotationSelectionDialog
        open={rotationDialogOpen}
        onOpenChange={setRotationDialogOpen}
        onSelectRotation={handleSelectRotation}
        apparatus={selectedApparatus}
        onOpenApparatusDialog={() => {
          setSourceElementType('rotation');
          setApparatusDialogOpen(true);
        }}
        selectedRotationIds={selectedRotationIds}
      />

      {/* Apparatus Selection Dialog */}
      <ApparatusSelectionDialog
        open={apparatusDialogOpen}
        onOpenChange={setApparatusDialogOpen}
        apparatus={selectedApparatus}
        onSelectElements={handleSelectApparatusElements}
        onSelectCombinations={handleSelectApparatusCombinations}
      />

      {/* Success Dialog */}
      <DBSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        onAddMoreElements={() => {
          setShowSuccessDialog(false);
          setApparatusDialogOpen(false);
          // Reopen the appropriate element dialog
          if (sourceElementType === 'jump') {
            setJumpDialogOpen(true);
          } else if (sourceElementType === 'rotation') {
            setRotationDialogOpen(true);
          } else if (sourceElementType === 'balance') {
            setBalanceDialogOpen(true);
          }
        }}
        onReturnToCalculator={() => {
          setShowSuccessDialog(false);
          setApparatusDialogOpen(false);
          setSourceElementType(null);
        }}
      />
    </div>
  );
};

export default RoutineCalculator;
