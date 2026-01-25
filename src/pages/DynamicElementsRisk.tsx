import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Minus, Plus, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { ApparatusType } from "@/types/apparatus";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PrerecordedRisk {
  id: string;
  risk_code: string;
  name: string;
  total_value: number | null;
  symbol_image: string | null;
}

const DynamicElementsRisk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const [prerecordedRisks, setPrerecordedRisks] = useState<PrerecordedRisk[]>([]);
  
  // Get apparatus from navigation state
  const apparatus = (location.state as { apparatus?: ApparatusType })?.apparatus;

  useEffect(() => {
    const fetchPrerecordedRisks = async () => {
      const { data, error } = await supabase
        .from('prerecorded_risks')
        .select('id, risk_code, name, total_value, symbol_image')
        .order('risk_code');
      
      if (!error && data) {
        setPrerecordedRisks(data);
      }
    };

    fetchPrerecordedRisks();
  }, []);

  const handleSelectRisk = (risk: PrerecordedRisk) => {
    navigate("/standard-risk-detail", { state: { apparatus, selectedRisk: risk } });
  };

  const handleCreateOwnRisk = () => {
    navigate("/create-custom-risk", { state: { apparatus } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/routine-calculator")} className="text-primary-foreground hover:bg-primary-foreground/20">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold text-center flex-1">
            Dynamic Elements with Rotations
            <span className="block text-lg font-normal text-primary-foreground/80">
              Risk Constructor
            </span>
          </h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Action Buttons */}
          <div className="space-y-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full h-auto py-3 text-lg hover:scale-[1.02] transition-transform bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                  <span className="flex flex-col items-center gap-1">
                    <span className="flex items-center gap-2">
                      Select Standard Risk
                      <ChevronDown className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-normal opacity-80">(including series of turning leaps)</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                side="bottom" 
                align="center"
                className="w-[calc(100vw-2rem)] max-w-2xl bg-background z-50 p-0"
              >
                {/* Header row - not scrollable */}
                <div className="grid grid-cols-[100px_1fr_50px] gap-2 px-3 py-2 border-b bg-muted text-sm font-medium text-muted-foreground">
                  <span>Symbol</span>
                  <span>Risk Name</span>
                  <span>Value</span>
                </div>
                {/* Scrollable content */}
                <div className="max-h-64 overflow-y-auto">
                  {prerecordedRisks.length === 0 ? (
                    <DropdownMenuItem disabled>No prerecorded risks available</DropdownMenuItem>
                  ) : (
                    prerecordedRisks.map((risk) => (
                      <DropdownMenuItem
                        key={risk.id}
                        onClick={() => handleSelectRisk(risk)}
                        className="grid grid-cols-[100px_1fr_50px] gap-2 py-2 px-3 cursor-pointer items-center rounded-none border-b border-border/50 last:border-b-0"
                      >
                        <div className="flex justify-center items-center h-16">
                          {risk.symbol_image ? (
                            <img 
                              src={risk.symbol_image} 
                              alt={risk.name} 
                              className={risk.risk_code === 'r2' 
                                ? "max-w-[50px] max-h-12 object-contain" 
                                : "max-w-[90px] max-h-16 object-contain"
                              }
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              —
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-sm">{risk.name}</span>
                        <span className="font-medium">{risk.total_value ?? 0.2}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              className="w-full h-16 text-lg hover:scale-[1.02] transition-transform border-secondary text-secondary hover:bg-secondary/10" 
              onClick={handleCreateOwnRisk}
            >
              Create Risk with Extra Criteria
            </Button>
          </div>

          {/* Dynamic Elements Overview Box */}
          <Collapsible open={isOverviewOpen} onOpenChange={setIsOverviewOpen}>
            <Card className="border-primary/20 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-secondary/10 rounded-t-lg">
                <CardTitle className="text-primary">Dynamic Elements Overview</CardTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                    {isOverviewOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-4">
                  <p className="text-foreground">Here you can create dynamic elements with rotations, called Risks.</p>
                  
                  <div>
                    <p className="font-medium mb-2 text-foreground">A valid Risk consists of the following parts:</p>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      <li>A high throw of the apparatus</li>
                      <li>Two base rotations</li>
                      <li>A catch of the apparatus after the rotations</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-2 text-primary">Risk Value</p>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      <li>The base value of a standard risk with two base rotations is 0.2 points</li>
                      <li>Each base rotation must be a full 360°</li>
                      <li>The value of Risk can be increased by using additional criteria that may be performed during the throw of the apparatus, under the flight, and/or during the catch of the apparatus</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-2 text-primary">Important Rules</p>
                    <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                      <li>To validate a Risk, at least two base rotations of 360° must be performed under the flight</li>
                      <li>Rotations can be performed around any axis, with or without passing to the floor</li>
                      <li>The two base rotations must be continuous, without additional steps between base rotations</li>
                    </ul>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </main>
    </div>
  );
};

export default DynamicElementsRisk;