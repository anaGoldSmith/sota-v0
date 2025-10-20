import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, X, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RotationIcon, JumpIcon, BalanceIcon } from "@/components/icons/DbSymbols";
import { JumpSelectionDialog } from "@/components/routine/JumpSelectionDialog";
import { BalanceSelectionDialog } from "@/components/routine/BalanceSelectionDialog";
import { RotationSelectionDialog } from "@/components/routine/RotationSelectionDialog";
import { ApparatusSelectionDialog, ApparatusCombination } from "@/components/routine/ApparatusSelectionDialog";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApparatusType, CombinedApparatusData } from "@/types/apparatus";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  originalData: SelectedJump | SelectedBalance | SelectedRotation | ApparatusCombination;
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
  
  const [selectedJumps, setSelectedJumps] = useState<SelectedJump[]>([]);
  const [selectedBalances, setSelectedBalances] = useState<SelectedBalance[]>([]);
  const [selectedRotations, setSelectedRotations] = useState<SelectedRotation[]>([]);
  const [selectedApparatusElements, setSelectedApparatusElements] = useState<CombinedApparatusData[]>([]);
  const [selectedApparatusCombinations, setSelectedApparatusCombinations] = useState<ApparatusCombination[]>([]);

  const handleSelectJump = (jump: SelectedJump) => {
    setSelectedJumps((prev) => [...prev, jump]);
  };

  const handleRemoveJump = (index: number) => {
    setSelectedJumps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectBalance = (balance: SelectedBalance) => {
    setSelectedBalances((prev) => [...prev, balance]);
  };

  const handleRemoveBalance = (index: number) => {
    setSelectedBalances((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectRotation = (rotation: SelectedRotation) => {
    setSelectedRotations((prev) => [...prev, rotation]);
  };

  const handleRemoveRotation = (index: number) => {
    setSelectedRotations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectApparatusElements = (elements: CombinedApparatusData[]) => {
    setSelectedApparatusElements((prev) => [...prev, ...elements]);
  };

  const handleSelectApparatusCombinations = (combinations: ApparatusCombination[]) => {
    setSelectedApparatusCombinations((prev) => [...prev, ...combinations]);
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

  const getBaseSymbol = (filename: string | null, apparatus: ApparatusType) => {
    if (!filename) return null;
    
    const bucketName = `${apparatus}-bases-symbols`;
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);
    
    return publicUrl;
  };

  const getCriteriaSymbolUrl = (criterionCode: string) => {
    const { data: { publicUrl } } = supabase.storage
      .from('criteria-symbols')
      .getPublicUrl(`${criterionCode}.png`);
    return publicUrl;
  };

  // Combine all elements into unified routine elements
  const routineElements: RoutineElement[] = [
    ...selectedJumps.map((jump, index) => ({
      id: `jump-${jump.id}-${index}`,
      type: 'DB' as RoutineElementType,
      symbolImages: jump.symbol_image ? [getSymbolUrl(jump.symbol_image, 'jump-symbols') || ''] : [],
      value: jump.value,
      originalData: jump,
    })),
    ...selectedBalances.map((balance, index) => ({
      id: `balance-${balance.id}-${index}`,
      type: 'DB' as RoutineElementType,
      symbolImages: balance.symbol_image ? [getSymbolUrl(balance.symbol_image, 'jump-symbols') || ''] : [],
      value: balance.value,
      originalData: balance,
    })),
    ...selectedRotations.map((rotation, index) => ({
      id: `rotation-${rotation.id}-${index}`,
      type: 'DB' as RoutineElementType,
      symbolImages: rotation.symbol_image ? [getSymbolUrl(rotation.symbol_image, 'jump-symbols') || ''] : [],
      value: rotation.value,
      originalData: rotation,
    })),
    ...selectedApparatusCombinations.map((combo, index) => {
      const symbolImages = [];
      if (combo.element.symbol_image && selectedApparatus) {
        symbolImages.push(getBaseSymbol(combo.element.symbol_image, selectedApparatus) || '');
      }
      combo.selectedCriteria.forEach(criterionCode => {
        symbolImages.push(getCriteriaSymbolUrl(criterionCode));
      });
      return {
        id: `apparatus-${combo.element.id}-${index}`,
        type: 'DA' as RoutineElementType,
        symbolImages,
        value: combo.element.value,
        originalData: combo,
      };
    }),
  ];

  const totalDB = routineElements
    .filter(el => el.type === 'DB')
    .reduce((sum, el) => sum + el.value, 0);
  
  const totalDA = routineElements
    .filter(el => el.type === 'DA' || el.type === 'R')
    .reduce((sum, el) => sum + el.value, 0);

  const totalScore = totalDB + totalDA;

  const handleRemoveRoutineElement = (index: number) => {
    const element = routineElements[index];
    const originalData = element.originalData;

    if ('turn_degrees' in originalData && 'description' in originalData && originalData.description) {
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
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total DB:</span>
                        <Badge variant="secondary" className="font-mono">{totalDB.toFixed(2)}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total DA:</span>
                        <Badge variant="secondary" className="font-mono">{totalDA.toFixed(2)}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Total:</span>
                        <Badge variant="default" className="font-mono">{totalScore.toFixed(2)}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Item</TableHead>
                      <TableHead>Routine Elements</TableHead>
                      <TableHead className="w-24 text-right">Value</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routineElements.map((element, index) => (
                      <TableRow key={element.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {element.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {element.symbolImages.map((url, imgIndex) => (
                              url && (
                                <img
                                  key={`${element.id}-symbol-${imgIndex}`}
                                  src={url}
                                  alt="Symbol"
                                  className="h-12 w-auto object-contain"
                                />
                              )
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {element.value.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveRoutineElement(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
      />

      {/* Balance Selection Dialog */}
      <BalanceSelectionDialog
        open={balanceDialogOpen}
        onOpenChange={setBalanceDialogOpen}
        onSelectBalance={handleSelectBalance}
      />

      {/* Rotation Selection Dialog */}
      <RotationSelectionDialog
        open={rotationDialogOpen}
        onOpenChange={setRotationDialogOpen}
        onSelectRotation={handleSelectRotation}
      />

      {/* Apparatus Selection Dialog */}
      <ApparatusSelectionDialog
        open={apparatusDialogOpen}
        onOpenChange={setApparatusDialogOpen}
        apparatus={selectedApparatus}
        onSelectElements={handleSelectApparatusElements}
        onSelectCombinations={handleSelectApparatusCombinations}
      />
    </div>
  );
};

export default RoutineCalculator;
