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
  currentColorIndex?: number;
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

export const ApparatusTable = ({ 
  data, 
  criteria, 
  selectedIds, 
  onRowClick, 
  apparatus,
  selectedCriteria: externalSelectedCriteria,
  onCriteriaChange,
  daGroups = [],
  currentColorIndex = 0
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

  const getCellBorderColor = (rowId: string, criterionCode: string): string | null => {
    const isSelected = isCriterionSelected(rowId, criterionCode);
    if (!isSelected) return null;
    
    // Find which DA groups this cell belongs to
    const belongsToGroups = daGroups.filter(group => 
      group.cells.some(cell => cell.rowId === rowId && cell.criterionCode === criterionCode)
    );
    
    if (belongsToGroups.length > 0) {
      // Cell is part of completed DA(s), use the first DA's color
      return belongsToGroups[0].color;
    }
    
    // Cell is selected but not yet part of a completed DA, use current color
    const colorIndex = currentColorIndex % DA_COLORS.length;
    return DA_COLORS[colorIndex];
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
                  const borderColor = getCellBorderColor(item.id, code);
                  
                  return (
                    <TableCell 
                      key={code} 
                      className={`text-center text-sm transition-colors relative ${
                        isClickable ? 'cursor-pointer hover:bg-primary/10' : ''
                      } ${
                        isSelected ? 'bg-primary/30 font-bold' : ''
                      } ${
                        borderColor ? `border-4 ${borderColor}` : ''
                      }`}
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
