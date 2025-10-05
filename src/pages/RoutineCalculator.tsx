import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RotationIcon, JumpIcon, BalanceIcon } from "@/components/icons/DbSymbols";

const RoutineCalculator = () => {
  const navigate = useNavigate();

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
              <Input 
                id="apparatus"
                type="text"
                placeholder="E.g. Hoop"
              />
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
              <Input 
                id="rulebook"
                type="text"
                placeholder="Fig CoP"
              />
            </div>
          </div>

          {/* Difficulty of Body Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Difficulties of Body (DB)</h2>
            
            <div className="space-y-3">
              <Button 
                variant="outline"
                className="w-full h-14 text-lg justify-start gap-1"
              >
                <span>Jumps</span>
                <JumpIcon className="!h-7 !w-7" />
              </Button>

              <Button
                variant="outline"
                className="w-full h-14 text-lg justify-start gap-1"
              >
                <span>Balances</span>
                <BalanceIcon className="!h-7 !w-7" />
              </Button>

              <Button 
                variant="outline"
                className="w-full h-14 text-lg justify-start gap-1"
              >
                <span>Rotations</span>
                <RotationIcon className="!h-8 !w-8" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoutineCalculator;
