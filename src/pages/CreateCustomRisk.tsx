import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Plus, CheckCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CriteriaItem {
  id: string;
  name: string;
  symbol?: string;
  value: number;
}

const CreateCustomRisk = () => {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedRiskData, setSavedRiskData] = useState<any>(null);

  // Risk components state
  const [throwCriteria, setThrowCriteria] = useState<CriteriaItem[]>([
    { id: 'thr1', name: 'Standard Throw', value: 0 }
  ]);
  const [rotations, setRotations] = useState<CriteriaItem[]>([
    { id: 'rot1', name: 'Base Rotation 1', value: 0.1 },
    { id: 'rot2', name: 'Base Rotation 2', value: 0.1 }
  ]);
  const [catchCriteria, setCatchCriteria] = useState<CriteriaItem[]>([
    { id: 'catch1', name: 'Standard Catch', value: 0 }
  ]);

  // Calculate total value
  const totalValue = 
    throwCriteria.reduce((sum, item) => sum + item.value, 0) +
    rotations.reduce((sum, item) => sum + item.value, 0) +
    catchCriteria.reduce((sum, item) => sum + item.value, 0);

  // Calculate R level based on rotations count
  const rLevel = rotations.length;

  useEffect(() => {
    const loadSymbols = async () => {
      const symbolUrls: Record<string, string> = {};
      
      const { data: throwData } = supabase.storage
        .from("dynamic-element-symbols")
        .getPublicUrl("dynamic_throws/Thr1.png");
      symbolUrls["Thr1"] = throwData.publicUrl;
      
      const { data: catchData } = supabase.storage
        .from("dynamic-element-symbols")
        .getPublicUrl("dynamic_catches/Catch1.png");
      symbolUrls["Catch1"] = catchData.publicUrl;
      
      const { data: rotationsData } = supabase.storage
        .from("dynamic-element-symbols")
        .getPublicUrl("other_risks/baseRotations.png");
      symbolUrls["baseRotations"] = rotationsData.publicUrl;
      
      setSymbols(symbolUrls);
    };
    
    loadSymbols();
  }, []);

  const handleAddRotation = () => {
    const newRotation: CriteriaItem = {
      id: `rot${rotations.length + 1}`,
      name: `Base Rotation ${rotations.length + 1}`,
      value: 0.1
    };
    setRotations([...rotations, newRotation]);
  };

  const handleRemoveRotation = (id: string) => {
    if (rotations.length > 2) {
      setRotations(rotations.filter(r => r.id !== id));
    }
  };

  const handleAddThrowCriteria = () => {
    const newCriteria: CriteriaItem = {
      id: `thr${throwCriteria.length + 1}`,
      name: 'Extra Throw Criteria',
      value: 0.1
    };
    setThrowCriteria([...throwCriteria, newCriteria]);
  };

  const handleAddCatchCriteria = () => {
    const newCriteria: CriteriaItem = {
      id: `catch${catchCriteria.length + 1}`,
      name: 'Extra Catch Criteria',
      value: 0.1
    };
    setCatchCriteria([...catchCriteria, newCriteria]);
  };

  const handleSave = () => {
    const riskData = {
      type: 'R' as const,
      label: `R₊`,
      rLevel: rLevel,
      value: totalValue,
      symbols: symbols,
      components: [
        ...throwCriteria.map(t => ({ name: t.name, symbol: symbols["Thr1"], value: t.value })),
        ...rotations.map(r => ({ name: r.name, symbol: symbols["baseRotations"], value: r.value })),
        ...catchCriteria.map(c => ({ name: c.name, symbol: symbols["Catch1"], value: c.value })),
      ]
    };
    setSavedRiskData(riskData);
    setShowSuccessDialog(true);
  };

  const handleAddMoreStandardRisks = () => {
    navigate("/routine-calculator", { state: { newRisk: savedRiskData } });
    setTimeout(() => navigate("/standard-risks"), 100);
  };

  const handleCreateAnotherRisk = () => {
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
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold">Create Your Own Risk</h1>
            <p className="text-sm text-primary-foreground/80 mt-1">
              Create R<sub>3</sub>, R<sub>4</sub>, and higher-value Risks by adding rotations and extra throw and catch criteria
            </p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Risk Label */}
          <div className="text-center">
            <h2 className="text-4xl font-bold text-primary flex items-baseline justify-center">
              R<sub className="text-2xl">{rLevel}</sub>
              <span className="ml-4 text-2xl text-muted-foreground">= {totalValue.toFixed(1)}</span>
            </h2>
          </div>

          {/* Throw Section */}
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="pb-2 bg-secondary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-primary">Throw Criteria</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddThrowCriteria}
                  className="text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Criteria
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {throwCriteria.map((item, index) => (
                <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                  <div className="w-16 flex justify-center py-4">
                    {symbols["Thr1"] ? (
                      <img 
                        src={symbols["Thr1"]} 
                        alt="Throw" 
                        className="h-8 w-8 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="h-8 w-8 bg-muted rounded" />
                    )}
                  </div>
                  <div className="flex-1 py-4 px-4">
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <div className="w-24 py-4 px-4 text-center border-l border-border">
                    <p className="font-semibold text-foreground">{item.value}</p>
                  </div>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setThrowCriteria(throwCriteria.filter(t => t.id !== item.id))}
                      className="mr-2 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Rotations Section */}
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="pb-2 bg-secondary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-primary">Rotations (min. 2 required)</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddRotation}
                  className="text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rotation
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {rotations.map((item, index) => (
                <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                  <div className="w-16 flex justify-center py-4">
                    {symbols["baseRotations"] ? (
                      <img 
                        src={symbols["baseRotations"]} 
                        alt="Rotation" 
                        className="h-8 w-8 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="h-8 w-8 bg-muted rounded" />
                    )}
                  </div>
                  <div className="flex-1 py-4 px-4">
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <div className="w-24 py-4 px-4 text-center border-l border-border">
                    <p className="font-semibold text-primary">{item.value}</p>
                  </div>
                  {rotations.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRotation(item.id)}
                      className="mr-2 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Catch Section */}
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="pb-2 bg-secondary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-primary">Catch Criteria</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddCatchCriteria}
                  className="text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Criteria
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {catchCriteria.map((item, index) => (
                <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                  <div className="w-16 flex justify-center py-4">
                    {symbols["Catch1"] ? (
                      <img 
                        src={symbols["Catch1"]} 
                        alt="Catch" 
                        className="h-8 w-8 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : (
                      <div className="h-8 w-8 bg-muted rounded" />
                    )}
                  </div>
                  <div className="flex-1 py-4 px-4">
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                  <div className="w-24 py-4 px-4 text-center border-l border-border">
                    <p className="font-semibold text-foreground">{item.value}</p>
                  </div>
                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCatchCriteria(catchCriteria.filter(c => c.id !== item.id))}
                      className="mr-2 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
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
              Your custom risk R{rLevel} has been saved to the routine calculator.
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
              onClick={handleCreateAnotherRisk}
            >
              Create Another Custom Risk
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

export default CreateCustomRisk;
