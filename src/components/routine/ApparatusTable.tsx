import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableContainer } from "@/components/ui/table";
import { CombinedApparatusData, Criterion, CRITERIA_CODES, ApparatusType } from "@/types/apparatus";

import { supabase } from "@/integrations/supabase/client";
import React from "react";

interface ApparatusTableProps {
  data: CombinedApparatusData[];
  criteria: Criterion[];
  selectedIds: string[];
  onRowClick: (item: CombinedApparatusData) => void;
  apparatus: ApparatusType;
  selectedCriteria?: SelectedCriterion[];
  onCriteriaChange?: (criteria: SelectedCriterion[]) => void;
  daGroups?: { cells: SelectedCriterion[], color: string }[];
}

export interface SelectedCriterion {
  rowId: string;
  criterionCode: string;
}

const formatCriteriaValue = (value: string | null): string => {
  if (value === 'Y') return 'v';
  if (value === 'N') return 'N/A';
  return '';
};

export const ApparatusTable = ({ 
  data, 
  criteria, 
  selectedIds, 
  onRowClick, 
  apparatus,
  selectedCriteria: externalSelectedCriteria,
  onCriteriaChange,
  daGroups = []
}: ApparatusTableProps) => {
  const [internalSelectedCriteria, setInternalSelectedCriteria] = React.useState<SelectedCriterion[]>([]);
  const selectedCriteria = externalSelectedCriteria ?? internalSelectedCriteria;

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

  const getCellDaColors = (rowId: string, criterionCode: string): string[] => {
    const colors: string[] = [];
    for (const group of daGroups) {
      if (group.cells.some(cell => cell.rowId === rowId && cell.criterionCode === criterionCode)) {
        colors.push(group.color);
      }
    }
    return colors;
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
    
    const bucketName = `${apparatus}-bases-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);
    
    return publicUrl;
  };

  return (
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
            const isSelected = selectedIds.includes(item.id);
            return (
              <TableRow
                key={item.id}
                onClick={() => onRowClick(item)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50'
                }`}
              >
                <TableCell className="font-medium text-sm">{item.description}</TableCell>
                <TableCell className="text-center">
                  {item.symbol_image && (
                    <div className="flex justify-center">
                      <img 
                        src={getBaseSymbol(item.symbol_image) || ''} 
                        alt={item.code}
                        className="h-16 w-auto object-contain"
                        onError={(e) => {
                          console.error('Failed to load base symbol:', item.symbol_image);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center font-semibold">{item.value.toFixed(2)}</TableCell>
                {CRITERIA_CODES.map((code) => {
                  const value = item.criteria[code];
                  const isSelected = isCriterionSelected(item.id, code);
                  const isClickable = formatCriteriaValue(value) === 'v';
                  const daBorderColors = getCellDaColors(item.id, code);
                  
                  // Create layered border effect for multiple DAs
                  const getBorderClasses = () => {
                    if (daBorderColors.length === 0) return '';
                    if (daBorderColors.length === 1) return `border-4 ${daBorderColors[0]}`;
                    // For multiple colors, we'll use the first as border and show others via box-shadow
                    return `border-4 ${daBorderColors[0]}`;
                  };
                  
                  const getBoxShadow = () => {
                    if (daBorderColors.length <= 1) return {};
                    // Create layered box-shadows for additional colors
                    const shadows = daBorderColors.slice(1).map((color, index) => {
                      const offset = (index + 1) * 4;
                      // Map Tailwind color classes to CSS variables
                      const colorMap: Record<string, string> = {
                        'border-purple-500': 'rgb(168, 85, 247)',
                        'border-blue-500': 'rgb(59, 130, 246)',
                        'border-rose-500': 'rgb(244, 63, 94)',
                        'border-green-500': 'rgb(34, 197, 94)',
                        'border-orange-500': 'rgb(249, 115, 22)',
                        'border-cyan-500': 'rgb(6, 182, 212)',
                        'border-pink-500': 'rgb(236, 72, 153)',
                        'border-indigo-500': 'rgb(99, 102, 241)',
                        'border-yellow-500': 'rgb(234, 179, 8)',
                        'border-teal-500': 'rgb(20, 184, 166)',
                        'border-red-500': 'rgb(239, 68, 68)',
                        'border-lime-500': 'rgb(132, 204, 22)',
                        'border-violet-500': 'rgb(139, 92, 246)',
                        'border-amber-500': 'rgb(245, 158, 11)',
                        'border-emerald-500': 'rgb(16, 185, 129)',
                      };
                      const cssColor = colorMap[color] || 'rgb(168, 85, 247)';
                      return `inset 0 0 0 ${offset}px ${cssColor}`;
                    }).join(', ');
                    return { boxShadow: shadows };
                  };
                  
                  return (
                    <TableCell 
                      key={code} 
                      className={`text-center text-sm transition-colors relative ${
                        isClickable ? 'cursor-pointer hover:bg-primary/10' : ''
                      } ${
                        isSelected ? 'bg-primary/30 font-bold' : ''
                      } ${getBorderClasses()}`}
                      style={getBoxShadow()}
                      onClick={isClickable ? (e) => handleCriterionClick(item.id, code, e) : undefined}
                    >
                      {formatCriteriaValue(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </TableContainer>
  );
};
