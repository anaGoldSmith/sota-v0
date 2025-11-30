import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApparatusType } from "@/types/apparatus";

interface TechnicalElement {
  id: string;
  code: string;
  name: string;
  description: string;
  symbol_image: string | null;
  technical_element: boolean;
  da: boolean;
  special_code: boolean;
  parent_group: string;
  parent_group_code: string;
}

interface TechnicalElementsSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apparatus: ApparatusType | null;
  onSelectTechnicalElements: (elements: TechnicalElement[]) => void;
  onGoBack: () => void;
}

export const TechnicalElementsSelectionDialog = ({
  open,
  onOpenChange,
  apparatus,
  onSelectTechnicalElements,
  onGoBack
}: TechnicalElementsSelectionDialogProps) => {
  const [searchText, setSearchText] = useState("");
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());

  // Fetch technical elements for the selected apparatus
  const { data: technicalElements = [], isLoading, error } = useQuery({
    queryKey: ["technical-elements-selection", apparatus],
    queryFn: async () => {
      if (!apparatus) return [];

      let data, error;

      switch (apparatus) {
        case 'hoop':
          ({ data, error } = await supabase
            .from('hoop_technical_elements')
            .select('*')
            .eq('technical_element', true)
            .order('code'));
          break;
        case 'ball':
          ({ data, error } = await supabase
            .from('ball_technical_elements')
            .select('*')
            .eq('technical_element', true)
            .order('code'));
          break;
        case 'clubs':
          ({ data, error } = await supabase
            .from('clubs_technical_elements')
            .select('*')
            .eq('technical_element', true)
            .order('code'));
          break;
        case 'ribbon':
          ({ data, error } = await supabase
            .from('ribbon_technical_elements')
            .select('*')
            .eq('technical_element', true)
            .order('code'));
          break;
        default:
          return [];
      }

      if (error) throw error;
      return (data || []) as TechnicalElement[];
    },
    enabled: !!apparatus && open,
  });

  // Get symbol URL
  const getSymbolUrl = (symbolImage: string | null) => {
    if (!symbolImage || !apparatus) return null;
    
    const bucket = `${apparatus}-technical-elements-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(symbolImage);
    return publicUrl;
  };

  // Filter elements based on search
  const filteredElements = useMemo(() => {
    if (!technicalElements) return [];
    
    if (!searchText) return technicalElements;
    
    const lowerSearch = searchText.toLowerCase();
    return technicalElements.filter(el => 
      el.code.toLowerCase().includes(lowerSearch) ||
      el.name.toLowerCase().includes(lowerSearch) ||
      el.description.toLowerCase().includes(lowerSearch) ||
      el.parent_group.toLowerCase().includes(lowerSearch)
    );
  }, [technicalElements, searchText]);

  // Group elements by parent_group
  const groupedElements = useMemo(() => {
    const groups = new Map<string, TechnicalElement[]>();
    
    filteredElements.forEach(el => {
      const group = el.parent_group || 'Other';
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(el);
    });
    
    return groups;
  }, [filteredElements]);

  const handleElementClick = (element: TechnicalElement) => {
    setSelectedElements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(element.id)) {
        newSet.delete(element.id);
      } else {
        newSet.add(element.id);
      }
      return newSet;
    });
  };

  const handleConfirmSelection = () => {
    const selected = technicalElements.filter(el => selectedElements.has(el.id));
    onSelectTechnicalElements(selected);
    setSelectedElements(new Set());
    setSearchText("");
    onOpenChange(false);
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedElements(new Set());
      setSearchText("");
    }
    onOpenChange(isOpen);
  };

  const handleGoBack = () => {
    setSelectedElements(new Set());
    setSearchText("");
    onOpenChange(false);
    onGoBack();
  };

  const apparatusLabel = apparatus ? apparatus.charAt(0).toUpperCase() + apparatus.slice(1) : '';

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Select Technical Elements - {apparatusLabel}
          </DialogTitle>
          <DialogDescription>
            Select technical elements to add as apparatus handling for your DB element.
          </DialogDescription>
        </DialogHeader>

        {/* Search Section */}
        <div className="space-y-2">
          <Label htmlFor="te-search">Search technical elements</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              id="te-search" 
              placeholder="Search by name, code, or description..." 
              value={searchText} 
              onChange={e => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {isLoading ? "Loading..." : `${filteredElements.length} element${filteredElements.length !== 1 ? 's' : ''} found`}
          </span>
          {selectedElements.size > 0 && (
            <span className="font-medium text-foreground">
              {selectedElements.size} element{selectedElements.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        {/* Elements Table */}
        <div className="border rounded-md flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-[45vh]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading technical elements...
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive font-medium">Failed to load technical elements</p>
                <p className="text-sm text-muted-foreground">Please try again</p>
              </div>
            ) : filteredElements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No technical elements found matching your search
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="w-[80px]">Symbol</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(groupedElements.entries()).map(([group, elements]) => (
                    elements.map((element) => {
                      const isSelected = selectedElements.has(element.id);
                      const symbolUrl = getSymbolUrl(element.symbol_image);
                      
                      return (
                        <TableRow 
                          key={element.id}
                          className={`cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-primary/20 hover:bg-primary/30' 
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => handleElementClick(element)}
                        >
                          <TableCell className="relative">
                            <div className="w-12 h-12 bg-muted/50 rounded flex items-center justify-center">
                              {symbolUrl ? (
                                <img 
                                  src={symbolUrl} 
                                  alt={element.name}
                                  className="w-10 h-10 object-contain"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </div>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-md z-10 border-2 border-background">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {element.description}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-4">
          <Button variant="outline" onClick={handleGoBack}>
            Go Back
          </Button>
          <Button 
            onClick={handleConfirmSelection}
            disabled={selectedElements.size === 0}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
