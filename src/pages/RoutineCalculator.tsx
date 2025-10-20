import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RotationIcon, JumpIcon, BalanceIcon } from "@/components/icons/DbSymbols";
import { JumpSelectionDialog } from "@/components/routine/JumpSelectionDialog";
import { BalanceSelectionDialog } from "@/components/routine/BalanceSelectionDialog";
import { RotationSelectionDialog } from "@/components/routine/RotationSelectionDialog";
import { ApparatusSelectionDialog } from "@/components/routine/ApparatusSelectionDialog";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApparatusType, CombinedApparatusData } from "@/types/apparatus";
import { useToast } from "@/hooks/use-toast";

interface SelectedJump {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
}

interface SelectedBalance {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
}

interface SelectedRotation {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
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

  const handleRemoveApparatusElement = (index: number) => {
    setSelectedApparatusElements((prev) => prev.filter((_, i) => i !== index));
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

  const totalJumpDifficulty = selectedJumps.reduce((sum, jump) => sum + jump.value, 0);
  const totalBalanceDifficulty = selectedBalances.reduce((sum, balance) => sum + balance.value, 0);
  const totalRotationDifficulty = selectedRotations.reduce((sum, rotation) => sum + rotation.value, 0);
  const totalApparatusDifficulty = selectedApparatusElements.reduce((sum, element) => sum + element.value, 0);

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
              <Button 
                variant={activeCategory === "elements" ? "default" : "outline"}
                className="h-16 text-base hover:scale-[1.02] transition-transform"
                onClick={() => setActiveCategory(activeCategory === "elements" ? null : "elements")}
              >
                <span className="text-lg font-semibold mr-2">+</span> Elements (DB)
              </Button>
              
              <Button 
                variant={activeCategory === "apparatus" ? "default" : "outline"}
                className="h-16 text-base hover:scale-[1.02] transition-transform"
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
                variant={activeCategory === "dynamic" ? "default" : "outline"}
                className="h-16 text-base hover:scale-[1.02] transition-transform"
                onClick={() => setActiveCategory(activeCategory === "dynamic" ? null : "dynamic")}
              >
                <span className="text-lg font-semibold mr-2">+</span> Dynamic Element (R)
              </Button>
              
              <Button 
                variant={activeCategory === "dance" ? "default" : "outline"}
                className="h-16 text-base hover:scale-[1.02] transition-transform"
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

                {/* Selected Jumps Display */}
                {selectedJumps.length > 0 && (
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Selected Jumps</h3>
                      <Badge variant="default">Total: {totalJumpDifficulty.toFixed(2)}</Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedJumps.map((jump, index) => (
                        <div
                          key={`${jump.id}-${index}`}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-accent/50"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Badge variant="outline" className="font-mono shrink-0">
                              {jump.code}
                            </Badge>
                            <span className="text-sm truncate">
                              {jump.name || jump.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary">{jump.value}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveJump(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

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

                {/* Selected Balances Display */}
                {selectedBalances.length > 0 && (
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Selected Balances</h3>
                      <Badge variant="default">Total: {totalBalanceDifficulty.toFixed(2)}</Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedBalances.map((balance, index) => (
                        <div
                          key={`${balance.id}-${index}`}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-accent/50"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Badge variant="outline" className="font-mono shrink-0">
                              {balance.code}
                            </Badge>
                            <span className="text-sm truncate">
                              {balance.name || balance.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary">{balance.value}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveBalance(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

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

                {/* Selected Rotations Display */}
                {selectedRotations.length > 0 && (
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Selected Rotations</h3>
                      <Badge variant="default">Total: {totalRotationDifficulty.toFixed(2)}</Badge>
                    </div>
                    <div className="space-y-2">
                      {selectedRotations.map((rotation, index) => (
                        <div
                          key={`${rotation.id}-${index}`}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-accent/50"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Badge variant="outline" className="font-mono shrink-0">
                              {rotation.code}
                            </Badge>
                            <span className="text-sm truncate">
                              {rotation.name || rotation.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary">{rotation.value}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRemoveRotation(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Apparatus Difficulty (DA) */}
            {activeCategory === "apparatus" && selectedApparatusElements.length > 0 && (
              <Card className="p-4 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Selected Apparatus Elements</h3>
                  <Badge variant="default">Total DA: {totalApparatusDifficulty.toFixed(2)}</Badge>
                </div>
                <div className="space-y-2">
                  {selectedApparatusElements.map((element, index) => (
                    <div
                      key={`${element.id}-${index}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-accent/50"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className="font-mono shrink-0">
                          {element.code}
                        </Badge>
                        <span className="text-sm truncate">
                          {element.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">{element.value.toFixed(2)}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveApparatusElement(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
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
      />
    </div>
  );
};

export default RoutineCalculator;
