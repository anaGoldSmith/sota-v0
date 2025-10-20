import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CombinedApparatusData, Criterion, CRITERIA_CODES, ApparatusType } from "@/types/apparatus";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface ApparatusTableProps {
  data: CombinedApparatusData[];
  criteria: Criterion[];
  selectedIds: string[];
  onRowClick: (item: CombinedApparatusData) => void;
  apparatus: ApparatusType;
}

const formatCriteriaValue = (value: string | null): string => {
  if (value === 'Y') return 'v';
  if (value === 'N') return 'N/A';
  return '';
};

export const ApparatusTable = ({ data, criteria, selectedIds, onRowClick, apparatus }: ApparatusTableProps) => {
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
    <ScrollArea className="h-[500px] rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-primary z-10">
          <TableRow className="hover:bg-primary">
            <TableHead className="text-primary-foreground font-semibold text-lg w-[300px]">Base</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-lg text-center w-[150px]">Base symbol</TableHead>
            <TableHead className="text-primary-foreground font-semibold text-lg text-center w-[120px]">Value</TableHead>
            {CRITERIA_CODES.map((code) => (
              <TableHead key={code} className="text-primary-foreground font-semibold text-center w-[90px] p-2">
                <div className="flex flex-col items-center gap-1">
                  {code === 'Cr5W' ? (
                    <span className="text-6xl font-bold">W</span>
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
                {CRITERIA_CODES.map((code) => (
                  <TableCell key={code} className="text-center text-sm">
                    {formatCriteriaValue(item.criteria[code])}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
