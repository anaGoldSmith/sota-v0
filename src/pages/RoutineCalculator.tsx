import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Calculator, GripVertical, ChevronDown, ChevronRight, MoreVertical, Pencil, Trash2, Info, Save, X, BookOpen, ClipboardCheck, Check, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { RotationIcon, JumpIcon, BalanceIcon } from "@/components/icons/DbSymbols";
import { NotesWithSymbols } from "@/components/routine/NotesWithSymbols";
import { JumpSelectionDialog } from "@/components/routine/JumpSelectionDialog";
import { BalanceSelectionDialog } from "@/components/routine/BalanceSelectionDialog";
import { RotationSelectionDialog } from "@/components/routine/RotationSelectionDialog";
import { ApparatusSelectionDialog, ApparatusCombination } from "@/components/routine/ApparatusSelectionDialog";
import { TechnicalElementsSelectionDialog } from "@/components/routine/TechnicalElementsSelectionDialog";
import { ElementInformationDialog, type HandlingItem } from "@/components/routine/ElementInformationDialog";
import type { FouetteComponent } from "@/components/routine/FouetteComponentsEditor";
import type { FouetteShape } from "@/components/routine/FouetteShapesSelector";
import { DBSuccessDialog } from "@/components/routine/DBSuccessDialog";
import { DBDASuccessDialog } from "@/components/routine/DBDASuccessDialog";
import { DBDAValidationDialog } from "@/components/routine/DBDAValidationDialog";
import { useState, useMemo, useEffect, useRef } from "react";
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
  flat: boolean;
  slow_turn: boolean;
}

interface SelectedRotation {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
  extra_value: number | null;
  symbol_image: string | null;
}

interface RiskComponent {
  name: string;
  symbol: string;
  value: number;
  rotationTag?: 'ACRO' | 'VER' | 'DB' | 'UNK'; // For rotation specification rows
  rotationCount?: number; // Number of rotations (1, 2, or series count)
  rotationSpec?: string; // Specification label (e.g., "Roll Forward")
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
  dbCount?: number;   // Number of DB elements in the risk (3 for non-R2, 0 for R2)
  dbValue?: number;   // Total DB value from thr_, utf_, catch_ components
  // Full structured metadata for edit restoration
  editMetadata?: {
    rotationEntries?: any[];
    throwRotationSpec?: any;
    catchRotationSpec?: any;
    throwDuringDB?: any;
    catchDuringDB?: any;
    extraThrow?: any;
    thr2HasThr6?: boolean;
    selectedThrowCode?: string;
    selectedCatchCode?: string;
  };
}

type RoutineElementType = 'DB' | 'DA' | 'DB/DA' | 'DB/TE' | 'DB/TE/DA' | 'TE' | 'R' | 'R/DB' | 'Steps';

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
    name?: string;
    code?: string;
    elementType?: 'jump' | 'rotation' | 'balance';
    rotationCount?: number;
    fouetteComponents?: FouetteComponent[];
    fouetteShapes?: FouetteShape[];
    isSeries?: boolean;
    isJumpSeries?: boolean;
    jumpCount?: number;
    isFlatFoot?: boolean;
    isSlowTurn?: boolean;
    shapesExpanded?: boolean; // Track if shapes are expanded in breakdown
  };
  daData?: {
    symbolImages: string[];
    value: number;
    name?: string;
  };
  // For DB/TE with multiple technical elements
  teElements?: Array<{
    id: string;
    code: string;
    name: string;
    symbolImage: string;
    value: number;
  }>;
  // For DB/DA with multiple apparatus difficulty elements
  daElements?: Array<{
    id: string;
    name: string;
    symbolImages: string[];
    value: number;
  }>;
  // Unified handling order (preserves drag-drop order for breakdown display)
  handlingOrder?: Array<{ type: 'te' | 'da'; id: string }>;
  // For Risk elements
  riskData?: RiskData;
  isExpanded?: boolean;
  // Adjustments attached to this element
  adjustments?: Array<{ id: string; name: string; value: number; isEditing?: boolean }>;
}

// Sortable Row Component
function SortableRow({ 
  element, 
  index, 
  itemNumber, 
  onRemove, 
  onModify,
  onToggleExpand,
  onAddAdjustment,
  onUpdateAdjustment,
  onRemoveAdjustment,
  onToggleAdjustmentEdit,
  isMainRow,
  isViewMode,
}: { 
  element: RoutineElement; 
  index: number;
  itemNumber: string;
  onRemove: () => void;
  onModify?: () => void;
  onToggleExpand?: () => void;
  onAddAdjustment?: () => void;
  onUpdateAdjustment?: (adjId: string, name: string, value: number) => void;
  onRemoveAdjustment?: (adjId: string) => void;
  onToggleAdjustmentEdit?: (adjId: string, isEditing: boolean) => void;
  isMainRow: boolean;
  isViewMode?: boolean;
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

  const MAX_VISIBLE_SYMBOLS = 6;

  // Render stacked symbols for jump series (DB on bottom, TE/DA on top)
  const renderJumpSeriesSymbols = () => {
    if (!element.dbData?.isJumpSeries || !element.dbData?.jumpCount) {
      return null;
    }
    
    const jumpCount = element.dbData.jumpCount;
    const dbSymbol = element.dbData.symbolImages?.[0];
    const teElements = element.teElements || [];
    const daElements = element.daElements || [];
    const handlingOrder = element.handlingOrder || [];
    
    // Build handling items in order
    const orderedHandling: Array<{ type: 'te' | 'da'; symbol: string | null }> = [];
    
    if (handlingOrder.length > 0) {
      handlingOrder.forEach(order => {
        if (order.type === 'te') {
          const te = teElements.find(t => t.id === order.id);
          orderedHandling.push({ type: 'te', symbol: te?.symbolImage || null });
        } else {
          const da = daElements.find(d => d.id === order.id);
          // For DA, we'll show "DA" text instead of symbols
          orderedHandling.push({ type: 'da', symbol: null });
        }
      });
    } else {
      // Fallback: TEs first, then DAs
      teElements.forEach(te => {
        orderedHandling.push({ type: 'te', symbol: te.symbolImage || null });
      });
      daElements.forEach(() => {
        orderedHandling.push({ type: 'da', symbol: null });
      });
    }
    
    // Create stacked symbols for each jump
    const stackedSymbols: JSX.Element[] = [];
    
    for (let i = 0; i < jumpCount; i++) {
      const handling = orderedHandling[i];
      
      stackedSymbols.push(
        <div key={`jump-stack-${i}`} className="flex flex-col items-center justify-center relative">
          {/* Top: TE symbol or "DA" text */}
          {handling && (
            <div className="h-5 w-8 flex items-center justify-center -mb-1">
              {handling.type === 'te' && handling.symbol ? (
                <img 
                  src={handling.symbol} 
                  alt="TE" 
                  className="h-5 w-5 object-contain" 
                />
              ) : handling.type === 'da' ? (
                <span className="text-xs font-bold text-black">DA</span>
              ) : null}
            </div>
          )}
          {/* Bottom: DB (jump) symbol */}
          {dbSymbol && (
            <img 
              src={dbSymbol} 
              alt="Jump" 
              className="h-8 w-8 object-contain" 
            />
          )}
        </div>
      );
    }
    
    return (
      <div className="flex items-end gap-2 flex-nowrap">
        <span className="text-sm font-bold flex-shrink-0">S<sub>{jumpCount}</sub></span>
        {stackedSymbols}
      </div>
    );
  };

  const renderSymbols = (symbolImages: string[]) => {
    // Check if this is a jump series - use special stacked rendering
    if (element.dbData?.isJumpSeries && element.dbData?.jumpCount) {
      return renderJumpSeriesSymbols();
    }
    
    const visibleSymbols = symbolImages.slice(0, MAX_VISIBLE_SYMBOLS);
    const hiddenCount = symbolImages.length - MAX_VISIBLE_SYMBOLS;
    
    return (
      <div className="flex items-center gap-1 flex-nowrap">
        {visibleSymbols.map((url, imgIndex) => {
          // Check if this is a text-based symbol (W or DB)
          const isTextSymbol = url && url.startsWith('TEXT:');
          
          if (isTextSymbol) {
            // Extract the text after 'TEXT:'
            const text = url.replace('TEXT:', '');
            return (
              <div 
                key={`${element.id}-symbol-${imgIndex}`}
                className="h-8 w-8 flex items-center justify-center flex-shrink-0"
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
              className="h-8 w-8 object-contain flex-shrink-0"
            />
          );
        })}
        {hiddenCount > 0 && (
          <span className="text-xs font-medium bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 flex-shrink-0">
            +{hiddenCount}
          </span>
        )}
      </div>
    );
  };

  // Render Risk element with throw symbols, R subscript, axis/level symbol, and catch symbols
  const renderRiskSymbols = () => {
    if ((element.type !== 'R' && element.type !== 'R/DB') || !element.riskData) return null;
    
    const rLevel = element.riskData.rLevel || 2;
    const throwSymbols = element.riskData.throwSymbols || [];
    const catchSymbols = element.riskData.catchSymbols || [];
    const axisLevelSymbol = element.riskData.axisLevelSymbol;
    const hasSeries = element.riskData.hasSeries || false;
    const hasDB = element.riskData.hasDB || false;
    
    // Build all symbol items for truncation logic
    type SymbolItem = { type: 'image'; url: string; key: string } | { type: 'text'; text: string; key: string };
    const allSymbols: SymbolItem[] = [];
    
    // Add throw symbols
    throwSymbols.forEach((url, idx) => {
      allSymbols.push({ type: 'image', url, key: `throw-${idx}` });
    });
    
    // Add R subscript as text
    allSymbols.push({ type: 'text', text: `R₍${rLevel}₎`, key: 'r-subscript' });
    
    // Add S for series
    if (hasSeries) {
      allSymbols.push({ type: 'text', text: 'S', key: 'series' });
    }
    
    // Add DB
    if (hasDB) {
      allSymbols.push({ type: 'text', text: 'DB', key: 'db' });
    }
    
    // Add axis/level symbol
    if (axisLevelSymbol) {
      allSymbols.push({ type: 'image', url: axisLevelSymbol, key: 'axis-level' });
    }
    
    // Add catch symbols
    catchSymbols.forEach((url, idx) => {
      allSymbols.push({ type: 'image', url, key: `catch-${idx}` });
    });
    
    const visibleSymbols = allSymbols.slice(0, MAX_VISIBLE_SYMBOLS);
    const hiddenCount = allSymbols.length - MAX_VISIBLE_SYMBOLS;
    
    return (
      <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
        {visibleSymbols.map((item) => {
          if (item.type === 'text') {
            if (item.key === 'r-subscript') {
              return (
                <span key={item.key} className="text-lg font-bold text-foreground mx-1 flex-shrink-0">
                  R<sub className="text-sm">{rLevel}</sub>
                </span>
              );
            }
            return (
              <span key={item.key} className="text-lg font-bold text-foreground flex-shrink-0">
                {item.text}
              </span>
            );
          }
          return (
            <img
              key={item.key}
              src={item.url}
              alt="Symbol"
              className="h-8 w-8 object-contain flex-shrink-0"
            />
          );
        })}
        {hiddenCount > 0 && (
          <span className="text-xs font-medium bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 flex-shrink-0">
            +{hiddenCount}
          </span>
        )}
      </div>
    );
  };

  return (
    <>
      <TableRow 
        ref={isMainRow ? setNodeRef : undefined} 
        style={isMainRow ? style : undefined}
        className="bg-white dark:bg-background"
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
          className={`w-12 px-2 font-mono ${!isMainRow ? 'pl-6 text-muted-foreground' : ''} ${isMainRow && (element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'DB/TE/DA' || element.type === 'R' || element.type === 'R/DB' || (element.adjustments && element.adjustments.length > 0)) ? 'cursor-pointer' : ''}`}
          onClick={isMainRow && onToggleExpand ? (e) => {
            e.stopPropagation();
            onToggleExpand();
          } : undefined}
        >
          <div className="flex items-center gap-1">
            {itemNumber}
            {isMainRow && (element.type === 'DB' || element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'DB/TE/DA' || element.type === 'R' || element.type === 'R/DB' || (element.adjustments && element.adjustments.length > 0)) && (
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${element.isExpanded ? '' : '-rotate-90'}`} />
            )}
          </div>
        </TableCell>
        <TableCell className="w-12 px-2 font-medium">
          {element.type === 'Steps' ? 'S' : element.type}
        </TableCell>
        <TableCell className="px-2">
          {element.type === 'Steps' ? (
            <span className="text-sm font-medium text-foreground">Dance Steps</span>
          ) : (element.type === 'R' || element.type === 'R/DB') ? renderRiskSymbols() : renderSymbols(element.symbolImages)}
        </TableCell>
        <TableCell className="w-16 px-2 text-right font-mono font-semibold">
          {(() => {
            const adjTotal = (element.adjustments || []).reduce((sum, adj) => sum + adj.value, 0);
            const displayValue = element.value + adjTotal;
            return displayValue.toFixed(1);
          })()}
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
                {(element.type === 'R' || element.type === 'R/DB' || element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'DB/TE/DA' || element.type === 'DB') && onModify && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onModify(); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    View / Edit
                  </DropdownMenuItem>
                )}
                {onAddAdjustment && !isViewMode && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAddAdjustment(); }}>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Add Adjustment
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
      {(element.type === 'R' || element.type === 'R/DB') && element.isExpanded && element.riskData && (
        <TableRow className="bg-white dark:bg-background">
          <TableCell colSpan={6} className="p-4">
            <div className="ml-8 border rounded-lg overflow-hidden">
              <table className="w-full">
                 <thead className="bg-white dark:bg-background">
                   <tr>
                     <th className="py-2 px-4 text-center text-sm font-semibold text-muted-foreground">Type</th>
                     <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">Symbol</th>
                     <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">Risk Component</th>
                     <th className="py-2 px-4 text-right text-sm font-semibold text-muted-foreground">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {element.riskData.components.map((component, idx) => (
                      <tr key={idx} className="border-b border-border/30 last:border-b-0">
                        <td className="py-2 px-4 text-center">
                          {component.rotationTag && (
                            <Badge 
                              variant="outline" 
                              className={
                                component.rotationTag === 'ACRO' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300' :
                                component.rotationTag === 'VER' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300' :
                                component.rotationTag === 'DB' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300' :
                                'bg-muted text-muted-foreground border-border'
                              }
                            >
                              {component.rotationTag}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          {component.symbol ? (
                            <img 
                              src={component.symbol} 
                              alt={component.name} 
                              className="h-6 w-6 object-contain"
                            />
                          ) : component.name.toLowerCase().includes('series') || (component.rotationTag && component.rotationCount && component.rotationCount >= 3) ? (
                            <span className="text-lg font-bold text-foreground">S</span>
                          ) : (
                            <div className="h-6 w-6 bg-white dark:bg-background rounded border border-border/30" />
                          )}
                        </td>
                        <td className="py-2 px-4 font-medium">
                          <NotesWithSymbols 
                            notes={component.name} 
                            symbolMap={Object.fromEntries(
                              ['Cr1V','Cr2H','Cr3L','Cr4F','Cr5W','Cr6DB','Cr7R'].map(code => [
                                code, 
                                supabase.storage.from('criteria-symbols').getPublicUrl(`${code}.png`).data.publicUrl
                              ])
                            )} 
                          />
                        </td>
                        <td className="py-2 px-4 text-right font-mono">{component.value}</td>
                      </tr>
                    ))}
                     {/* Adjustment rows within risk breakdown */}
                     {element.adjustments && element.adjustments.length > 0 && element.adjustments.map((adj) => (
                       <tr key={adj.id} className="border-b border-border/30 last:border-b-0 bg-amber-50/50 dark:bg-amber-900/10">
                         <td className="py-2 px-4 text-center">
                           <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 text-[10px]">ADJ</Badge>
                         </td>
                         <td className="py-2 px-4">
                           <span className="text-sm font-bold text-amber-600 dark:text-amber-400">ADJ</span>
                         </td>
                         <td className="py-2 px-4">
                           {adj.isEditing && !isViewMode ? (
                             <Input
                               className="h-7 text-sm max-w-[180px]"
                               placeholder="Description..."
                               value={adj.name}
                               onChange={(e) => onUpdateAdjustment?.(adj.id, e.target.value, adj.value)}
                               onClick={(e) => e.stopPropagation()}
                             />
                           ) : (
                             <span className="text-sm font-medium">{adj.name || 'Adjustment'}</span>
                           )}
                         </td>
                         <td className="py-2 px-4 text-right">
                           <div className="flex items-center justify-end gap-1">
                             {adj.isEditing && !isViewMode ? (
                               <Input
                                 className="h-7 text-sm text-right font-mono w-16"
                                 type="number"
                                 step="0.1"
                                 value={adj.value}
                                 onChange={(e) => onUpdateAdjustment?.(adj.id, adj.name, parseFloat(e.target.value) || 0)}
                                 onClick={(e) => e.stopPropagation()}
                               />
                             ) : (
                               <span className={`font-mono ${adj.value < 0 ? 'text-destructive' : ''}`}>{adj.value.toFixed(1)}</span>
                             )}
                             {!isViewMode && adj.isEditing && (
                               <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => onToggleAdjustmentEdit?.(adj.id, false)}>
                                 <Check className="h-3 w-3" />
                               </Button>
                             )}
                             {!isViewMode && !adj.isEditing && (
                               <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onToggleAdjustmentEdit?.(adj.id, true)}>
                                 <Pencil className="h-3 w-3" />
                               </Button>
                             )}
                             {!isViewMode && (
                               <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onRemoveAdjustment?.(adj.id)}>
                                 <X className="h-3 w-3" />
                               </Button>
                             )}
                           </div>
                         </td>
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
  
  // Check if editing or viewing an existing routine
  const searchParams = new URLSearchParams(location.search);
  const editingRoutineId = searchParams.get('edit');
  const viewingRoutineId = searchParams.get('view');
  const loadRoutineId = editingRoutineId || viewingRoutineId;
  const isViewMode = !!viewingRoutineId;
  
  const [jumpDialogOpen, setJumpDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [rotationDialogOpen, setRotationDialogOpen] = useState(false);
  const [apparatusDialogOpen, setApparatusDialogOpen] = useState(false);
  const [technicalElementsDialogOpen, setTechnicalElementsDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // Only restore from localStorage when editing/viewing an existing routine or returning with risk data
  const hasLocationState = !!(location.state as any)?.newRisk;
  const shouldRestoreState = !!loadRoutineId || hasLocationState;

  const [selectedApparatus, setSelectedApparatus] = useState<ApparatusType | null>(() => {
    if (!shouldRestoreState) return null;
    const saved = localStorage.getItem('selectedApparatus');
    if (saved) {
      try {
        return JSON.parse(saved) as ApparatusType;
      } catch {
        return null;
      }
    }
    return null;
  });
  
  // Persist selectedApparatus to localStorage whenever it changes
  useEffect(() => {
    if (selectedApparatus) {
      localStorage.setItem('selectedApparatus', JSON.stringify(selectedApparatus));
    } else {
      localStorage.removeItem('selectedApparatus');
    }
  }, [selectedApparatus]);
  // Initialize routineElements from localStorage to persist across navigation
  const [routineElements, setRoutineElements] = useState<RoutineElement[]>(() => {
    if (!shouldRestoreState) return [];
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
  const [gymnastName, setGymnastName] = useState('');
  const [year, setYear] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [routineSaveName, setRoutineSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [routineLoaded, setRoutineLoaded] = useState(false);
  const [lastLoadedId, setLastLoadedId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [unsavedChangesDialogOpen, setUnsavedChangesDialogOpen] = useState(false);
  const [loadedRoutineName, setLoadedRoutineName] = useState<string | null>(null);
  
  // Load existing routine when editing or viewing
  useEffect(() => {
    if (loadRoutineId && loadRoutineId !== lastLoadedId) {
      const loadRoutine = async () => {
        const { data, error } = await (supabase.from('routines' as any).select('*').eq('id', loadRoutineId).single() as any);
        if (error) {
          toast({ title: "Error loading routine", description: error.message, variant: "destructive" });
          return;
        }
        if (data) {
          setGymnastName(data.gymnast_name || '');
          setYear(data.year || '');
          setSelectedApparatus(data.apparatus as ApparatusType || null);
          setRoutineElements(data.elements || []);
          setLoadedRoutineName(data.name || null);
          setRoutineLoaded(true);
          setLastLoadedId(loadRoutineId);
        }
      };
      loadRoutine();
    } else if (!loadRoutineId && lastLoadedId) {
      // Navigated to new routine (no edit/view param) — clear loaded state
      setLastLoadedId(null);
      setRoutineLoaded(false);
    }
  }, [loadRoutineId]);

  // Track unsaved changes after routine is loaded in edit mode
  const initialRoutineRef = useRef<string | null>(null);
  useEffect(() => {
    if (editingRoutineId && routineLoaded && initialRoutineRef.current === null) {
      initialRoutineRef.current = JSON.stringify({ gymnastName, year, selectedApparatus, routineElements });
    }
  }, [editingRoutineId, routineLoaded, gymnastName, year, selectedApparatus, routineElements]);

  useEffect(() => {
    if (editingRoutineId && routineLoaded && initialRoutineRef.current !== null) {
      const current = JSON.stringify({ gymnastName, year, selectedApparatus, routineElements });
      setHasUnsavedChanges(current !== initialRoutineRef.current);
    }
  }, [editingRoutineId, routineLoaded, gymnastName, year, selectedApparatus, routineElements]);

  const handleNavigateBack = () => {
    if (editingRoutineId && hasUnsavedChanges) {
      setUnsavedChangesDialogOpen(true);
    } else {
      navigate('/routines');
    }
  };
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDBDASuccessDialog, setShowDBDASuccessDialog] = useState(false);
  const [showDBDAValidationDialog, setShowDBDAValidationDialog] = useState(false);
  const [sourceElementType, setSourceElementType] = useState<'jump' | 'rotation' | 'balance' | null>(null);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showRoutineCheckDialog, setShowRoutineCheckDialog] = useState(false);
  
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

  // Element Information Dialog state for configuring new/modifying DB/DA/TE elements
  const [elementInfoDialogOpen, setElementInfoDialogOpen] = useState(false);
  const [modifyingRoutineElement, setModifyingRoutineElement] = useState<RoutineElement | null>(null);
  
  // Pending element being configured in ElementInformationDialog (before saving to routine)
  const [pendingElementInfo, setPendingElementInfo] = useState<{
    element: SelectedJump | SelectedBalance | SelectedRotation;
    elementType: 'jump' | 'rotation' | 'balance';
    rotationCount?: number;
    fouetteComponents?: FouetteComponent[];
    isSeries?: boolean;
    isJumpSeries?: boolean;
    jumpCount?: number;
    isFlatFoot?: boolean;
    isSlowTurn?: boolean;
  } | null>(null);
  
  // Unified handling items array - preserves insertion order for TEs and DAs
  const [pendingHandlingItems, setPendingHandlingItems] = useState<HandlingItem[]>([]);
  
  // Helper getters to extract TEs and DAs from unified array
  const pendingTechnicalElements = pendingHandlingItems
    .filter((item): item is HandlingItem & { type: 'te' } => item.type === 'te')
    .map(item => item.data);
  
  const pendingDaElements = pendingHandlingItems
    .filter((item): item is HandlingItem & { type: 'da' } => item.type === 'da')
    .map(item => item.data);
  
  // Helper setters for backwards compatibility
  const setPendingTechnicalElements = (updater: Array<{ id: string; code: string; name: string; description: string; symbol_image: string | null }> | ((prev: Array<{ id: string; code: string; name: string; description: string; symbol_image: string | null }>) => Array<{ id: string; code: string; name: string; description: string; symbol_image: string | null }>)) => {
    setPendingHandlingItems(prev => {
      const existingTeItems = prev.filter((item): item is HandlingItem & { type: 'te' } => item.type === 'te');
      const currentTEs = existingTeItems.map(item => item.data);
      const newTEs = typeof updater === 'function' ? updater(currentTEs) : updater;
      const newTeItems: HandlingItem[] = newTEs.map(te => ({ type: 'te', id: `te-${te.id}`, data: te }));
      // Keep existing order: remove old TEs from positions and append new ones at the end
      const nonTeItems = prev.filter(item => item.type !== 'te');
      return [...nonTeItems, ...newTeItems];
    });
  };
  
  const setPendingDaElements = (updater: Array<{ id: string; name: string; symbolImages: string[]; value: number; selectedCriteria: string[] }> | ((prev: Array<{ id: string; name: string; symbolImages: string[]; value: number; selectedCriteria: string[] }>) => Array<{ id: string; name: string; symbolImages: string[]; value: number; selectedCriteria: string[] }>)) => {
    setPendingHandlingItems(prev => {
      const existingDaItems = prev.filter((item): item is HandlingItem & { type: 'da' } => item.type === 'da');
      const currentDAs = existingDaItems.map(item => item.data);
      const newDAs = typeof updater === 'function' ? updater(currentDAs) : updater;
      const newDaItems: HandlingItem[] = newDAs.map(da => ({ type: 'da', id: `da-${da.id}`, data: da }));
      // Keep existing order: remove old DAs from positions and append new ones at the end
      const nonDaItems = prev.filter(item => item.type !== 'da');
      return [...nonDaItems, ...newDaItems];
    });
  };
  
  // Function to add handling items while preserving order (for rotation appends)
  // Uses timestamp + index to ensure unique IDs even for duplicate TEs (jump series)
  const appendHandlingTEs = (teElements: Array<{ id: string; code: string; name: string; description: string; symbol_image: string | null }>) => {
    setPendingHandlingItems(prev => {
      const timestamp = Date.now();
      const newTeItems: HandlingItem[] = teElements.map((te, idx) => ({ 
        type: 'te', 
        id: `te-${te.id}-${timestamp}-${idx}`, 
        data: te 
      }));
      return [...prev, ...newTeItems];
    });
  };
  
  const appendHandlingDAs = (daElements: Array<{ id: string; name: string; symbolImages: string[]; value: number; selectedCriteria: string[] }>) => {
    setPendingHandlingItems(prev => {
      const newDaItems: HandlingItem[] = daElements.map(da => ({ type: 'da', id: `da-${da.id}`, data: da }));
      return [...prev, ...newDaItems];
    });
  };
  
  // Function to replace all handling items (optionally with a specific order)
  const setAllHandlingItems = (
    teElements: Array<{ id: string; code: string; name: string; description: string; symbol_image: string | null }>, 
    daElements: Array<{ id: string; name: string; symbolImages: string[]; value: number; selectedCriteria: string[] }>,
    handlingOrder?: Array<{ type: 'te' | 'da'; id: string }>
  ) => {
    const teMap = new Map(teElements.map(te => [te.id, te]));
    const daMap = new Map(daElements.map(da => [da.id, da]));
    
    if (handlingOrder && handlingOrder.length > 0) {
      // Preserve the original order
      const orderedItems: HandlingItem[] = handlingOrder
        .map(orderItem => {
          if (orderItem.type === 'te') {
            const te = teMap.get(orderItem.id);
            if (te) return { type: 'te' as const, id: `te-${te.id}`, data: te };
          } else {
            const da = daMap.get(orderItem.id);
            if (da) return { type: 'da' as const, id: `da-${da.id}`, data: da };
          }
          return null;
        })
        .filter((item): item is HandlingItem => item !== null);
      setPendingHandlingItems(orderedItems);
    } else {
      // Fallback: TEs first, then DAs
      const newTeItems: HandlingItem[] = teElements.map(te => ({ type: 'te', id: `te-${te.id}`, data: te }));
      const newDaItems: HandlingItem[] = daElements.map(da => ({ type: 'da', id: `da-${da.id}`, data: da }));
      setPendingHandlingItems([...newTeItems, ...newDaItems]);
    }
  };
  
  // Function to clear all handling items
  const clearPendingHandlingItems = () => {
    setPendingHandlingItems([]);
  };
  useEffect(() => {
    const state = location.state as { newRisk?: RiskData; modifyingElementId?: string } | null;
    if (state?.newRisk) {
      const riskData = state.newRisk;
      const modifyingId = state.modifyingElementId;
      
      // Determine element type: R/DB for non-R2 risks (which have DBs), R for R2 risks
      const elementType: RoutineElementType = (riskData.dbCount && riskData.dbCount > 0) ? 'R/DB' : 'R';
      
      if (modifyingId) {
        // Modifying existing risk - replace it
        setRoutineElements((prev) => 
          prev.map(el => {
            if (el.id === modifyingId) {
              return {
                ...el,
                type: elementType,
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
          description: "The risk has been updated in the routine.",
        });
      } else {
        // Adding new risk
        const newElement: RoutineElement = {
          id: `risk-${Date.now()}`,
          type: elementType,
          symbolImages: [riskData.symbols["R2"] || ''],
          value: riskData.value,
          originalData: riskData,
          riskData: riskData,
          isExpanded: false,
        };
        setRoutineElements((prev) => [...prev, newElement]);
        
        toast({
          title: "Risk Added",
          description: "A new Risk has been added to the routine.",
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

  // Handle when a jump is selected from the table - open Element Information Dialog
  const handleSelectJump = (jump: SelectedJump, withApparatusHandling: boolean = false, modifyingElementId?: string) => {
    // Set the pending element info and open ElementInformationDialog
    setPendingElementInfo({
      element: jump,
      elementType: 'jump',
    });
    setPendingDbElement({
      element: jump,
      type: 'jump',
      modifyingElementId,
    });
    clearPendingHandlingItems();
    setJumpDialogOpen(false);
    setElementInfoDialogOpen(true);
  };

  const handleRemoveJump = (index: number) => {
    setSelectedJumps((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle when a balance is selected from the table - open Element Information Dialog
  const handleSelectBalance = (balance: SelectedBalance, withApparatusHandling: boolean = false, modifyingElementId?: string) => {
    // Set the pending element info and open ElementInformationDialog
    setPendingElementInfo({
      element: balance,
      elementType: 'balance',
    });
    setPendingDbElement({
      element: balance,
      type: 'balance',
      modifyingElementId,
    });
    clearPendingHandlingItems();
    setBalanceDialogOpen(false);
    setElementInfoDialogOpen(true);
  };

  const handleRemoveBalance = (index: number) => {
    setSelectedBalances((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle when a rotation is selected from the table - open Element Information Dialog
  const handleSelectRotation = (rotation: SelectedRotation, rotationCount: number, totalValue: number, withApparatusHandling: boolean = false, modifyingElementId?: string) => {
    // Store rotation count info in the rotation object for use later
    const rotationWithCount = {
      ...rotation,
      rotationCount,
      calculatedValue: totalValue,
    };
    
    // Set the pending element info and open ElementInformationDialog
    setPendingElementInfo({
      element: rotationWithCount,
      elementType: 'rotation',
      rotationCount,
    });
    setPendingDbElement({
      element: rotationWithCount,
      type: 'rotation',
      modifyingElementId,
    });
    clearPendingHandlingItems();
    setRotationDialogOpen(false);
    setElementInfoDialogOpen(true);
  };

  const handleRemoveRotation = (index: number) => {
    setSelectedRotations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectApparatusElements = (elements: CombinedApparatusData[]) => {
    setSelectedApparatusElements((prev) => [...prev, ...elements]);
  };

  const handleSelectApparatusCombinations = (combinations: ApparatusCombination[]) => {
    setSelectedApparatusCombinations((prev) => [...prev, ...combinations]);
    
    // Check if we have a pending DB element - if so, store DA and return to ElementInformationDialog
    if (pendingDbElement) {
      // Process DA elements to get symbol images
      const daElements = processApparatusCombinationsToElements(combinations);
      
      // Store DA elements data for ElementInformationDialog
      // Use timestamp + index to ensure unique IDs across multiple additions
      const timestamp = Date.now();
      const daElementsData = combinations.map((combo, idx) => ({
        id: `da-${combo.element.id}-${timestamp}-${idx}`,
        name: combo.element.name || combo.element.description || 'DA Element',
        symbolImages: daElements[idx]?.symbolImages || [],
        value: combo.calculatedValue || combo.element.value,
        selectedCriteria: combo.selectedCriteria,
      }));
      
      const isRotationOrBalance = pendingElementInfo?.elementType === 'rotation' || pendingDbElement?.type === 'rotation' ||
                                  pendingElementInfo?.elementType === 'balance' || pendingDbElement?.type === 'balance';
      const isJumpSeries = pendingElementInfo?.isJumpSeries || false;
      
      if (isRotationOrBalance || isJumpSeries) {
        // For rotations, balances, and jump series: APPEND new DAs to existing ones in order
        appendHandlingDAs(daElementsData);
      } else {
        // For regular jumps: Replace DAs and clear TEs (mutually exclusive)
        setPendingHandlingItems(daElementsData.map(da => ({ type: 'da', id: da.id, data: da })));
      }
      
      // Return to Element Information Dialog
      setApparatusDialogOpen(false);
      setElementInfoDialogOpen(true);
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
    console.log('Apparatus changed to:', value);
    const validApparatus = ['hoop', 'ball', 'clubs', 'ribbon', 'rope', 'wa', 'gala', 'other'];
    if (validApparatus.includes(value)) {
      setSelectedApparatus(value as ApparatusType);
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
    // If already a full URL, return as-is
    if (symbolImage.startsWith('http://') || symbolImage.startsWith('https://')) {
      return symbolImage;
    }
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
  const dbElements = routineElements.filter(el => el.type === 'DB' || el.type === 'DB/DA' || el.type === 'DB/TE' || el.type === 'DB/TE/DA');
  
  // Calculate DB count - for 3.1704, series rotations, and jump series, each counts as a separate DB
  const explicitDbCount = dbElements.reduce((count, el) => {
    // Check if this is element 3.1704 with rotation count - each rotation is a separate DB
    if (el.dbData?.code === '3.1704' && el.dbData?.rotationCount) {
      return count + el.dbData.rotationCount;
    }
    // For series rotations, each rotation in the series counts as a separate DB
    if (el.dbData?.isSeries && el.dbData?.rotationCount) {
      return count + el.dbData.rotationCount;
    }
    // For jump series, each jump counts as a separate DB
    if (el.dbData?.isJumpSeries && el.dbData?.jumpCount) {
      return count + el.dbData.jumpCount;
    }
    return count + 1;
  }, 0);
  
  // Calculate DB values from explicit DB elements
  const explicitDbValue = dbElements.reduce((sum, el) => {
    // For DB/DA or DB/TE/DA elements, only count DB value
    if ((el.type === 'DB/DA' || el.type === 'DB/TE/DA') && el.dbData) {
      return sum + el.dbData.value;
    }
    return sum + el.value;
  }, 0);
  
  // Calculate DB count and values from risks (R/DB elements have 3 DBs for non-R2)
  const riskDbCount = routineElements.reduce((sum, el) => {
    if ((el.type === 'R' || el.type === 'R/DB') && el.riskData?.dbCount) {
      return sum + el.riskData.dbCount;
    }
    return sum;
  }, 0);
  
  const riskDbValue = routineElements.reduce((sum, el) => {
    if ((el.type === 'R' || el.type === 'R/DB') && el.riskData?.dbValue) {
      return sum + el.riskData.dbValue;
    }
    return sum;
  }, 0);
  
  const totalDB = explicitDbValue + riskDbValue;
  const countDB = explicitDbCount + riskDbCount;
  
  const daElements = routineElements.filter(el => el.type === 'DA' || el.type === 'R' || el.type === 'R/DB' || el.type === 'DB/DA' || el.type === 'DB/TE/DA');
  const totalDA = daElements.reduce((sum, el) => {
    // For DB/DA or DB/TE/DA elements, only count DA value
    if ((el.type === 'DB/DA' || el.type === 'DB/TE/DA') && el.daData) {
      return sum + el.daData.value;
    }
    // For R/DB elements, subtract dbValue to get only the DA portion (rotations + extra criteria)
    if (el.type === 'R/DB' && el.riskData?.dbValue) {
      return sum + (el.value - el.riskData.dbValue);
    }
    // For regular R elements (R2), add full value
    if (el.type === 'R') {
      return sum + el.value;
    }
    // For standalone DA elements
    if (el.type === 'DA') {
      return sum + el.value;
    }
    return sum;
  }, 0);
  const countDA = daElements.length;

  // Calculate adjustment totals (adjustments embedded in elements)
  const totalAdj = routineElements.reduce((sum, el) => {
    if (el.adjustments && el.adjustments.length > 0) {
      return sum + el.adjustments.reduce((adjSum, adj) => adjSum + adj.value, 0);
    }
    return sum;
  }, 0);
  const adjCount = routineElements.reduce((count, el) => count + (el.adjustments?.length || 0), 0);

  const totalScore = totalDB + totalDA + totalAdj;

  const handleAddAdjustment = (elementIndex: number) => {
    setRoutineElements(prev => prev.map((el, idx) => {
      if (idx !== elementIndex) return el;
      const newAdj = { id: `adj-${Date.now()}`, name: '', value: 0, isEditing: true };
      return { 
        ...el, 
        adjustments: [...(el.adjustments || []), newAdj],
        isExpanded: true,
      };
    }));
  };

  const handleToggleAdjustmentEdit = (elementIndex: number, adjId: string, isEditing: boolean) => {
    setRoutineElements(prev => prev.map((el, idx) => {
      if (idx !== elementIndex) return el;
      const updatedAdjs = (el.adjustments || []).map(adj => 
        adj.id === adjId ? { ...adj, isEditing } : adj
      );
      return { ...el, adjustments: updatedAdjs };
    }));
  };

  const handleUpdateAdjustment = (elementIndex: number, adjId: string, name: string, value: number) => {
    setRoutineElements(prev => prev.map((el, idx) => {
      if (idx !== elementIndex) return el;
      const updatedAdjs = (el.adjustments || []).map(adj => 
        adj.id === adjId ? { ...adj, name, value } : adj
      );
      return { ...el, adjustments: updatedAdjs };
    }));
  };

  const handleRemoveAdjustment = (elementIndex: number, adjId: string) => {
    setRoutineElements(prev => prev.map((el, idx) => {
      if (idx !== elementIndex) return el;
      return { ...el, adjustments: (el.adjustments || []).filter(adj => adj.id !== adjId) };
    }));
  };

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
    if (!element || (element.type !== 'R' && element.type !== 'R/DB') || !element.riskData) return;
    
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
      // Ensure we have the correct risk code
      if (!riskData.riskCode) {
        // If riskCode is not available, we need to redirect user to re-select the risk
        // because we can't determine which specific standard risk it was
        toast({
          title: "Risk data incomplete",
          description: "Please delete this risk and add it again to enable modification.",
          variant: "destructive"
        });
        return;
      }
      
      navigate('/standard-risk-detail', {
        state: {
          apparatus: riskData.apparatus || selectedApparatus,
          selectedRisk: {
            id: '', // Not required for modification
            risk_code: riskData.riskCode,
            name: riskData.riskName || 'Standard Risk',
            rotations_value: null,
            symbol_image: riskData.symbols?.main || null,
          },
          modifyingElementId: elementId,
          existingRiskData: riskData,
        },
      });
    }
  };

  // Handle modifying a DB/DA/TE element
  const handleModifyElement = (elementId: string) => {
    const element = routineElements.find(el => el.id === elementId);
    if (!element || (element.type !== 'DB' && element.type !== 'DB/DA' && element.type !== 'DB/TE' && element.type !== 'DB/TE/DA')) return;
    
    // Extract original element data
    const originalData = element.originalData as SelectedJump | SelectedBalance | SelectedRotation;
    
    // Determine element type based on code prefix (more reliable than checking properties)
    let elementType: 'jump' | 'rotation' | 'balance' = 'jump';
    if (originalData.code?.startsWith('3.')) {
      elementType = 'rotation';
    } else if (originalData.code?.startsWith('2.')) {
      elementType = 'balance';
    }
    
    // Set up pending technical elements or DA elements from existing data
    const teElements = element.teElements?.map(te => ({
      id: te.id,
      code: te.code,
      name: te.name,
      description: te.name,
      symbol_image: te.symbolImage,
    })) || [];
    
    const daElements = element.daElements?.map(da => ({
      id: da.id,
      name: da.name,
      symbolImages: da.symbolImages,
      value: da.value,
      selectedCriteria: [] as string[], // We don't have criteria info in the stored element
    })) || [];
    
    setAllHandlingItems(teElements, daElements, element.handlingOrder);
    setModifyingRoutineElement(element);
    
    // Set pending element info with existing series and rotation data
    setPendingElementInfo({
      element: originalData,
      elementType: elementType,
      rotationCount: element.dbData?.rotationCount,
      fouetteComponents: element.dbData?.fouetteComponents,
      isSeries: element.dbData?.isSeries,
      isFlatFoot: element.dbData?.isFlatFoot,
      isSlowTurn: element.dbData?.isSlowTurn,
    });
    
    // Set pending DB element for apparatus handling
    setPendingDbElement({
      element: originalData,
      type: elementType,
      modifyingElementId: elementId,
    });
    
    setElementInfoDialogOpen(true);
  };

  // Handle saving from Element Information Dialog
  const handleElementInfoSave = (data: {
    element: { id: string; code: string; name: string | null; description: string; value: number; turn_degrees?: string | null; extra_value?: number | null; symbol_image: string | null; flat?: boolean; slow_turn?: boolean };
    elementType: 'jump' | 'rotation' | 'balance';
    rotationCount: number;
    totalValue: number;
    technicalElements?: Array<{ id: string; code: string; name: string; description: string; symbol_image: string | null }>;
    daElements?: Array<{ id: string; name: string; symbolImages: string[]; value: number; selectedCriteria: string[] }>;
    handlingOrder?: Array<{ type: 'te' | 'da'; id: string }>;
    withApparatusHandling: boolean;
    fouetteComponents?: FouetteComponent[];
    isSeries?: boolean;
    isJumpSeries?: boolean;
    jumpCount?: number;
    isFlatFoot?: boolean;
    isSlowTurn?: boolean;
    fouetteShapes?: FouetteShape[];
  }) => {
    const { element, elementType, rotationCount, totalValue, technicalElements, daElements, handlingOrder, withApparatusHandling, fouetteComponents, isSeries, isJumpSeries, jumpCount, isFlatFoot, isSlowTurn, fouetteShapes } = data;
    
    // Get DB symbol images
    const dbSymbolImages = element.symbol_image ? [
      getSymbolUrl(element.symbol_image, 'jump-symbols') || ''
    ] : [];
    
    const modifyingId = modifyingRoutineElement?.id;
    
    const hasTEs = technicalElements && technicalElements.length > 0;
    const hasDAs = daElements && daElements.length > 0;
    
    if (hasTEs && hasDAs) {
      // Create DB/TE/DA element (both technical elements AND apparatus difficulty)
      const teSymbolImages = technicalElements.map(te => {
        if (te.symbol_image && selectedApparatus) {
          return getTechnicalElementSymbol(te.symbol_image, selectedApparatus) || '';
        }
        return '';
      }).filter(Boolean);
      
      const teElementsData = technicalElements.map(te => ({
        id: te.id,
        code: te.code,
        name: te.name,
        symbolImage: te.symbol_image && selectedApparatus 
          ? getTechnicalElementSymbol(te.symbol_image, selectedApparatus) || ''
          : '',
        value: 0,
      }));
      
      const daSymbolImages = daElements.flatMap(da => da.symbolImages);
      const totalDaValue = daElements.reduce((sum, da) => sum + da.value, 0);
      
      const daElementsData = daElements.map((da, idx) => ({
        id: da.id || `da-${idx}`,
        name: da.name,
        symbolImages: da.symbolImages,
        value: da.value,
      }));
      
      const combinedElement: RoutineElement = {
        id: modifyingId || `db-te-da-${elementType}-${element.id}-${Date.now()}`,
        type: 'DB/TE/DA',
        symbolImages: [...dbSymbolImages, ...teSymbolImages, ...daSymbolImages],
        value: totalValue + totalDaValue,
        originalData: element as SelectedJump | SelectedBalance | SelectedRotation,
        dbData: {
          symbolImages: dbSymbolImages,
          value: totalValue,
          name: element.name || element.description || 'DB Element',
          code: element.code,
          elementType: elementType,
          rotationCount: elementType === 'rotation' ? rotationCount : undefined,
          fouetteComponents: fouetteComponents,
          fouetteShapes: elementType === 'balance' ? fouetteShapes : undefined,
          isSeries: isSeries,
          isJumpSeries: elementType === 'jump' ? isJumpSeries : undefined,
          jumpCount: elementType === 'jump' && isJumpSeries ? jumpCount : undefined,
          isFlatFoot: elementType === 'balance' ? isFlatFoot : undefined,
          isSlowTurn: elementType === 'balance' ? isSlowTurn : undefined,
        },
        daData: {
          symbolImages: daSymbolImages,
          value: totalDaValue,
        },
        teElements: teElementsData,
        daElements: daElementsData,
        handlingOrder: handlingOrder,
        isExpanded: false,
      };
      
      if (modifyingId) {
        setRoutineElements(prev => prev.map(el => el.id === modifyingId ? combinedElement : el));
      } else {
        setRoutineElements(prev => [...prev, combinedElement]);
      }
    } else if (hasTEs) {
      // Create DB/TE element
      const teSymbolImages = technicalElements.map(te => {
        if (te.symbol_image && selectedApparatus) {
          return getTechnicalElementSymbol(te.symbol_image, selectedApparatus) || '';
        }
        return '';
      }).filter(Boolean);
      
      const teElementsData = technicalElements.map(te => ({
        id: te.id,
        code: te.code,
        name: te.name,
        symbolImage: te.symbol_image && selectedApparatus 
          ? getTechnicalElementSymbol(te.symbol_image, selectedApparatus) || ''
          : '',
        value: 0,
      }));
      
      const combinedElement: RoutineElement = {
        id: modifyingId || `db-te-${elementType}-${element.id}-${Date.now()}`,
        type: 'DB/TE',
        symbolImages: [...dbSymbolImages, ...teSymbolImages],
        value: totalValue,
        originalData: element as SelectedJump | SelectedBalance | SelectedRotation,
        dbData: {
          symbolImages: dbSymbolImages,
          value: totalValue,
          name: element.name || element.description || 'DB Element',
          code: element.code,
          elementType: elementType,
          rotationCount: elementType === 'rotation' ? rotationCount : undefined,
          fouetteComponents: fouetteComponents,
          fouetteShapes: elementType === 'balance' ? fouetteShapes : undefined,
          isSeries: isSeries,
          isFlatFoot: elementType === 'balance' ? isFlatFoot : undefined,
          isSlowTurn: elementType === 'balance' ? isSlowTurn : undefined,
        },
        daData: {
          symbolImages: teSymbolImages,
          value: 0,
        },
        teElements: teElementsData,
        handlingOrder: handlingOrder,
        isExpanded: false,
      };
      
      if (modifyingId) {
        setRoutineElements(prev => prev.map(el => el.id === modifyingId ? combinedElement : el));
      } else {
        setRoutineElements(prev => [...prev, combinedElement]);
      }
    } else if (hasDAs) {
      // Create DB/DA element
      const daSymbolImages = daElements.flatMap(da => da.symbolImages);
      const totalDaValue = daElements.reduce((sum, da) => sum + da.value, 0);
      
      const daElementsData = daElements.map((da, idx) => ({
        id: da.id || `da-${idx}`,
        name: da.name,
        symbolImages: da.symbolImages,
        value: da.value,
      }));
      
      const combinedElement: RoutineElement = {
        id: modifyingId || `db-da-${elementType}-${element.id}-${Date.now()}`,
        type: 'DB/DA',
        symbolImages: [...dbSymbolImages, ...daSymbolImages],
        value: totalValue + totalDaValue,
        originalData: element as SelectedJump | SelectedBalance | SelectedRotation,
        dbData: {
          symbolImages: dbSymbolImages,
          value: totalValue,
          name: element.name || element.description || 'DB Element',
          code: element.code,
          elementType: elementType,
          rotationCount: elementType === 'rotation' ? rotationCount : undefined,
          fouetteComponents: fouetteComponents,
          fouetteShapes: elementType === 'balance' ? fouetteShapes : undefined,
          isSeries: isSeries,
          isFlatFoot: elementType === 'balance' ? isFlatFoot : undefined,
          isSlowTurn: elementType === 'balance' ? isSlowTurn : undefined,
        },
        daData: {
          symbolImages: daSymbolImages,
          value: totalDaValue,
        },
        daElements: daElementsData,
        handlingOrder: handlingOrder,
        isExpanded: false,
      };
      
      if (modifyingId) {
        setRoutineElements(prev => prev.map(el => el.id === modifyingId ? combinedElement : el));
      } else {
        setRoutineElements(prev => [...prev, combinedElement]);
      }
    } else {
      // Create standalone DB element (without apparatus handling)
      const newElement: RoutineElement = {
        id: modifyingId || `db-${elementType}-${element.id}-${Date.now()}`,
        type: 'DB',
        symbolImages: dbSymbolImages,
        value: totalValue,
        originalData: element as SelectedJump | SelectedBalance | SelectedRotation,
        dbData: {
          symbolImages: dbSymbolImages,
          value: totalValue,
          name: element.name || element.description || 'DB Element',
          code: element.code,
          elementType: elementType,
          rotationCount: elementType === 'rotation' ? rotationCount : undefined,
          fouetteComponents: fouetteComponents,
          fouetteShapes: elementType === 'balance' ? fouetteShapes : undefined,
          isSeries: isSeries,
          isJumpSeries: elementType === 'jump' ? isJumpSeries : undefined,
          jumpCount: elementType === 'jump' && isJumpSeries ? jumpCount : undefined,
          isFlatFoot: elementType === 'balance' ? isFlatFoot : undefined,
          isSlowTurn: elementType === 'balance' ? isSlowTurn : undefined,
        },
        isExpanded: false,
      };
      
      if (modifyingId) {
        setRoutineElements(prev => prev.map(el => el.id === modifyingId ? newElement : el));
      } else {
        setRoutineElements(prev => [...prev, newElement]);
      }
      
      // Mark as without apparatus handling
      if (!withApparatusHandling) {
        setElementsWithoutApparatusHandling(prev => new Set(prev).add(element.id));
      }
    }
    
    // Clear states
    setModifyingRoutineElement(null);
    clearPendingHandlingItems();
    setPendingDbElement(null);
    
    toast({
      title: modifyingId ? "Element Updated" : "Element Added",
      description: modifyingId ? "The element has been updated." : "The element has been added to the routine.",
    });
  };

  // Handle opening apparatus dialog from Element Information Dialog
  const handleElementInfoOpenApparatusDialog = () => {
    setElementInfoDialogOpen(false);
    setTimeout(() => {
      setSourceElementType(pendingDbElement?.type || null);
      setApparatusDialogOpen(true);
    }, 100);
  };

  // Handle opening technical elements dialog from Element Information Dialog
  const handleElementInfoOpenTechnicalElementsDialog = () => {
    setElementInfoDialogOpen(false);
    setTimeout(() => {
      setTechnicalElementsDialogOpen(true);
    }, 100);
  };

  // Handle technical elements selection - store and return to ElementInformationDialog
  const handleSelectTechnicalElements = (elements: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    symbol_image: string | null;
  }>) => {
    if (pendingDbElement && elements.length > 0) {
      const isRotationOrBalance = pendingElementInfo?.elementType === 'rotation' || pendingDbElement?.type === 'rotation' ||
                                  pendingElementInfo?.elementType === 'balance' || pendingDbElement?.type === 'balance';
      const isJumpSeries = pendingElementInfo?.isJumpSeries || false;
      
      if (isRotationOrBalance || isJumpSeries) {
        // For rotations, balances, and jump series: APPEND new TEs to existing ones in order
        appendHandlingTEs(elements);
      } else {
        // For regular jumps: Replace TEs and clear DAs (mutually exclusive)
        const timestamp = Date.now();
        setPendingHandlingItems(elements.map((te, idx) => ({ 
          type: 'te', 
          id: `te-${te.id}-${timestamp}-${idx}`, 
          data: te 
        })));
      }
      
      // Return to Element Information Dialog
      setTechnicalElementsDialogOpen(false);
      setElementInfoDialogOpen(true);
    }
  };

  const handleOpenTechnicalElementsDialog = () => {
    setTechnicalElementsDialogOpen(true);
  };

  const handleTechnicalElementsGoBack = () => {
    // Return to Element Information Dialog
    setTechnicalElementsDialogOpen(false);
    setElementInfoDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNavigateBack}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">{isViewMode ? 'View Routine' : editingRoutineId ? 'Edit Routine' : 'Routine Calculator'}</h1>
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
                value={gymnastName}
                onChange={(e) => setGymnastName(e.target.value)}
                disabled={isViewMode}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apparatus">Apparatus <span className="text-destructive">*</span></Label>
              <Select value={selectedApparatus ?? undefined} onValueChange={handleApparatusChange} disabled={isViewMode}>
                <SelectTrigger id="apparatus">
                  <SelectValue placeholder="Select apparatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoop">Hoop</SelectItem>
                  <SelectItem value="ball">Ball</SelectItem>
                  <SelectItem value="clubs">Clubs</SelectItem>
                  <SelectItem value="ribbon">Ribbon</SelectItem>
                  <SelectItem value="wa">WA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input 
                id="year"
                type="text"
                placeholder="E.g 2025"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={isViewMode}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rulebook">Rulebook</Label>
              <Select defaultValue="fig-cop-2025-2028" disabled={isViewMode}>
                <SelectTrigger id="rulebook">
                  <SelectValue placeholder="Select rulebook" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fig-cop-2025-2028">FIG CoP 2025-2028</SelectItem>
                  <SelectItem value="sky-grace" disabled className="opacity-40 cursor-not-allowed">Sky Grace (coming soon)</SelectItem>
                  <SelectItem value="other" disabled className="opacity-40 cursor-not-allowed">Other (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category Buttons - hidden in view mode */}
          {!isViewMode && <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Construct Routine</h2>
            
            {/* Button enable/disable logic based on apparatus selection */}
            {(() => {
              // No apparatus selected: all buttons disabled
              // WA selected: Elements (DB) and Dance Steps enabled
              // Hoop, Ball, Clubs, Ribbon: All buttons enabled
              // Other apparatus (rope, gala, other): Only Elements (DB) and Dance Steps enabled
              const isApparatusSelected = selectedApparatus !== null;
              const isDAApparatus = selectedApparatus && ['hoop', 'ball', 'clubs', 'ribbon'].includes(selectedApparatus);
              
              const elementsEnabled = isApparatusSelected;
              const daEnabled = isDAApparatus;
              const dynamicElementsEnabled = isDAApparatus;
              const danceStepsEnabled = isApparatusSelected;
              
              return (
                <div className="grid grid-cols-2 gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline"
                        className={`h-16 text-base ${elementsEnabled ? 'hover:scale-[1.02] transition-transform' : 'opacity-50 cursor-not-allowed'}`}
                        disabled={!elementsEnabled}
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
                    className={`h-16 text-base ${daEnabled ? 'hover:scale-[1.02] transition-transform active:bg-purple-600 active:text-white active:border-purple-600' : 'opacity-50 cursor-not-allowed'}`}
                    disabled={!daEnabled}
                    onClick={() => {
                      if (daEnabled) {
                        setActiveCategory(activeCategory === "apparatus" ? null : "apparatus");
                        if (activeCategory !== "apparatus") {
                          handleOpenApparatusDialog();
                        }
                      }
                    }}
                  >
                    <span className="text-lg font-semibold mr-2">+</span> Apparatus Difficulty (DA)
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className={`h-16 text-base ${dynamicElementsEnabled ? 'hover:scale-[1.02] transition-transform active:bg-purple-600 active:text-white active:border-purple-600' : 'opacity-50 cursor-not-allowed'}`}
                    disabled={!dynamicElementsEnabled}
                    onClick={() => {
                      if (dynamicElementsEnabled) {
                        navigate("/dynamic-elements-risk", { state: { apparatus: selectedApparatus } });
                      }
                    }}
                  >
                    <span className="text-lg font-semibold mr-2">+</span> Dynamic Element (R)
                  </Button>
                  
                  <div className="relative">
                    <Button 
                      variant="outline"
                      className={`h-16 text-base w-full ${danceStepsEnabled ? 'hover:scale-[1.02] transition-transform active:bg-purple-600 active:text-white active:border-purple-600' : 'opacity-50 cursor-not-allowed'}`}
                      disabled={!danceStepsEnabled}
                      onClick={() => {
                        if (danceStepsEnabled) {
                          const newElement: RoutineElement = {
                            id: `dance-steps-${Date.now()}`,
                            type: 'Steps',
                            symbolImages: [],
                            value: 0,
                            originalData: {} as any,
                          };
                          setRoutineElements(prev => [...prev, newElement]);
                        }
                      }}
                    >
                      <span className="text-lg font-semibold mr-2">+</span> Dance Steps
                    </Button>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="absolute top-1 right-1 p-1 rounded-full hover:bg-muted"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                          <p>Minimum 2 dance steps combinations, lasting 8 seconds each, must be performed in the routine. A 0.30 penalty will be applied for each missing combination of dance steps. Pre-acrobatic elements, high throws, DA, DB with value 0.20 or more are not allowed during dance steps combinations.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })()}
          </div>}

          {/* Routine Elements Table */}
          {routineElements.length > 0 && (
            <Card className="p-6">
              <div className="space-y-4">
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowRulesDialog(true)} title="Routine Rules">
                      <BookOpen className="h-5 w-5" />
                    </Button>
                    <h2 className="text-xl font-semibold">Routine Elements</h2>
                  </div>
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
                      {adjCount > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronDown className="h-3 w-3 transition-transform [&[data-state=open]>svg]:rotate-180" />
                            <span>Adjustments ({adjCount})</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pt-1 pl-4">
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">Total ADJ Value:</span>
                              <Badge variant="secondary" className="font-mono">{totalAdj.toFixed(2)}</Badge>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
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
                              onModify={(element.type === 'R' || element.type === 'R/DB') ? () => handleModifyRisk(element.id) : 
                                        (element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'DB/TE/DA' || element.type === 'DB') ? () => handleModifyElement(element.id) : undefined}
                              onToggleExpand={(element.type === 'DB' || element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'DB/TE/DA' || element.type === 'R' || element.type === 'R/DB' || (element.adjustments && element.adjustments.length > 0)) ? () => handleToggleExpand(index) : undefined}
                              onAddAdjustment={() => handleAddAdjustment(index)}
                              onUpdateAdjustment={(adjId, name, value) => handleUpdateAdjustment(index, adjId, name, value)}
                              onRemoveAdjustment={(adjId) => handleRemoveAdjustment(index, adjId)}
                              onToggleAdjustmentEdit={(adjId, isEditing) => handleToggleAdjustmentEdit(index, adjId, isEditing)}
                              isMainRow={true}
                              isViewMode={isViewMode}
                            />
                          );
                          
                          // If expanded and has DB/DA or DB/TE or DB/TE/DA breakdown, show detailed sub-table
                          if ((element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'DB/TE/DA') && element.isExpanded && element.dbData) {
                            // Check if this is a jump series for special display
                            const isJumpSeriesBreakdown = element.dbData.isJumpSeries && element.dbData.jumpCount && element.dbData.jumpCount > 1;
                            
                            rows.push(
                              <TableRow key={`${element.id}-expanded`} className="bg-white dark:bg-background">
                                <TableCell colSpan={6} className="p-4">
                                  <div className="ml-8 border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                      <thead className="bg-white dark:bg-background">
                                        <tr>
                                          {isJumpSeriesBreakdown && (
                                            <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground w-16">Jump</th>
                                          )}
                                          <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground w-16">Type</th>
                                          <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">Symbol</th>
                                          <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">Name</th>
                                          <th className="py-2 px-4 text-right text-sm font-semibold text-muted-foreground">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {/* DB Element Row - with expandable shapes for fouetté balances */}
                                        {(() => {
                                          const hasFouetteShapes = element.dbData.fouetteShapes && element.dbData.fouetteShapes.length > 0;
                                          const shapesExpanded = element.dbData.shapesExpanded || false;
                                          
                                          const toggleShapesExpanded = (e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            setRoutineElements(prev => prev.map(el => 
                                              el.id === element.id 
                                                ? { 
                                                    ...el, 
                                                    dbData: el.dbData 
                                                      ? { ...el.dbData, shapesExpanded: !shapesExpanded }
                                                      : el.dbData 
                                                  }
                                                : el
                                            ));
                                          };
                                          
                                          return (
                                            <>
                                              <tr className="border-b border-border/30">
                                                {isJumpSeriesBreakdown && (
                                                  <td className="py-2 px-4"></td>
                                                )}
                                                <td className="py-2 px-4">
                                                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">DB</span>
                                                </td>
                                                <td className="py-2 px-4">
                                                  <div className="flex items-center gap-1">
                                                    {isJumpSeriesBreakdown && (
                                                      <span className="text-sm font-bold flex-shrink-0">S<sub>{element.dbData.jumpCount}</sub></span>
                                                    )}
                                                    {element.dbData.symbolImages.map((url, idx) => (
                                                      url.startsWith('TEXT:') ? (
                                                        <span key={idx} className="text-lg font-bold">{url.replace('TEXT:', '')}</span>
                                                      ) : (
                                                        <img key={idx} src={url} alt="Symbol" className="h-6 w-6 object-contain" />
                                                      )
                                                    ))}
                                                  </div>
                                                </td>
                                                <td className="py-2 px-4 font-medium">
                                                  <div className="flex flex-col">
                                                    <span>{element.dbData.name || 'DB Element'}</span>
                                                    {element.dbData.elementType === 'rotation' && element.dbData.rotationCount && (
                                                      <span className="text-xs text-muted-foreground">
                                                        {element.dbData.isSeries 
                                                          ? `(Series of ${element.dbData.rotationCount} ${element.dbData.rotationCount === 1 ? 'rotation' : 'rotations'})`
                                                          : `(${element.dbData.rotationCount} ${element.dbData.rotationCount === 1 ? 'rotation' : 'rotations'})`
                                                        }
                                                      </span>
                                                    )}
                                                    {element.dbData.elementType === 'jump' && element.dbData.isJumpSeries && element.dbData.jumpCount && (
                                                      <span className="text-xs text-muted-foreground">
                                                        (Series of {element.dbData.jumpCount} {element.dbData.jumpCount === 1 ? 'jump' : 'jumps'})
                                                      </span>
                                                    )}
                                                    {element.dbData.elementType === 'balance' && (
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">
                                                          {element.dbData.isSlowTurn && element.dbData.isFlatFoot
                                                            ? '(slow turn on flat foot)'
                                                            : element.dbData.isSlowTurn
                                                            ? '(slow turn on relevé)'
                                                            : element.dbData.isFlatFoot
                                                            ? '(balance on flat foot)'
                                                            : '(balance on relevé)'
                                                          }
                                                        </span>
                                                        {hasFouetteShapes && (
                                                          <button
                                                            type="button"
                                                            onClick={toggleShapesExpanded}
                                                            className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                                                          >
                                                            {shapesExpanded ? (
                                                              <ChevronDown className="h-3 w-3" />
                                                            ) : (
                                                              <ChevronRight className="h-3 w-3" />
                                                            )}
                                                            <span>View Shapes</span>
                                                          </button>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="py-2 px-4 text-right font-mono">{element.dbData.value.toFixed(1)}</td>
                                              </tr>
                                              
                                              {/* Expanded Fouetté Shapes Rows - simplified to just number and name */}
                                              {hasFouetteShapes && shapesExpanded && (
                                                element.dbData.fouetteShapes!.map((shape, shapeIdx) => (
                                                  <tr key={`shape-${shapeIdx}`} className="bg-purple-50 dark:bg-purple-900/10">
                                                    <td colSpan={2} className="py-1.5 px-4 pl-8">
                                                      <span className="text-xs text-purple-700 dark:text-purple-300">
                                                        Shape {shapeIdx + 1}:
                                                      </span>
                                                    </td>
                                                    <td colSpan={2} className="py-1.5 px-4 text-sm">
                                                      <span>{shape.name || shape.description || 'Shape'}</span>
                                                      {shape.isCustom && (
                                                        <span className="ml-2 text-[9px] text-orange-600 bg-orange-100 px-1 rounded dark:text-orange-400 dark:bg-orange-900/30">custom</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))
                                              )}
                                            </>
                                          );
                                        })()}
                                        
                                        {/* Render handling items in saved order (handlingOrder) if available, otherwise fallback to TEs then DAs */}
                                        {element.handlingOrder ? (
                                          // Use handlingOrder for correct drag-drop sequence
                                          element.handlingOrder.map((orderItem, idx) => {
                                            // Get jump symbol for jump series (only if within jumpCount)
                                            const jumpSymbol = isJumpSeriesBreakdown && idx < (element.dbData.jumpCount || 0)
                                              ? element.dbData.symbolImages[0]
                                              : null;
                                            
                                            if (orderItem.type === 'te') {
                                              const te = element.teElements?.find(t => t.id === orderItem.id);
                                              if (!te) return null;
                                              return (
                                                <tr key={te.id} className="border-b border-border/30 last:border-b-0">
                                                  {isJumpSeriesBreakdown && (
                                                    <td className="py-2 px-4">
                                                      {jumpSymbol ? (
                                                        jumpSymbol.startsWith('TEXT:') ? (
                                                          <span className="text-lg font-bold">{jumpSymbol.replace('TEXT:', '')}</span>
                                                        ) : (
                                                          <img src={jumpSymbol} alt="Jump" className="h-6 w-6 object-contain" />
                                                        )
                                                      ) : (
                                                        <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                                      )}
                                                    </td>
                                                  )}
                                                  <td className="py-2 px-4">
                                                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded dark:text-green-300 dark:bg-green-900/30">TE</span>
                                                  </td>
                                                  <td className="py-2 px-4">
                                                    {te.symbolImage ? (
                                                      <img src={te.symbolImage} alt={te.name} className="h-6 w-6 object-contain" />
                                                    ) : (
                                                      <div className="h-6 w-6 bg-white dark:bg-background rounded border border-border/30" />
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-4 font-medium">
                                                    <div className="flex flex-col">
                                                      <span>{te.name}</span>
                                                      {element.dbData?.code === '3.1704' && element.dbData?.rotationCount && element.dbData.rotationCount > 1 && (
                                                        <span className="text-xs text-muted-foreground">
                                                          (handling for {idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} rotation)
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-4 text-right font-mono">{te.value.toFixed(1)}</td>
                                                </tr>
                                              );
                                            } else {
                                              const da = element.daElements?.find(d => d.id === orderItem.id);
                                              if (!da) return null;
                                              return (
                                                <tr key={da.id} className="border-b border-border/30 last:border-b-0">
                                                  {isJumpSeriesBreakdown && (
                                                    <td className="py-2 px-4">
                                                      {jumpSymbol ? (
                                                        jumpSymbol.startsWith('TEXT:') ? (
                                                          <span className="text-lg font-bold">{jumpSymbol.replace('TEXT:', '')}</span>
                                                        ) : (
                                                          <img src={jumpSymbol} alt="Jump" className="h-6 w-6 object-contain" />
                                                        )
                                                      ) : (
                                                        <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                                      )}
                                                    </td>
                                                  )}
                                                  <td className="py-2 px-4">
                                                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded dark:text-orange-300 dark:bg-orange-900/30">DA</span>
                                                  </td>
                                                  <td className="py-2 px-4">
                                                    <div className="flex items-center gap-1">
                                                      {da.symbolImages.map((url, imgIdx) => (
                                                        url.startsWith('TEXT:') ? (
                                                          <span key={imgIdx} className="text-lg font-bold">{url.replace('TEXT:', '')}</span>
                                                        ) : (
                                                          <img key={imgIdx} src={url} alt="Symbol" className="h-6 w-6 object-contain" />
                                                        )
                                                      ))}
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-4 font-medium">{da.name}</td>
                                                  <td className="py-2 px-4 text-right font-mono">{da.value.toFixed(1)}</td>
                                                </tr>
                                              );
                                            }
                                          })
                                        ) : (
                                          <>
                                            {/* Fallback: Technical Elements Rows (for DB/TE or DB/TE/DA) */}
                                            {(element.type === 'DB/TE' || element.type === 'DB/TE/DA') && element.teElements && element.teElements.map((te, idx) => {
                                              // Get jump symbol for jump series (only if within jumpCount)
                                              const jumpSymbol = isJumpSeriesBreakdown && idx < (element.dbData?.jumpCount || 0)
                                                ? element.dbData?.symbolImages[0]
                                                : null;
                                              
                                              return (
                                                <tr key={te.id} className="border-b border-border/30 last:border-b-0">
                                                  {isJumpSeriesBreakdown && (
                                                    <td className="py-2 px-4">
                                                      {jumpSymbol ? (
                                                        jumpSymbol.startsWith('TEXT:') ? (
                                                          <span className="text-lg font-bold">{jumpSymbol.replace('TEXT:', '')}</span>
                                                        ) : (
                                                          <img src={jumpSymbol} alt="Jump" className="h-6 w-6 object-contain" />
                                                        )
                                                      ) : (
                                                        <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                                      )}
                                                    </td>
                                                  )}
                                                  <td className="py-2 px-4">
                                                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded dark:text-green-300 dark:bg-green-900/30">TE</span>
                                                  </td>
                                                  <td className="py-2 px-4">
                                                    {te.symbolImage ? (
                                                      <img src={te.symbolImage} alt={te.name} className="h-6 w-6 object-contain" />
                                                    ) : (
                                                      <div className="h-6 w-6 bg-white dark:bg-background rounded border border-border/30" />
                                                    )}
                                                  </td>
                                                  <td className="py-2 px-4 font-medium">
                                                    <div className="flex flex-col">
                                                      <span>{te.name}</span>
                                                      {element.dbData?.code === '3.1704' && element.dbData?.rotationCount && element.dbData.rotationCount > 1 && (
                                                        <span className="text-xs text-muted-foreground">
                                                          (handling for {idx + 1}{idx === 0 ? 'st' : idx === 1 ? 'nd' : idx === 2 ? 'rd' : 'th'} rotation)
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-4 text-right font-mono">{te.value.toFixed(1)}</td>
                                                </tr>
                                              );
                                            })}
                                            
                                            {/* Fallback: DA Elements Rows (for DB/DA or DB/TE/DA) - one row per DA element */}
                                            {(element.type === 'DB/DA' || element.type === 'DB/TE/DA') && element.daElements && element.daElements.map((da, idx) => {
                                              const teCount = element.type === 'DB/TE/DA' && element.teElements ? element.teElements.length : 0;
                                              const rowIndex = teCount + idx;
                                              // Get jump symbol for jump series (only if within jumpCount)
                                              const jumpSymbol = isJumpSeriesBreakdown && rowIndex < (element.dbData?.jumpCount || 0)
                                                ? element.dbData?.symbolImages[0]
                                                : null;
                                              
                                              return (
                                                <tr key={da.id} className="border-b border-border/30 last:border-b-0">
                                                  {isJumpSeriesBreakdown && (
                                                    <td className="py-2 px-4">
                                                      {jumpSymbol ? (
                                                        jumpSymbol.startsWith('TEXT:') ? (
                                                          <span className="text-lg font-bold">{jumpSymbol.replace('TEXT:', '')}</span>
                                                        ) : (
                                                          <img src={jumpSymbol} alt="Jump" className="h-6 w-6 object-contain" />
                                                        )
                                                      ) : (
                                                        <span className="text-xs text-muted-foreground">#{rowIndex + 1}</span>
                                                      )}
                                                    </td>
                                                  )}
                                                  <td className="py-2 px-4">
                                                    <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded dark:text-orange-300 dark:bg-orange-900/30">DA</span>
                                                  </td>
                                                  <td className="py-2 px-4">
                                                    <div className="flex items-center gap-1">
                                                      {da.symbolImages.map((url, imgIdx) => (
                                                        url.startsWith('TEXT:') ? (
                                                          <span key={imgIdx} className="text-lg font-bold">{url.replace('TEXT:', '')}</span>
                                                        ) : (
                                                          <img key={imgIdx} src={url} alt="Symbol" className="h-6 w-6 object-contain" />
                                                        )
                                                      ))}
                                                    </div>
                                                  </td>
                                                  <td className="py-2 px-4 font-medium">{da.name}</td>
                                                  <td className="py-2 px-4 text-right font-mono">{da.value.toFixed(1)}</td>
                                                </tr>
                                              );
                                            })}
                                            
                                            {/* Fallback: Single DA row if no daElements array (for DB/DA) */}
                                            {(element.type === 'DB/DA' || element.type === 'DB/TE/DA') && !element.daElements && element.daData && element.daData.value > 0 && (
                                              <tr>
                                                {isJumpSeriesBreakdown && (
                                                  <td className="py-2 px-4">
                                                    {element.dbData?.symbolImages[0] ? (
                                                      element.dbData.symbolImages[0].startsWith('TEXT:') ? (
                                                        <span className="text-lg font-bold">{element.dbData.symbolImages[0].replace('TEXT:', '')}</span>
                                                      ) : (
                                                        <img src={element.dbData.symbolImages[0]} alt="Jump" className="h-6 w-6 object-contain" />
                                                      )
                                                    ) : (
                                                      <span className="text-xs text-muted-foreground">#1</span>
                                                    )}
                                                  </td>
                                                )}
                                                <td className="py-2 px-4">
                                                  <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded dark:text-orange-300 dark:bg-orange-900/30">DA</span>
                                                </td>
                                                <td className="py-2 px-4">
                                                  <div className="flex items-center gap-1">
                                                    {element.daData.symbolImages.map((url, idx) => (
                                                      url.startsWith('TEXT:') ? (
                                                        <span key={idx} className="text-lg font-bold">{url.replace('TEXT:', '')}</span>
                                                      ) : (
                                                        <img key={idx} src={url} alt="Symbol" className="h-6 w-6 object-contain" />
                                                      )
                                                    ))}
                                                  </div>
                                                </td>
                                                <td className="py-2 px-4 font-medium">{element.daData.name || 'DA Element'}</td>
                                                <td className="py-2 px-4 text-right font-mono">{element.daData.value.toFixed(1)}</td>
                                              </tr>
                                            )}
                                          </>
                                        )}
                                        {/* Adjustment rows within DB/DA/TE breakdown */}
                                        {element.adjustments && element.adjustments.length > 0 && element.adjustments.map((adj) => (
                                          <tr key={adj.id} className="border-b border-border/30 last:border-b-0 bg-amber-50/50 dark:bg-amber-900/10">
                                            <td className="py-2 px-4">
                                              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 text-[10px]">ADJ</Badge>
                                            </td>
                                            <td className="py-2 px-4">
                                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">ADJ</span>
                                            </td>
                                            <td className="py-2 px-4">
                                              {adj.isEditing && !isViewMode ? (
                                                <Input
                                                  className="h-7 text-sm max-w-[180px]"
                                                  placeholder="Description..."
                                                  value={adj.name}
                                                  onChange={(e) => handleUpdateAdjustment(index, adj.id, e.target.value, adj.value)}
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              ) : (
                                                <span className="text-sm font-medium">{adj.name || 'Adjustment'}</span>
                                              )}
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                              <div className="flex items-center justify-end gap-1">
                                                {adj.isEditing && !isViewMode ? (
                                                  <Input
                                                    className="h-7 text-sm text-right font-mono w-16"
                                                    type="number"
                                                    step="0.1"
                                                    value={adj.value}
                                                    onChange={(e) => handleUpdateAdjustment(index, adj.id, adj.name, parseFloat(e.target.value) || 0)}
                                                    onClick={(e) => e.stopPropagation()}
                                                  />
                                                ) : (
                                                  <span className={`font-mono ${adj.value < 0 ? 'text-destructive' : ''}`}>{adj.value.toFixed(1)}</span>
                                                )}
                                                {!isViewMode && adj.isEditing && (
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => handleToggleAdjustmentEdit(index, adj.id, false)}>
                                                    <Check className="h-3 w-3" />
                                                  </Button>
                                                )}
                                                {!isViewMode && !adj.isEditing && (
                                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleAdjustmentEdit(index, adj.id, true)}>
                                                    <Pencil className="h-3 w-3" />
                                                  </Button>
                                                )}
                                                {!isViewMode && (
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleRemoveAdjustment(index, adj.id)}>
                                                    <X className="h-3 w-3" />
                                                  </Button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          // Standalone adjustment expansion for elements without DB/DA/TE or Risk breakdown
                          const hasOwnBreakdown = (element.type === 'DB/DA' || element.type === 'DB/TE' || element.type === 'DB/TE/DA' || element.type === 'R' || element.type === 'R/DB');
                          if (!hasOwnBreakdown && element.isExpanded && element.adjustments && element.adjustments.length > 0) {
                            rows.push(
                              <TableRow key={`${element.id}-adj-expanded`} className="bg-white dark:bg-background">
                                <TableCell colSpan={6} className="p-4">
                                  <div className="ml-8 border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                      <thead className="bg-white dark:bg-background">
                                        <tr>
                                          <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground w-16">Type</th>
                                          <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">Symbol</th>
                                          <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">Name</th>
                                          <th className="py-2 px-4 text-right text-sm font-semibold text-muted-foreground">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {element.adjustments.map((adj) => (
                                          <tr key={adj.id} className="border-b border-border/30 last:border-b-0 bg-amber-50/50 dark:bg-amber-900/10">
                                            <td className="py-2 px-4">
                                              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 text-[10px]">ADJ</Badge>
                                            </td>
                                            <td className="py-2 px-4">
                                              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">ADJ</span>
                                            </td>
                                            <td className="py-2 px-4">
                                              {adj.isEditing && !isViewMode ? (
                                                <Input
                                                  className="h-7 text-sm max-w-[180px]"
                                                  placeholder="Description..."
                                                  value={adj.name}
                                                  onChange={(e) => handleUpdateAdjustment(index, adj.id, e.target.value, adj.value)}
                                                  onClick={(e) => e.stopPropagation()}
                                                />
                                              ) : (
                                                <span className="text-sm font-medium">{adj.name || 'Adjustment'}</span>
                                              )}
                                            </td>
                                            <td className="py-2 px-4 text-right">
                                              <div className="flex items-center justify-end gap-1">
                                                {adj.isEditing && !isViewMode ? (
                                                  <Input
                                                    className="h-7 text-sm text-right font-mono w-16"
                                                    type="number"
                                                    step="0.1"
                                                    value={adj.value}
                                                    onChange={(e) => handleUpdateAdjustment(index, adj.id, adj.name, parseFloat(e.target.value) || 0)}
                                                    onClick={(e) => e.stopPropagation()}
                                                  />
                                                ) : (
                                                  <span className={`font-mono ${adj.value < 0 ? 'text-destructive' : ''}`}>{adj.value.toFixed(1)}</span>
                                                )}
                                                {!isViewMode && adj.isEditing && (
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => handleToggleAdjustmentEdit(index, adj.id, false)}>
                                                    <Check className="h-3 w-3" />
                                                  </Button>
                                                )}
                                                {!isViewMode && !adj.isEditing && (
                                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleAdjustmentEdit(index, adj.id, true)}>
                                                    <Pencil className="h-3 w-3" />
                                                  </Button>
                                                )}
                                                {!isViewMode && (
                                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleRemoveAdjustment(index, adj.id)}>
                                                    <X className="h-3 w-3" />
                                                  </Button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </TableCell>
                              </TableRow>
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

          {/* Save / Cancel / Back Buttons */}
          {isViewMode ? (
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 text-base"
                onClick={() => navigate('/routines')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Routines
              </Button>
            </div>
          ) : (
            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1 h-12 text-base"
                onClick={handleNavigateBack}
              >
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button
                variant="secondary"
                className="flex-1 h-12 text-base"
                onClick={() => setShowRoutineCheckDialog(true)}
              >
                <ClipboardCheck className="h-4 w-4 mr-2" /> Routine Check
              </Button>
              <Button
                className="flex-1 h-12 text-base"
                onClick={() => {
                  if (editingRoutineId && loadedRoutineName) {
                    setRoutineSaveName(loadedRoutineName);
                  } else {
                    const parts = [gymnastName, selectedApparatus, year].filter(Boolean);
                    const defaultName = parts.length > 0 ? parts.join(' - ') : 'Untitled Routine';
                    setRoutineSaveName(defaultName);
                  }
                  setSaveDialogOpen(true);
                }}
              >
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Save Routine Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Routine</DialogTitle>
            <DialogDescription>Review and edit the routine name before saving.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="routine-name">Routine Name</Label>
              <Input
                id="routine-name"
                value={routineSaveName}
                onChange={(e) => setRoutineSaveName(e.target.value)}
                placeholder="Enter routine name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isSaving || !routineSaveName.trim()}
              onClick={async () => {
                setIsSaving(true);
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    toast({ title: "Please log in", description: "You need to be logged in to save routines.", variant: "destructive" });
                    setIsSaving(false);
                    return;
                  }
                  let error;
                  if (editingRoutineId) {
                    const result = await (supabase.from('routines' as any).update({
                      name: routineSaveName.trim(),
                      apparatus: selectedApparatus,
                      year: year || null,
                      gymnast_name: gymnastName || null,
                      elements: routineElements as any,
                      total_db: totalDB,
                      total_da: totalDA,
                    } as any).eq('id', editingRoutineId) as any);
                    error = result.error;
                  } else {
                    const result = await supabase.from('routines' as any).insert({
                      user_id: user.id,
                      name: routineSaveName.trim(),
                      apparatus: selectedApparatus,
                      year: year || null,
                      gymnast_name: gymnastName || null,
                      elements: routineElements as any,
                      total_db: totalDB,
                      total_da: totalDA,
                    } as any);
                    error = result.error;
                  }
                  if (error) throw error;
                  toast({ title: editingRoutineId ? "Routine updated!" : "Routine saved!", description: `"${routineSaveName.trim()}" has been saved to My Routines.` });
                  setSaveDialogOpen(false);
                  setRoutineElements([]);
                  setGymnastName('');
                  setYear('');
                  setSelectedApparatus(null);
                  localStorage.removeItem('routineElements');
                  localStorage.removeItem('selectedApparatus');
                  navigate('/routines');
                } catch (err: any) {
                  toast({ title: "Error saving routine", description: err.message, variant: "destructive" });
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <Dialog open={unsavedChangesDialogOpen} onOpenChange={setUnsavedChangesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save them before leaving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setUnsavedChangesDialogOpen(false);
                navigate('/routines');
              }}
            >
              Discard
            </Button>
            <Button
              onClick={() => {
                setUnsavedChangesDialogOpen(false);
                if (editingRoutineId && loadedRoutineName) {
                  setRoutineSaveName(loadedRoutineName);
                } else {
                  const parts = [];
                  if (gymnastName) parts.push(gymnastName);
                  if (selectedApparatus) parts.push(selectedApparatus.charAt(0).toUpperCase() + selectedApparatus.slice(1));
                  if (year) parts.push(year);
                  const defaultName = parts.length > 0 ? parts.join(' - ') : 'Untitled Routine';
                  setRoutineSaveName(defaultName);
                }
                setSaveDialogOpen(true);
              }}
            >
              <Save className="h-4 w-4 mr-2" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        onOpenElementInfo={(jump, modifyingElementId) => {
          handleSelectJump(jump, false, modifyingElementId);
        }}
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
        onOpenElementInfo={(balance, modifyingElementId) => {
          handleSelectBalance(balance, false, modifyingElementId);
        }}
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
        getSymbolUrl={getSymbolUrl}
        onOpenElementInfo={(rotation, rotationCount, totalValue, modifyingElementId) => {
          handleSelectRotation(rotation, rotationCount, totalValue, false, modifyingElementId);
        }}
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
        initialSelectedElements={pendingTechnicalElements}
        elementType={pendingElementInfo?.elementType || pendingDbElement?.type || null}
        onRemoveElement={(id) => {
          setPendingTechnicalElements(prev => prev.filter(te => te.id !== id));
        }}
        isJumpSeries={pendingElementInfo?.isJumpSeries || false}
      />

      {/* Element Information Dialog for configuring new or modifying existing DB/DA/TE elements */}
      <ElementInformationDialog
        open={elementInfoDialogOpen}
        onOpenChange={setElementInfoDialogOpen}
        element={pendingElementInfo ? {
          id: pendingElementInfo.element.id,
          code: pendingElementInfo.element.code,
          name: pendingElementInfo.element.name,
          description: pendingElementInfo.element.description,
          value: pendingElementInfo.element.value,
          turn_degrees: 'turn_degrees' in pendingElementInfo.element ? pendingElementInfo.element.turn_degrees : undefined,
          extra_value: 'extra_value' in pendingElementInfo.element ? (pendingElementInfo.element as SelectedRotation).extra_value : undefined,
          symbol_image: pendingElementInfo.element.symbol_image,
          flat: 'flat' in pendingElementInfo.element ? (pendingElementInfo.element as SelectedBalance).flat : undefined,
          slow_turn: 'slow_turn' in pendingElementInfo.element ? (pendingElementInfo.element as SelectedBalance).slow_turn : undefined,
        } : modifyingRoutineElement?.originalData ? {
          id: (modifyingRoutineElement.originalData as SelectedJump | SelectedBalance | SelectedRotation).id,
          code: (modifyingRoutineElement.originalData as SelectedJump | SelectedBalance | SelectedRotation).code,
          name: (modifyingRoutineElement.originalData as SelectedJump | SelectedBalance | SelectedRotation).name,
          description: (modifyingRoutineElement.originalData as SelectedJump | SelectedBalance | SelectedRotation).description,
          value: modifyingRoutineElement.dbData?.value || (modifyingRoutineElement.originalData as SelectedJump | SelectedBalance | SelectedRotation).value,
          turn_degrees: 'turn_degrees' in modifyingRoutineElement.originalData ? (modifyingRoutineElement.originalData as SelectedRotation).turn_degrees : undefined,
          extra_value: 'extra_value' in modifyingRoutineElement.originalData ? (modifyingRoutineElement.originalData as SelectedRotation).extra_value : undefined,
          symbol_image: (modifyingRoutineElement.originalData as SelectedJump | SelectedBalance | SelectedRotation).symbol_image,
          flat: 'flat' in modifyingRoutineElement.originalData ? (modifyingRoutineElement.originalData as SelectedBalance).flat : undefined,
          slow_turn: 'slow_turn' in modifyingRoutineElement.originalData ? (modifyingRoutineElement.originalData as SelectedBalance).slow_turn : undefined,
        } : null}
        elementType={pendingElementInfo?.elementType || pendingDbElement?.type || null}
        onSave={handleElementInfoSave}
        onCancel={() => {
          setModifyingRoutineElement(null);
          clearPendingHandlingItems();
          setPendingDbElement(null);
          setPendingElementInfo(null);
        }}
        getSymbolUrl={getSymbolUrl}
        getTechnicalElementSymbol={getTechnicalElementSymbol}
        apparatus={selectedApparatus}
        onOpenApparatusDialog={handleElementInfoOpenApparatusDialog}
        onOpenTechnicalElementsDialog={handleElementInfoOpenTechnicalElementsDialog}
        selectedTechnicalElements={pendingTechnicalElements}
        selectedDaElements={pendingDaElements}
        handlingItems={pendingHandlingItems}
        initialRotationCount={pendingElementInfo?.rotationCount}
        initialIsSeries={pendingElementInfo?.isSeries}
        isModifying={modifyingRoutineElement !== null}
        onRemoveTechnicalElement={(itemId) => {
          // Filter by unique item.id, not data.id, to support duplicate TEs in jump series
          setPendingHandlingItems(prev => prev.filter(item => item.id !== itemId));
        }}
        onRemoveDaElement={(itemId) => {
          // Filter by unique item.id, not data.id
          setPendingHandlingItems(prev => prev.filter(item => item.id !== itemId));
        }}
        onReorderHandlingItems={(items) => {
          setPendingHandlingItems(items);
        }}
        onRotationCountChange={(count) => {
          // Persist rotation count changes to pendingElementInfo so it's not lost when navigating to TE/DA dialogs
          setPendingElementInfo(prev => prev ? { ...prev, rotationCount: count } : null);
        }}
        onSeriesChange={(series) => {
          // Persist series state changes to pendingElementInfo so it's not lost when navigating to TE/DA dialogs
          setPendingElementInfo(prev => prev ? { ...prev, isSeries: series } : null);
        }}
        initialIsJumpSeries={pendingElementInfo?.isJumpSeries}
        initialJumpCount={pendingElementInfo?.jumpCount}
        onJumpSeriesChange={(isJumpSeries) => {
          // Persist jump series state changes to pendingElementInfo so it's not lost when navigating to TE/DA dialogs
          setPendingElementInfo(prev => prev ? { ...prev, isJumpSeries } : null);
        }}
        onJumpCountChange={(jumpCount) => {
          // Persist jump count changes to pendingElementInfo so it's not lost when navigating to TE/DA dialogs
          setPendingElementInfo(prev => prev ? { ...prev, jumpCount } : null);
        }}
        initialFouetteComponents={pendingElementInfo?.fouetteComponents}
        onFouetteComponentsChange={(components) => {
          setPendingElementInfo(prev => prev ? { ...prev, fouetteComponents: components } : null);
        }}
        initialFlatFoot={pendingElementInfo?.isFlatFoot}
        initialSlowTurn={pendingElementInfo?.isSlowTurn}
        onFlatFootChange={(flatFoot) => {
          setPendingElementInfo(prev => prev ? { ...prev, isFlatFoot: flatFoot } : null);
        }}
        onSlowTurnChange={(slowTurn) => {
          setPendingElementInfo(prev => prev ? { ...prev, isSlowTurn: slowTurn } : null);
        }}
      />

      {/* Rules Dialog */}
      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Routine Rules</DialogTitle>
            <DialogDescription>Requirements for a valid routine under FIG CoP.</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Item Type</th>
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Requirement</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { type: 'Risks (R)', req: 'Maximum 4' },
                  { type: 'DA (Apparatus Difficulty)', req: 'Maximum 15' },
                  { type: 'Dance Steps', req: 'Minimum 2' },
                  { type: 'DB (Body Difficulty)', req: 'Maximum 8' },
                  { type: 'DB — Jumps', req: 'At least 1' },
                  { type: 'DB — Rotations', req: 'At least 1' },
                  { type: 'DB — Balances', req: 'At least 1' },
                ].map((rule, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-3">{rule.type}</td>
                    <td className="py-2 px-3">{rule.req}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRulesDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Routine Check Dialog */}
      <Dialog open={showRoutineCheckDialog} onOpenChange={setShowRoutineCheckDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Routine Check</DialogTitle>
            <DialogDescription>Validation results for the current routine.</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Rule</th>
                  <th className="py-2 px-3 text-center font-medium text-muted-foreground">Current</th>
                  <th className="py-2 px-3 text-center font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const riskCount = routineElements.filter(el => el.type === 'R' || el.type === 'R/DB').length;
                  const stepsCount = routineElements.filter(el => el.type === 'Steps').length;

                  // DB groups: check elementType on dbData for explicit DB elements
                  const hasJump = routineElements.some(el =>
                    (el.type === 'DB' || el.type === 'DB/DA' || el.type === 'DB/TE' || el.type === 'DB/TE/DA') && el.dbData?.elementType === 'jump'
                  );
                  const hasRotation = routineElements.some(el =>
                    (el.type === 'DB' || el.type === 'DB/DA' || el.type === 'DB/TE' || el.type === 'DB/TE/DA') && el.dbData?.elementType === 'rotation'
                  );
                  const hasBalance = routineElements.some(el =>
                    (el.type === 'DB' || el.type === 'DB/DA' || el.type === 'DB/TE' || el.type === 'DB/TE/DA') && el.dbData?.elementType === 'balance'
                  );

                  // Risks also contain DB components (rotations) — check riskData
                  const riskHasRotation = routineElements.some(el =>
                    (el.type === 'R' || el.type === 'R/DB') && el.riskData?.components?.some(c => c.rotationTag === 'ACRO' || c.rotationTag === 'VER' || c.rotationTag === 'DB')
                  );

                  const checks = [
                    { label: 'Risks (Max 4)', current: String(riskCount), pass: riskCount <= 4 },
                    { label: 'DA (Max 15)', current: String(countDA), pass: countDA <= 15 },
                    { label: 'Dance Steps (Min 2)', current: String(stepsCount), pass: stepsCount >= 2 },
                    { label: 'DB Total (Max 8)', current: String(countDB), pass: countDB <= 8 },
                    { label: 'DB — Jumps (Min 1)', current: hasJump ? 'Yes' : 'No', pass: hasJump },
                    { label: 'DB — Rotations (Min 1)', current: (hasRotation || riskHasRotation) ? 'Yes' : 'No', pass: hasRotation || riskHasRotation },
                    { label: 'DB — Balances (Min 1)', current: hasBalance ? 'Yes' : 'No', pass: hasBalance },
                  ];

                  return checks.map((check, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 px-3">{check.label}</td>
                      <td className="py-2 px-3 text-center font-mono">{check.current}</td>
                      <td className="py-2 px-3 text-center">
                        {check.pass ? (
                          <Check className="h-5 w-5 text-green-600 inline-block" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-destructive inline-block" />
                        )}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoutineCheckDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoutineCalculator;
