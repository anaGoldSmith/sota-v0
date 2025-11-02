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
    
    // Otherwise, construct the public URL
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
                          const computedUrl = getBaseSymbol(item.symbol_image);
                          console.error('Failed to load base symbol:', item.code, item.symbol_image, computedUrl);
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
                        borderColor ? `border-4 border-solid ${borderColor}` : ''
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
