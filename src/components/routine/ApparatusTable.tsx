import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableContainer } from "@/components/ui/table";
import { CombinedApparatusData, Criterion, CRITERIA_CODES, ApparatusType } from "@/types/apparatus";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import React from "react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface ApparatusTableProps {
  data: CombinedApparatusData[];
  criteria: Criterion[];
  selectedIds: string[];
  onRowClick: (item: CombinedApparatusData) => void;
  apparatus: ApparatusType;
  selectedCriteria?: SelectedCriterion[];
  onCriteriaChange?: (criteria: SelectedCriterion[]) => void;
  daGroups?: { cells: SelectedCriterion[], color: string }[];
  currentColorIndex?: number;
  daComments?: { apparatus: string; code: string; comment: string }[];
}

export interface SelectedCriterion {
  rowId: string;
  criterionCode: string;
}

const formatCriteriaValue = (value: boolean): string => {
  return value ? 'v' : 'NA';
};

// Color palette for DA groups (15 distinct colors optimized for visibility on light backgrounds)
const DA_COLORS = [
  'border-red-600',
  'border-pink-500',
  'border-fuchsia-600',
  'border-purple-600',
  'border-indigo-600',
  'border-blue-600',
  'border-cyan-600',
  'border-teal-600',
  'border-emerald-600',
  'border-green-600',
  'border-lime-500',
  'border-yellow-500',
  'border-amber-600',
  'border-orange-600',
  'border-rose-600',
];

export const ApparatusTable = ({ 
  data, 
  criteria, 
  selectedIds, 
  onRowClick, 
  apparatus,
  selectedCriteria: externalSelectedCriteria,
  onCriteriaChange,
  daGroups = [],
  currentColorIndex = 0,
  daComments = []
}: ApparatusTableProps) => {
  const [internalSelectedCriteria, setInternalSelectedCriteria] = React.useState<SelectedCriterion[]>([]);
  const [expandedParents, setExpandedParents] = React.useState<Set<string>>(new Set());
  const selectedCriteria = externalSelectedCriteria ?? internalSelectedCriteria;

  // Build a map of which codes actually have children
  const codesWithChildren = React.useMemo(() => {
    const parentCodes = new Set<string>();
    data.forEach(item => {
      if (item.code.includes('.')) {
        const parentCode = item.code.split('.')[0];
        parentCodes.add(parentCode);
      }
    });
    return parentCodes;
  }, [data]);

  // All codes present (to verify a parent row actually exists)
  const allCodes = React.useMemo(() => new Set(data.map(d => d.code)), [data]);

  // Helper functions to determine parent-child relationships
  const hasChildren = (code: string) => codesWithChildren.has(code);
  const isChildRow = (code: string) => code.includes('.');
  const getParentCode = (code: string) => code.split('.')[0];

  const toggleParent = (parentCode: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentCode)) {
        newSet.delete(parentCode);
      } else {
        newSet.add(parentCode);
      }
      return newSet;
    });
  };

  const handleCriterionClick = (rowId: string, criterionCode: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    
    const updateFn = (prev: SelectedCriterion[]) => {
      const existing = prev.find(sc => sc.rowId === rowId && sc.criterionCode === criterionCode);
      if (existing) {
        // Deselect
        return prev.filter(sc => !(sc.rowId === rowId && sc.criterionCode === criterionCode));
      } else {
        // Select
        return [...prev, { rowId, criterionCode }];
      }
    };

    if (onCriteriaChange) {
      onCriteriaChange(updateFn(selectedCriteria));
    } else {
      setInternalSelectedCriteria(updateFn);
    }
  };

  const isCriterionSelected = (rowId: string, criterionCode: string) => {
    return selectedCriteria.some(sc => sc.rowId === rowId && sc.criterionCode === criterionCode);
  };

  const getCellBorderColor = (rowId: string, criterionCode: string): string | null => {
    const isSelected = isCriterionSelected(rowId, criterionCode);
    if (!isSelected) return null;
    
    // Find which DA group this cell belongs to
    const belongsToGroup = daGroups.find(group => 
      group.cells.some(cell => cell.rowId === rowId && cell.criterionCode === criterionCode)
    );
    
    if (belongsToGroup) {
      // Cell is part of a DA, use its assigned color
      return belongsToGroup.color;
    }
    
    // Cell is selected but not yet part of a DA
    return null;
  };

  
  const getCriterionSymbol = (code: string) => {
    const criterion = criteria.find((c) => c.code === code);
    if (!criterion?.symbol_image) return null;
    
    const { data: { publicUrl } } = supabase.storage
      .from('criteria-symbols')
      .getPublicUrl(criterion.symbol_image);
    
    return publicUrl;
  };

  const getBaseSymbol = (filename: string | null) => {
    if (!filename) return null;
    
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
    if (!filename) return null;
    
    // Try technical elements bucket as fallback
    const teBucket = `${apparatus}-technical-elements-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(teBucket)
      .getPublicUrl(filename);
    
    return publicUrl;
  };

  // Get comment for a specific DA code (handles codes with "&")
  const getCommentForCode = (code: string) => {
    return daComments.find(comment => comment.code === code);
  };

  // Render symbols for codes separated by "&"
  const renderSymbolsForCodes = (codeString: string) => {
    const codes = codeString.split('&').map(c => c.trim());
    const symbols: JSX.Element[] = [];
    
    codes.forEach((code, index) => {
      const element = data.find(d => d.code === code);
      if (element?.symbol_image) {
        symbols.push(
          <img 
            key={`${code}-${index}`}
            src={getTechnicalElementSymbol(element.symbol_image) || ''} 
            alt={code}
            className="h-8 w-auto inline-block align-middle mx-0.5"
            onError={(e) => {
              console.error('Failed to load symbol:', element.symbol_image);
              e.currentTarget.style.display = 'none';
            }}
          />
        );
      }
    });
    
    return symbols.length > 0 ? symbols : null;
  };

  // Helper to get technical element symbol
  const getTechnicalElementSymbol = (filename: string | null) => {
    if (!filename) return null;
    
    const teBucket = `${apparatus}-technical-elements-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(teBucket)
      .getPublicUrl(filename);
    
    return publicUrl;
  };

  // Parse comment to render text with symbols for referenced codes
  const renderCommentWithSymbols = (comment: string) => {
    // Match patterns like H12.1 or H09.1 (code patterns)
    const codePattern = /([A-Z]\d+(?:\.\d+)?)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codePattern.exec(comment)) !== null) {
      const code = match[1];
      
      // Add text before the code
      if (match.index > lastIndex) {
        parts.push(comment.substring(lastIndex, match.index));
      }
      
      // Find the technical element with this code
      const element = data.find(d => d.code === code);
      if (element?.symbol_image) {
        parts.push(
          <img 
            key={`${code}-${match.index}`}
            src={getTechnicalElementSymbol(element.symbol_image) || ''} 
            alt={code}
            className="h-8 w-auto inline-block align-middle mx-1"
            onError={(e) => {
              console.error('Failed to load symbol:', element.symbol_image);
              e.currentTarget.style.display = 'none';
            }}
          />
        );
      } else {
        // If no symbol found, just show the code
        parts.push(code);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < comment.length) {
      parts.push(comment.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : comment;
  };

  return (
    <div className="space-y-4">
      {daComments && daComments.length > 0 && (
        <Collapsible defaultOpen className="rounded-lg border bg-muted/30">
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
            <h3 className="font-semibold text-sm">Notes</h3>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=closed]]:rotate-[-90deg]" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div className="space-y-2">
              {daComments.map((comment, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-0.5 flex-shrink-0 min-w-[80px]">
                    {renderSymbolsForCodes(comment.code)}
                  </div>
                  <span className="text-muted-foreground flex-1">{comment.comment}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    <TableContainer className="h-[500px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-primary-foreground/20">
            <TableHead className="sticky top-0 z-20 bg-primary text-primary-foreground font-semibold text-lg w-[300px]">Base</TableHead>
            <TableHead className="sticky top-0 z-20 bg-primary text-primary-foreground font-semibold text-lg text-center w-[150px]">Base symbol</TableHead>
            <TableHead className="sticky top-0 z-20 bg-primary text-primary-foreground font-semibold text-lg text-center w-[120px]">Value</TableHead>
            {CRITERIA_CODES.map((code) => (
              <TableHead key={code} className="sticky top-0 z-20 bg-primary text-primary-foreground font-semibold text-center w-[90px] p-2">
                <div className="flex flex-col items-center gap-1">
                  {code === 'Cr5W' ? (
                    <span className="text-3xl font-bold">W</span>
                  ) : getCriterionSymbol(code) ? (
                    <img 
                      src={getCriterionSymbol(code)!} 
                      alt={code}
                      className="h-20 w-20 object-contain invert brightness-0"
                    />
                  ) : (
                    <span className="text-xs">{code}</span>
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const parentCodeCandidate = getParentCode(item.code);
            const isChild = isChildRow(item.code);
            const hasParentRow = isChild && allCodes.has(parentCodeCandidate);
            const isCollapsibleChild = isChild && hasParentRow && codesWithChildren.has(parentCodeCandidate);
            const isParent = hasChildren(item.code);
            const isExpanded = isParent && expandedParents.has(item.code);
            
            // Hide only true collapsible children if their parent is not expanded
            if (isCollapsibleChild && !expandedParents.has(parentCodeCandidate)) {
              return null;
            }
            
            const isSelected = selectedIds.includes(item.id);
            return (
              <TableRow
                key={item.id}
                onClick={isParent ? (e) => toggleParent(item.code, e) : () => onRowClick(item)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50'
                } ${isCollapsibleChild ? 'bg-muted/30' : ''}`}
              >
                <TableCell className="font-medium text-sm">
                  <div className="flex items-center gap-2">
                    {isParent && (
                      isExpanded ? 
                        <ChevronDown className="h-4 w-4 text-primary" /> : 
                        <ChevronRight className="h-4 w-4 text-primary" />
                    )}
                    {isCollapsibleChild && <span className="ml-6" />}
                    {item.description}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {item.symbol_image && (
                    <div className="flex justify-center">
                      <img 
                        src={getBaseSymbol(item.symbol_image) || ''} 
                        alt={item.code}
                        className="h-16 w-auto object-contain"
                        onError={(e) => {
                          const currentSrc = e.currentTarget.src;
                          const basesUrl = getBaseSymbol(item.symbol_image);
                          const fallbackUrl = getBaseSymbolFallback(item.symbol_image);
                          
                          // If currently showing bases URL, try fallback
                          if (currentSrc === basesUrl && fallbackUrl) {
                            console.log('Trying fallback bucket for:', item.code, item.symbol_image);
                            e.currentTarget.src = fallbackUrl;
                          } else {
                            // Both failed, hide image
                            console.error('Failed to load base symbol from both buckets:', item.code, item.symbol_image, 'Bases:', basesUrl, 'TE:', fallbackUrl);
                            e.currentTarget.style.display = 'none';
                          }
                        }}
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center font-semibold">{item.value.toFixed(2)}</TableCell>
                {CRITERIA_CODES.map((code) => {
                  const value = item.criteria[code];
                  const isCellSelected = isCriterionSelected(item.id, code);
                  const isClickable = formatCriteriaValue(value) === 'v' && !isParent;
                  const borderColor = getCellBorderColor(item.id, code);
                  
                  // For collapsible child rows, show "o" instead of "v"
                  const displayValue = isCollapsibleChild && formatCriteriaValue(value) === 'v' 
                    ? 'o' 
                    : formatCriteriaValue(value);
                  
                  return (
                    <TableCell 
                      key={code} 
                      className={`text-center text-sm transition-colors relative ${
                        isClickable ? 'cursor-pointer hover:bg-primary/10' : ''
                      } ${
                        isCellSelected ? 'bg-primary/60 font-bold text-primary-foreground' : ''
                      } ${
                        borderColor ? `border-4 border-solid ${borderColor}` : ''
                      } ${
                        isParent && formatCriteriaValue(value) === 'v' ? 'opacity-30' : ''
                      }`}
                      onClick={isClickable ? (e) => handleCriterionClick(item.id, code, e) : undefined}
                    >
                      {displayValue}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </TableContainer>
    </div>
  );
};
