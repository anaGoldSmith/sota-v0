import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Calculator, GripVertical, ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { RotationIcon, JumpIcon, BalanceIcon } from "@/components/icons/DbSymbols";
import { JumpSelectionDialog } from "@/components/routine/JumpSelectionDialog";
import { BalanceSelectionDialog } from "@/components/routine/BalanceSelectionDialog";
import { RotationSelectionDialog } from "@/components/routine/RotationSelectionDialog";
import { ApparatusSelectionDialog, ApparatusCombination } from "@/components/routine/ApparatusSelectionDialog";
import { TechnicalElementsSelectionDialog } from "@/components/routine/TechnicalElementsSelectionDialog";
import { DBSuccessDialog } from "@/components/routine/DBSuccessDialog";
import { DBDASuccessDialog } from "@/components/routine/DBDASuccessDialog";
import { DBDAValidationDialog } from "@/components/routine/DBDAValidationDialog";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApparatusType, CombinedApparatusData } from "@/types/apparatus";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DndContext,
  closestCorners,
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

interface RiskComponent {
  name: string;
  symbol: string;
  value: number;
}

interface RiskData {
  type: 'R';
  label: string;
  value: number;
  rLevel?: number;
  symbols: Record<string, string>;
  throwSymbols?: string[];
  catchSymbols?: string[];
  axisLevelSymbol?: string;
  hasSeries?: boolean;
  hasDB?: boolean;
  isR2?: boolean;
  isCustomRisk?: boolean;
  riskCode?: string;
  riskName?: string;
  apparatus?: ApparatusType;
  components: RiskComponent[];
}

type RoutineElementType = 'DB' | 'DA' | 'DB/DA' | 'DB/TE' | 'TE' | 'R' | 'Steps';

interface RoutineElement {
  id: string;
  type: RoutineElementType;
  symbolImages: string[];
  value: number;
  originalData: SelectedJump | SelectedBalance | SelectedRotation | ApparatusCombination | RiskData | {
    isPaired: true;
    combo1: ApparatusCombination;
    combo2: ApparatusCombination;
  };
  // For combined DB/DA elements
  dbData?: {
    symbolImages: string[];
    value: number;
  };
  daData?: {
    symbolImages: string[];
    value: number;
  };
  // For Risk elements
  riskData?: RiskData;
  isExpanded?: boolean;
}

// Sortable Row Component
function SortableRow({ 
  element, 
  index, 
  itemNumber, 
  onRemove, 
  onModify,
  onToggleExpand,
  isMainRow 
}: { 
  element: RoutineElement; 
  index: number;
  itemNumber: string;
  onRemove: () => void;
  onModify?: () => void;
  onToggleExpand?: () => void;
  isMainRow: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id, disabled: !isMainRow });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderSymbols = (symbolImages: string[]) => (
    <div className="flex items-center gap-1 flex-wrap">
      {symbolImages.map((url, imgIndex) => {
        // Check if this is a text-based symbol (W or DB)
        const isTextSymbol = url && url.startsWith('TEXT:');
        
        if (isTextSymbol) {
          // Extract the text after 'TEXT:'
          const text = url.replace('TEXT:', '');
          return (
            <div 
              key={`${element.id}-symbol-${imgIndex}`}
              className="h-8 w-8 flex items-center justify-center"
            >
              <span className="text-2xl font-bold">{text}</span>
            </div>
          );
        }
        
        // Render as image
        return url && (
          <img
            key={`${element.id}-symbol-${imgIndex}`}
            src={url}
            alt="Symbol"
            className="h-8 w-8 object-contain"
          />
        );
      })}
    </div>
  );

  // Render Risk element with throw symbols, R subscript, axis/level symbol, and catch symbols
  const renderRiskSymbols = () => {
    if (element.type !== 'R' || !element.riskData) return null;
    
    const rLevel = element.riskData.rLevel || 2;
    const throwSymbols = element.riskData.throwSymbols || [];
    const catchSymbols = element.riskData.catchSymbols || [];
    const axisLevelSymbol = element.riskData.axisLevelSymbol;
    const hasSeries = element.riskData.hasSeries || false;
    const hasDB = element.riskData.hasDB || false;
    
    return (
      <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
        {/* Throw symbols (extra criteria) */}
        {throwSymbols.map((url, idx) => (
          <img
            key={`throw-${idx}`}
            src={url}
            alt="Throw symbol"
            className="h-8 w-8 object-contain"
          />
        ))}
        
        {/* R with subscript */}
        <span className="text-lg font-bold text-foreground mx-1">
          R<sub className="text-sm">{rLevel}</sub>
        </span>
        
        {/* S symbol for Series (non-R2 risks only) */}
        {hasSeries && (
          <span className="text-lg font-bold text-foreground">S</span>
        )}
        
        {/* DB symbol (non-R2 risks only - reminder that risk contains jumps) */}
        {hasDB && (
          <span className="text-lg font-bold text-foreground ml-0.5">DB</span>
        )}
        
        {/* Axis/Level Change symbol (displayed after R subscript, S, and DB) */}
        {axisLevelSymbol && (
          <img
            src={axisLevelSymbol}
            alt="Axis/Level Change"
            className="h-8 w-8 object-contain"
          />
        )}
        
        {/* Catch symbols (extra criteria) */}
        {catchSymbols.map((url, idx) => (
          <img
            key={`catch-${idx}`}
            src={url}
            alt="Catch symbol"
            className="h-8 w-8 object-contain"
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <TableRow 
        ref={isMainRow ? setNodeRef : undefined} 
        style={isMainRow ? style : undefined}
        className={!isMainRow ? "bg-muted/20" : ""}
      >
        <TableCell className="w-8 px-1">
          {isMainRow ? (
            <div
              {...listeners}
              {...attributes}
              className="cursor-grab active:cursor-grabbing flex items-center justify-center"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <div className="w-4" />
          )}
        </TableCell>
        <TableCell 
          className={`w-12 px-2 font-mono ${!isMainRow ? 'pl-6 text-muted-foreground' : ''} ${isMainRow && (element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'R') ? 'cursor-pointer' : ''}`}
          onClick={isMainRow && (element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'R') && onToggleExpand ? (e) => {
            e.stopPropagation();
            onToggleExpand();
          } : undefined}
        >
          <div className="flex items-center gap-1">
            {isMainRow && (element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'R') && (
              element.isExpanded ? 
                <ChevronDown className="h-3 w-3 text-muted-foreground" /> : 
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
            {itemNumber}
          </div>
        </TableCell>
        <TableCell className="w-12 px-2 font-medium">
          {element.type}
        </TableCell>
        <TableCell className="px-2">
          {element.type === 'R' ? renderRiskSymbols() : renderSymbols(element.symbolImages)}
        </TableCell>
        <TableCell className="w-16 px-2 text-right font-mono font-semibold">
          {element.value.toFixed(1)}
        </TableCell>
        <TableCell className="w-8 px-1">
          {isMainRow && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  draggable={false}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background z-50">
                {element.type === 'R' && onModify && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onModify(); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Modify
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
      
      {/* Expanded Risk Details Table */}
      {element.type === 'R' && element.isExpanded && element.riskData && (
        <TableRow className="bg-muted/10">
          <TableCell colSpan={6} className="p-4">
            <div className="ml-8 border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">Symbol</th>
                    <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">Risk Component</th>
                    <th className="py-2 px-4 text-right text-sm font-semibold text-muted-foreground">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {element.riskData.components.map((component, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? "bg-secondary/10" : ""}>
                      <td className="py-2 px-4">
                        {component.symbol ? (
                          <img 
                            src={component.symbol} 
                            alt={component.name} 
                            className="h-6 w-6 object-contain"
                          />
                        ) : component.name.toLowerCase().includes('series') ? (
                          <span className="text-lg font-bold text-foreground">S</span>
                        ) : (
                          <div className="h-6 w-6 bg-muted rounded" />
                        )}
                      </td>
                      <td className="py-2 px-4 font-medium">{component.name}</td>
                      <td className="py-2 px-4 text-right font-mono">{component.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

const RoutineCalculator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [jumpDialogOpen, setJumpDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [rotationDialogOpen, setRotationDialogOpen] = useState(false);
  const [apparatusDialogOpen, setApparatusDialogOpen] = useState(false);
  const [technicalElementsDialogOpen, setTechnicalElementsDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedApparatus, setSelectedApparatus] = useState<ApparatusType | null>(null);
  // Initialize routineElements from localStorage to persist across navigation
  const [routineElements, setRoutineElements] = useState<RoutineElement[]>(() => {
    const saved = localStorage.getItem('routineElements');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  // Persist routineElements to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('routineElements', JSON.stringify(routineElements));
  }, [routineElements]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDBDASuccessDialog, setShowDBDASuccessDialog] = useState(false);
  const [showDBDAValidationDialog, setShowDBDAValidationDialog] = useState(false);
  const [sourceElementType, setSourceElementType] = useState<'jump' | 'rotation' | 'balance' | null>(null);
  
  // Track pending DB element when adding apparatus difficulty
  const [pendingDbElement, setPendingDbElement] = useState<{
    element: SelectedJump | SelectedBalance | SelectedRotation;
    type: 'jump' | 'rotation' | 'balance';
    modifyingElementId?: string; // Track if we're modifying an existing element
  } | null>(null);
  
  // Track if we should reopen apparatus handling dialog
  const [shouldReopenApparatusHandling, setShouldReopenApparatusHandling] = useState(false);
  
  // Track current DA selection for "Change DA" functionality
  const [currentDACombinations, setCurrentDACombinations] = useState<ApparatusCombination[]>([]);
  const [currentDBSymbols, setCurrentDBSymbols] = useState<string[]>([]);
  const [currentDASymbols, setCurrentDASymbols] = useState<string[]>([]);
  
  // Store pending combined DB/DA element (only saved when user clicks "Save Combo")
  const [pendingCombinedElement, setPendingCombinedElement] = useState<RoutineElement | null>(null);
  
  const [selectedJumps, setSelectedJumps] = useState<SelectedJump[]>([]);
  const [selectedBalances, setSelectedBalances] = useState<SelectedBalance[]>([]);
  const [selectedRotations, setSelectedRotations] = useState<SelectedRotation[]>([]);
  const [selectedApparatusElements, setSelectedApparatusElements] = useState<CombinedApparatusData[]>([]);
  const [selectedApparatusCombinations, setSelectedApparatusCombinations] = useState<ApparatusCombination[]>([]);

  // Compute selected IDs for highlighting
  const selectedJumpIds = useMemo(() => new Set(selectedJumps.map(j => j.id)), [selectedJumps]);
  const selectedBalanceIds = useMemo(() => new Set(selectedBalances.map(b => b.id)), [selectedBalances]);
  const selectedRotationIds = useMemo(() => new Set(selectedRotations.map(r => r.id)), [selectedRotations]);

  // Create maps from element IDs to routineElement IDs for modification tracking
  const jumpToRoutineElementMap = useMemo(() => {
    const map = new Map<string, string>();
    routineElements.forEach(el => {
      if (el.originalData && 'turn_degrees' in el.originalData) {
        // This is a jump
        map.set(el.originalData.id, el.id);
      }
    });
    return map;
  }, [routineElements]);

  const balanceToRoutineElementMap = useMemo(() => {
    const map = new Map<string, string>();
    routineElements.forEach(el => {
      if (el.originalData && !('turn_degrees' in el.originalData) && el.type !== 'DA') {
        // This is a balance (has no turn_degrees and is not DA)
        const balance = el.originalData as SelectedBalance;
        if (balance.code && balance.code.length <= 4) {
          // Balances have short codes
          map.set(balance.id, el.id);
        }
      }
    });
    return map;
  }, [routineElements]);

  const rotationToRoutineElementMap = useMemo(() => {
    const map = new Map<string, string>();
    routineElements.forEach(el => {
      if (el.originalData && 'turn_degrees' in el.originalData) {
        const rotation = el.originalData as SelectedRotation;
        // Rotations have turn_degrees and longer codes than jumps
        if (rotation.code && rotation.code.length > 5) {
          map.set(rotation.id, el.id);
        }
      }
    });
    return map;
  }, [routineElements]);

  // Track elements saved without apparatus handling
  const [elementsWithoutApparatusHandling, setElementsWithoutApparatusHandling] = useState<Set<string>>(new Set());

  // Handle incoming risk data from StandardRisks page
  useEffect(() => {
    const state = location.state as { newRisk?: RiskData; modifyingElementId?: string } | null;
    if (state?.newRisk) {
      const riskData = state.newRisk;
      const modifyingId = state.modifyingElementId;
      
      if (modifyingId) {
        // Modifying existing risk - replace it
        setRoutineElements((prev) => 
          prev.map(el => {
            if (el.id === modifyingId) {
              return {
                ...el,
                symbolImages: [riskData.symbols["R2"] || ''],
                value: riskData.value,
                originalData: riskData,
                riskData: riskData,
              };
            }
            return el;
          })
        );
        
        toast({
          title: "Risk Updated",
          description: `Risk has been updated with value ${Number(riskData.value.toFixed(1))}.`,
        });
      } else {
        // Adding new risk
        const newElement: RoutineElement = {
          id: `risk-${Date.now()}`,
          type: 'R',
          symbolImages: [riskData.symbols["R2"] || ''],
          value: riskData.value,
          originalData: riskData,
          riskData: riskData,
          isExpanded: false,
        };
        setRoutineElements((prev) => [...prev, newElement]);
        
        toast({
          title: "Risk Added",
          description: `Risk R₊ with value ${Number(riskData.value.toFixed(1))} has been added to your routine.`,
        });
      }
      
      // Clear the state to prevent re-adding on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setRoutineElements((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      // Guard: if either index is not a main row, do nothing
      if (oldIndex === -1 || newIndex === -1) return items;

      // Use standard move for main rows (sub-rows are not sortable)
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleSelectJump = (jump: SelectedJump, withApparatusHandling: boolean = false, modifyingElementId?: string) => {
    // Only add to selectedJumps if not modifying an existing element
    if (!modifyingElementId) {
      setSelectedJumps((prev) => [...prev, jump]);
    }
    
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
      setPendingDbElement({ 
        element: jump, 
        type: 'jump',
        modifyingElementId 
      });
    }
  };

  const handleRemoveJump = (index: number) => {
    setSelectedJumps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectBalance = (balance: SelectedBalance, withApparatusHandling: boolean = false, modifyingElementId?: string) => {
    // Only add to selectedBalances if not modifying an existing element
    if (!modifyingElementId) {
      setSelectedBalances((prev) => [...prev, balance]);
    }
    
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
      setPendingDbElement({ 
        element: balance, 
        type: 'balance',
        modifyingElementId 
      });
    }
  };

  const handleRemoveBalance = (index: number) => {
    setSelectedBalances((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectRotation = (rotation: SelectedRotation, withApparatusHandling: boolean = false, modifyingElementId?: string) => {
    // Only add to selectedRotations if not modifying an existing element
    if (!modifyingElementId) {
      setSelectedRotations((prev) => [...prev, rotation]);
    }
    
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
      setPendingDbElement({ 
        element: rotation, 
        type: 'rotation',
        modifyingElementId 
      });
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
      const { element: dbElement, type: dbType, modifyingElementId } = pendingDbElement;
      
      // Process DA elements
      const daElements = processApparatusCombinationsToElements(combinations);
      
      // Get DB symbol images
      const dbSymbolImages = dbElement.symbol_image ? [
        getSymbolUrl(dbElement.symbol_image, 'jump-symbols') || ''
      ] : [];
      
      // Get DA symbol images (combine all DA elements' symbols)
      const daSymbolImages = daElements.flatMap(el => el.symbolImages);
      
      // Calculate total DA value
      const totalDaValue = daElements.reduce((sum, el) => sum + el.value, 0);
      
      // Store current DA selection and symbols for success dialog
      setCurrentDACombinations(combinations);
      setCurrentDBSymbols(dbSymbolImages);
      setCurrentDASymbols(daSymbolImages);
      
      // Create combined DB/DA element
      const combinedElement: RoutineElement = {
        id: modifyingElementId || `db-da-${dbType}-${dbElement.id}-${Date.now()}`,
        type: 'DB/DA',
        symbolImages: [...dbSymbolImages, ...daSymbolImages], // DB symbols first, then DA symbols
        value: dbElement.value + totalDaValue, // Total value
        originalData: dbElement,
        dbData: {
          symbolImages: dbSymbolImages,
          value: dbElement.value,
        },
        daData: {
          symbolImages: daSymbolImages,
          value: totalDaValue,
        },
        isExpanded: false,
      };
      
      // If modifying existing element, we'll replace it; otherwise store as pending
      if (modifyingElementId) {
        // Replace existing element immediately
        setRoutineElements((prev) => 
          prev.map(el => el.id === modifyingElementId ? combinedElement : el)
        );
      } else {
        // Store as pending (don't add to routine yet - wait for "Save Combo" click)
        setPendingCombinedElement(combinedElement);
      }
      
      // Check if the DA has Cr6DB criterion
      const hasCr6DB = combinations.some(combo => combo.selectedCriteria.includes('Cr6DB'));
      
      if (!hasCr6DB) {
        // Show validation dialog if DB criterion is missing
        setShowDBDAValidationDialog(true);
      } else {
        // Show success dialog directly if DB criterion is present
        setShowDBDASuccessDialog(true);
      }
      
      setApparatusDialogOpen(false);
    } else {
      // No pending DB - add DA as standalone elements (original behavior)
      const newElements = processApparatusCombinationsToElements(combinations);
      setRoutineElements((prev) => [...prev, ...newElements]);
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
    // Handle hardcoded text criteria
    if (criterionCode === 'Cr5W') return 'TEXT:W';
    if (criterionCode === 'Cr6DB') return 'TEXT:DB';
    
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
  const dbElements = routineElements.filter(el => el.type === 'DB' || el.type === 'DB/DA');
  const totalDB = dbElements.reduce((sum, el) => {
    // For DB/DA elements, only count DB value
    if (el.type === 'DB/DA' && el.dbData) {
      return sum + el.dbData.value;
    }
    return sum + el.value;
  }, 0);
  const countDB = dbElements.length;
  
  const daElements = routineElements.filter(el => el.type === 'DA' || el.type === 'R' || el.type === 'DB/DA');
  const totalDA = daElements.reduce((sum, el) => {
    // For DB/DA elements, only count DA value
    if (el.type === 'DB/DA' && el.daData) {
      return sum + el.daData.value;
    }
    if (el.type === 'DA' || el.type === 'R') {
      return sum + el.value;
    }
    return sum;
  }, 0);
  const countDA = daElements.length;

  const totalScore = totalDB + totalDA;

  const handleToggleExpand = (index: number) => {
    setRoutineElements(prev => prev.map((el, idx) => 
      idx === index ? { ...el, isExpanded: !el.isExpanded } : el
    ));
  };

  const handleRemoveRoutineElement = (index: number) => {
    const element = routineElements[index];
    const originalData = element.originalData;

    // Remove the element from routine
    setRoutineElements(prev => prev.filter((_, idx) => idx !== index));

    // Remove from source arrays by ID to keep them in sync
    if (originalData && typeof originalData === 'object' && 'id' in originalData && typeof originalData.id === 'string') {
      const elementId = originalData.id;
      
      // Remove from selected jumps
      setSelectedJumps(prev => prev.filter(j => j.id !== elementId));
      
      // Remove from selected balances
      setSelectedBalances(prev => prev.filter(b => b.id !== elementId));
      
      // Remove from selected rotations
      setSelectedRotations(prev => prev.filter(r => r.id !== elementId));
      
      // Remove from elements without apparatus handling tracking
      setElementsWithoutApparatusHandling(prev => {
        const newSet = new Set(prev);
        newSet.delete(elementId);
        return newSet;
      });
    } else if (originalData && typeof originalData === 'object' && 'isPaired' in originalData) {
      // Handle paired special DA
      const combo1Index = selectedApparatusCombinations.indexOf(originalData.combo1);
      const combo2Index = selectedApparatusCombinations.indexOf(originalData.combo2);
      
      setSelectedApparatusCombinations(prev => 
        prev.filter((_, idx) => idx !== combo1Index && idx !== combo2Index)
      );
    } else if ('element' in originalData) {
      // It's an ApparatusCombination
      const comboIndex = selectedApparatusCombinations.indexOf(originalData as ApparatusCombination);
      handleRemoveApparatusCombination(comboIndex);
    }
  };

  const handleMarkWithoutApparatusHandling = (id: string) => {
    setElementsWithoutApparatusHandling(prev => new Set(prev).add(id));
  };

  const handleRemoveElement = (elementId: string) => {
    // Remove from routine elements
    setRoutineElements(prev => prev.filter(el => {
      // Check if this is a simple element (jump, balance, rotation)
      if ('id' in el.originalData && typeof el.originalData.id === 'string') {
        return el.originalData.id !== elementId;
      }
      return true;
    }));

    // Remove from selected jumps
    setSelectedJumps(prev => prev.filter(j => j.id !== elementId));
    
    // Remove from selected balances
    setSelectedBalances(prev => prev.filter(b => b.id !== elementId));
    
    // Remove from selected rotations
    setSelectedRotations(prev => prev.filter(r => r.id !== elementId));

    // Remove from elements without apparatus handling tracking
    setElementsWithoutApparatusHandling(prev => {
      const newSet = new Set(prev);
      newSet.delete(elementId);
      return newSet;
    });
  };

  // Handle modifying a risk element
  const handleModifyRisk = (elementId: string) => {
    const element = routineElements.find(el => el.id === elementId);
    if (!element || element.type !== 'R' || !element.riskData) return;
    
    const riskData = element.riskData;
    
    // Navigate to the appropriate page based on whether it's a custom or standard risk
    if (riskData.isCustomRisk) {
      // Navigate to Create Custom Risk page with existing data
      navigate('/create-custom-risk', {
        state: {
          apparatus: riskData.apparatus || selectedApparatus,
          modifyingElementId: elementId,
          existingRiskData: riskData,
        },
      });
    } else {
      // Navigate to Standard Risk Detail page with existing data
      navigate('/standard-risk-detail', {
        state: {
          apparatus: riskData.apparatus || selectedApparatus,
          selectedRisk: {
            risk_code: riskData.riskCode || 'r2',
            name: riskData.riskName || 'Standard Risk',
          },
          modifyingElementId: elementId,
          existingRiskData: riskData,
        },
      });
    }
  };

  // Handle technical elements selection for apparatus handling
  const handleSelectTechnicalElements = (elements: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    symbol_image: string | null;
  }>) => {
    if (pendingDbElement && elements.length > 0) {
      const { element: dbElement, type: dbType, modifyingElementId } = pendingDbElement;
      
      // Get DB symbol images
      const dbSymbolImages = dbElement.symbol_image ? [
        getSymbolUrl(dbElement.symbol_image, 'jump-symbols') || ''
      ] : [];
      
      // Get technical elements symbol images
      const teSymbolImages = elements.map(el => {
        if (el.symbol_image && selectedApparatus) {
          return getTechnicalElementSymbol(el.symbol_image, selectedApparatus) || '';
        }
        return '';
      }).filter(Boolean);
      
      // Store symbols for success display
      setCurrentDBSymbols(dbSymbolImages);
      setCurrentDASymbols(teSymbolImages);
      
      // Create combined DB/TE element
      const combinedElement: RoutineElement = {
        id: modifyingElementId || `db-te-${dbType}-${dbElement.id}-${Date.now()}`,
        type: 'DB/TE',
        symbolImages: [...dbSymbolImages, ...teSymbolImages],
        value: dbElement.value, // Technical elements don't add value, just validate DB
        originalData: dbElement,
        dbData: {
          symbolImages: dbSymbolImages,
          value: dbElement.value,
        },
        daData: {
          symbolImages: teSymbolImages,
          value: 0, // Technical elements don't have point value
        },
        isExpanded: false,
      };
      
      if (modifyingElementId) {
        // Replace existing element
        setRoutineElements((prev) => 
          prev.map(el => el.id === modifyingElementId ? combinedElement : el)
        );
      } else {
        // Add new combined element
        setRoutineElements((prev) => [...prev, combinedElement]);
      }
      
      // Clear pending state
      setPendingDbElement(null);
      setSourceElementType(null);
      
      toast({
        title: "Technical Elements Added",
        description: `Added ${elements.length} technical element(s) to DB.`,
      });
    }
  };

  const handleOpenTechnicalElementsDialog = () => {
    setTechnicalElementsDialogOpen(true);
  };

  const handleTechnicalElementsGoBack = () => {
    // Reopen appropriate element selection dialog with apparatus handling
    setShouldReopenApparatusHandling(true);
    if (pendingDbElement?.type === 'jump') {
      setJumpDialogOpen(true);
    } else if (pendingDbElement?.type === 'balance') {
      setBalanceDialogOpen(true);
    } else if (pendingDbElement?.type === 'rotation') {
      setRotationDialogOpen(true);
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

          {/* Category Buttons */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Construct Routine</h2>
            
            <div className="grid grid-cols-2 gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline"
                    className="h-16 text-base hover:scale-[1.02] transition-transform"
                  >
                    <span className="text-lg font-semibold mr-2">+</span> Elements (DB)
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[300px] bg-background z-50" align="start">
                  <DropdownMenuItem 
                    className="h-14 text-lg cursor-pointer"
                    onClick={() => setJumpDialogOpen(true)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1">
                        <span>Jumps</span>
                        <JumpIcon className="!h-7 !w-7" />
                      </div>
                      <span className="text-sm">+ Add</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="h-14 text-lg cursor-pointer"
                    onClick={() => setBalanceDialogOpen(true)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1">
                        <span>Balances</span>
                        <BalanceIcon className="!h-7 !w-7" />
                      </div>
                      <span className="text-sm">+ Add</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="h-14 text-lg cursor-pointer"
                    onClick={() => setRotationDialogOpen(true)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1">
                        <span>Rotations</span>
                        <RotationIcon className="!h-8 !w-8" />
                      </div>
                      <span className="text-sm">+ Add</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
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
                onClick={() => navigate("/dynamic-elements-risk", { state: { apparatus: selectedApparatus } })}
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

            
            {activeCategory === "dance" && (
              <div className="pt-4 text-center text-muted-foreground">
                Dance Steps configuration coming soon
              </div>
            )}
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
                  collisionDetection={closestCorners}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-20">Item No.</TableHead>
                        <TableHead className="w-24">Item Type</TableHead>
                        <TableHead>Routine Elements</TableHead>
                        <TableHead className="w-24 text-right">Value</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <SortableContext
                      items={routineElements.map(el => el.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <TableBody>
                        {routineElements.map((element, index) => {
                          // Calculate item number - sequential for main rows
                          const itemNumber = `${index + 1}`;
                          
                          const rows = [];
                          
                          // Main row
                          rows.push(
                            <SortableRow
                              key={element.id}
                              element={element}
                              index={index}
                              itemNumber={itemNumber}
                              onRemove={() => handleRemoveRoutineElement(index)}
                              onModify={element.type === 'R' ? () => handleModifyRisk(element.id) : undefined}
                              onToggleExpand={(element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'R') ? () => handleToggleExpand(index) : undefined}
                              isMainRow={true}
                            />
                          );
                          
                          // If expanded and has DB/DA or DB/TE breakdown, show sub-rows
                          if ((element.type === 'DB/DA' || element.type === 'DB/TE') && element.isExpanded && element.dbData && element.daData) {
                            // DB sub-row
                            rows.push(
                              <SortableRow
                                key={`${element.id}-db-sub`}
                                element={{
                                  id: `${element.id}-db-sub`,
                                  type: 'DB',
                                  symbolImages: element.dbData.symbolImages,
                                  value: element.dbData.value,
                                  originalData: element.originalData,
                                }}
                                index={index}
                                itemNumber={`${itemNumber}.1`}
                                onRemove={() => {}}
                                isMainRow={false}
                              />
                            );
                            
                            // DA or TE sub-row
                            rows.push(
                              <SortableRow
                                key={`${element.id}-da-sub`}
                                element={{
                                  id: `${element.id}-da-sub`,
                                  type: element.type === 'DB/TE' ? 'TE' as RoutineElementType : 'DA',
                                  symbolImages: element.daData.symbolImages,
                                  value: element.daData.value,
                                  originalData: element.originalData,
                                }}
                                index={index}
                                itemNumber={`${itemNumber}.2`}
                                onRemove={() => {}}
                                isMainRow={false}
                              />
                            );
                          }
                          
                          return rows;
                        })}
                      </TableBody>
                    </SortableContext>
                  </Table>
                </DndContext>
              </div>
            </Card>
          )}
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
        onOpenTechnicalElementsDialog={handleOpenTechnicalElementsDialog}
        selectedJumpIds={selectedJumpIds}
        shouldReopenApparatusHandling={shouldReopenApparatusHandling && pendingDbElement?.type === 'jump'}
        onApparatusHandlingReopened={() => setShouldReopenApparatusHandling(false)}
        elementsWithoutApparatusHandling={elementsWithoutApparatusHandling}
        onMarkWithoutApparatusHandling={handleMarkWithoutApparatusHandling}
        onRemoveElement={handleRemoveElement}
        routineElementsMap={jumpToRoutineElementMap}
        routineElements={routineElements}
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
        onOpenTechnicalElementsDialog={handleOpenTechnicalElementsDialog}
        selectedBalanceIds={selectedBalanceIds}
        shouldReopenApparatusHandling={shouldReopenApparatusHandling && pendingDbElement?.type === 'balance'}
        onApparatusHandlingReopened={() => setShouldReopenApparatusHandling(false)}
        elementsWithoutApparatusHandling={elementsWithoutApparatusHandling}
        onMarkWithoutApparatusHandling={handleMarkWithoutApparatusHandling}
        onRemoveElement={handleRemoveElement}
        routineElementsMap={balanceToRoutineElementMap}
        routineElements={routineElements}
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
        onOpenTechnicalElementsDialog={handleOpenTechnicalElementsDialog}
        selectedRotationIds={selectedRotationIds}
        shouldReopenApparatusHandling={shouldReopenApparatusHandling && pendingDbElement?.type === 'rotation'}
        onApparatusHandlingReopened={() => setShouldReopenApparatusHandling(false)}
        elementsWithoutApparatusHandling={elementsWithoutApparatusHandling}
        onMarkWithoutApparatusHandling={handleMarkWithoutApparatusHandling}
        onRemoveElement={handleRemoveElement}
        routineElementsMap={rotationToRoutineElementMap}
        routineElements={routineElements}
      />

      {/* Apparatus Selection Dialog */}
      <ApparatusSelectionDialog
        open={apparatusDialogOpen}
        onOpenChange={setApparatusDialogOpen}
        apparatus={selectedApparatus}
        onSelectElements={handleSelectApparatusElements}
        onSelectCombinations={handleSelectApparatusCombinations}
        isForDbElement={pendingDbElement !== null}
        onGoBackToApparatusHandling={() => {
          // Close apparatus dialog
          setApparatusDialogOpen(false);
          // Reopen appropriate element selection dialog with apparatus handling
          setShouldReopenApparatusHandling(true);
          if (pendingDbElement?.type === 'jump') {
            setJumpDialogOpen(true);
          } else if (pendingDbElement?.type === 'balance') {
            setBalanceDialogOpen(true);
          } else if (pendingDbElement?.type === 'rotation') {
            setRotationDialogOpen(true);
          }
        }}
      />

      {/* Success Dialog */}
      <DBSuccessDialog
        open={showSuccessDialog}
        onOpenChange={(open) => {
          setShowSuccessDialog(open);
          // Always close apparatus dialog when success dialog closes
          if (!open) {
            setApparatusDialogOpen(false);
          }
        }}
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

      {/* DB/DA Validation Dialog */}
      <DBDAValidationDialog
        open={showDBDAValidationDialog}
        onOpenChange={setShowDBDAValidationDialog}
        onConfirm={() => {
          setShowDBDAValidationDialog(false);
          setShowDBDASuccessDialog(true);
        }}
        onReview={() => {
          setShowDBDAValidationDialog(false);
          setApparatusDialogOpen(true);
        }}
      />

      {/* DB/DA Success Dialog */}
      <DBDASuccessDialog
        open={showDBDASuccessDialog}
        onOpenChange={setShowDBDASuccessDialog}
        onChangeDA={() => {
          // Discard current DA selection and reopen apparatus dialog
          setShowDBDASuccessDialog(false);
          setApparatusDialogOpen(true);
          // pendingCombinedElement will be overwritten when user selects new DA
        }}
        onSaveCombination={() => {
          // Save the pending combined element to routine
          if (pendingCombinedElement) {
            setRoutineElements((prev) => [...prev, pendingCombinedElement]);
            setPendingCombinedElement(null);
          }
          setShowDBDASuccessDialog(false);
          setPendingDbElement(null);
          setSourceElementType(null);
          setCurrentDACombinations([]);
          setCurrentDBSymbols([]);
          setCurrentDASymbols([]);
        }}
        dbSymbols={currentDBSymbols}
        daSymbols={currentDASymbols}
      />

      {/* Technical Elements Selection Dialog */}
      <TechnicalElementsSelectionDialog
        open={technicalElementsDialogOpen}
        onOpenChange={setTechnicalElementsDialogOpen}
        apparatus={selectedApparatus}
        onSelectTechnicalElements={handleSelectTechnicalElements}
        onGoBack={handleTechnicalElementsGoBack}
      />
    </div>
  );
};

export default RoutineCalculator;
