import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Search, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const StandardRisks = () => {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedRiskData, setSavedRiskData] = useState<any>(null);

  useEffect(() => {
    const loadSymbols = async () => {
      const symbolUrls: Record<string, string> = {};
      
      // R2 and baseRotations from other_risks folder
      const { data: r2Data } = supabase.storage
        .from("dynamic-element-symbols")
        .getPublicUrl("other_risks/R2.png");
      symbolUrls["R2"] = r2Data.publicUrl;
      
      const { data: rotationsData } = supabase.storage
        .from("dynamic-element-symbols")
        .getPublicUrl("other_risks/baseRotations.png");
      symbolUrls["baseRotations"] = rotationsData.publicUrl;
      
      // Thr1 from dynamic_throws folder
      const { data: throwData } = supabase.storage
        .from("dynamic-element-symbols")
        .getPublicUrl("dynamic_throws/Thr1.png");
      symbolUrls["Thr1"] = throwData.publicUrl;
      
      // Catch1 from dynamic_catches folder
      const { data: catchData } = supabase.storage
        .from("dynamic-element-symbols")
        .getPublicUrl("dynamic_catches/Catch1.png");
      symbolUrls["Catch1"] = catchData.publicUrl;
      
      setSymbols(symbolUrls);
    };
    
    loadSymbols();
  }, []);

  const handleSave = () => {
    const riskData = {
      type: 'R' as const,
      label: 'R₂',
      value: 0.2,
      symbols: symbols,
      components: [
        { name: 'Standard Throw', symbol: symbols["Thr1"], value: 0 },
        { name: 'Base Rotations', symbol: symbols["baseRotations"], value: 0.2 },
        { name: 'Standard Catch', symbol: symbols["Catch1"], value: 0 },
      ]
    };
    setSavedRiskData(riskData);
    setShowSuccessDialog(true);
  };

  const handleAddMoreStandardRisks = () => {
    // Navigate to routine calculator with current risk, then come back
    navigate("/routine-calculator", { state: { newRisk: savedRiskData } });
    setTimeout(() => navigate("/standard-risks"), 100);
  };

  const handleCreateOwnRisk = () => {
    navigate("/routine-calculator", { state: { newRisk: savedRiskData } });
    setTimeout(() => navigate("/create-custom-risk"), 100);
  };

  const handleGoToCalculator = () => {
    navigate("/routine-calculator", { state: { newRisk: savedRiskData } });
  };

  const handleCancel = () => {
    navigate("/dynamic-elements-risk");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dynamic-elements-risk")}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold text-center flex-1">
            Standard Risk
          </h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Risk Label */}
          <div className="text-center flex items-center justify-center gap-2">
            <h2 className="text-4xl font-bold text-primary flex items-baseline">
              R<sub className="text-2xl">2</sub>
            </h2>
            {symbols["R2"] && (
              <img 
                src={symbols["R2"]} 
                alt="R2 Symbol" 
                className="h-12 w-auto object-contain"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>

          {/* Risk Components Table */}
          <Card className="border-primary/20 shadow-md">
            <CardContent className="p-0">
              {/* Table Header */}
              <div className="flex items-center border-b border-border bg-muted/30">
                <div className="w-16 py-3 px-4 text-center">
                  <span className="text-base font-semibold text-muted-foreground">Symbol</span>
                </div>
                <div className="flex-1 py-3 px-4">
                  <span className="text-base font-semibold text-muted-foreground">Risk Components</span>
                </div>
                <div className="w-24 py-3 px-4 text-center border-l border-border">
                  <span className="text-base font-semibold text-muted-foreground">Value</span>
                </div>
              </div>

              {/* Standard Throw Row */}
              <div className="flex items-center border-b border-border">
                <div className="w-16 flex justify-center py-4">
                  {symbols["Thr1"] ? (
                    <img 
                      src={symbols["Thr1"]} 
                      alt="Standard Throw" 
                      className="h-8 w-8 object-contain"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="h-8 w-8 bg-muted rounded" />
                  )}
                </div>
                <div className="flex-1 py-4 px-4">
                  <span className="font-medium text-foreground">Standard Throw</span>
                </div>
                <div className="w-24 py-4 px-4 text-center border-l border-border">
                  <p className="font-semibold text-foreground">0</p>
                </div>
              </div>

              {/* Base Rotations Row */}
              <div className="flex items-center border-b border-border bg-secondary/10">
                <div className="w-16 flex justify-center py-4">
                  {symbols["baseRotations"] ? (
                    <img 
                      src={symbols["baseRotations"]} 
                      alt="Base Rotations" 
                      className="h-8 w-8 object-contain"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="h-8 w-8 bg-muted rounded" />
                  )}
                </div>
                <div className="flex-1 py-4 px-4">
                  <span className="font-medium text-foreground">Base Rotations</span>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Search className="h-4 w-4" />
                    <span>Search for rotation</span>
                  </div>
                </div>
                <div className="w-24 py-4 px-4 text-center border-l border-border">
                  <p className="font-semibold text-primary">0.2</p>
                </div>
              </div>

              {/* Standard Catch Row */}
              <div className="flex items-center">
                <div className="w-16 flex justify-center py-4">
                  {symbols["Catch1"] ? (
                    <img 
                      src={symbols["Catch1"]} 
                      alt="Standard Catch" 
                      className="h-8 w-8 object-contain"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className="h-8 w-8 bg-muted rounded" />
                  )}
                </div>
                <div className="flex-1 py-4 px-4">
                  <span className="font-medium text-foreground">Standard Catch</span>
                </div>
                <div className="w-24 py-4 px-4 text-center border-l border-border">
                  <p className="font-semibold text-foreground">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4">
            <Button
              className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSave}
            >
              Save
            </Button>
            <Button
              variant="outline"
              className="px-8 border-muted-foreground"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </main>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <DialogTitle className="text-center text-xl">Risk Saved!</DialogTitle>
            <DialogDescription className="text-center">
              The standard risk R₂ has been saved to the routine calculator.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleAddMoreStandardRisks}
            >
              Add More Standard Risks
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-secondary text-secondary hover:bg-secondary/10"
              onClick={handleCreateOwnRisk}
            >
              Create Your Own Risk
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleGoToCalculator}
            >
              Go to Routine Calculator
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StandardRisks;
