import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RotationIcon, JumpIcon, BalanceIcon } from "@/components/icons/DbSymbols";
import { JumpSelectionDialog } from "@/components/routine/JumpSelectionDialog";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface SelectedJump {
  id: string;
  code: string;
  name: string | null;
  description: string;
  value: number;
  turn_degrees: string | null;
}

const RoutineCalculator = () => {
  const navigate = useNavigate();
  const [jumpDialogOpen, setJumpDialogOpen] = useState(false);
  const [selectedJumps, setSelectedJumps] = useState<SelectedJump[]>([]);

  const handleSelectJump = (jump: SelectedJump) => {
    setSelectedJumps((prev) => [...prev, jump]);
  };

  const handleRemoveJump = (index: number) => {
    setSelectedJumps((prev) => prev.filter((_, i) => i !== index));
  };

  const totalJumpDifficulty = selectedJumps.reduce((sum, jump) => sum + jump.value, 0);

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
              <Select>
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

          {/* Difficulty of Body Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Difficulties of Body (DB)</h2>
            
            <div className="space-y-3">
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
              >
                <div className="flex items-center gap-1">
                  <span>Rotations</span>
                  <RotationIcon className="!h-8 !w-8" />
                </div>
                <span className="text-sm">+ Add</span>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Jump Selection Dialog */}
      <JumpSelectionDialog
        open={jumpDialogOpen}
        onOpenChange={setJumpDialogOpen}
        onSelectJump={handleSelectJump}
      />
    </div>
  );
};

export default RoutineCalculator;
