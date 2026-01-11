import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ApparatusType } from "@/types/apparatus";

interface RiskComponent {
  id: string;
  risk_code: string;
  risk_component_code: string;
  description: string | null;
  symbol_image: string | null;
  symbol_text?: string;
  value: number | null;
}

interface PrerecordedRisk {
  id: string;
  risk_code: string;
  name: string;
  rotations_value: number | null;
  symbol_image: string | null;
}

interface LocationState {
  apparatus?: ApparatusType;
  selectedRisk?: PrerecordedRisk;
}

const StandardRiskDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [components, setComponents] = useState<RiskComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedRiskData, setSavedRiskData] = useState<any>(null);

  const state = location.state as LocationState;
  const apparatus = state?.apparatus;
  const selectedRisk = state?.selectedRisk;

  useEffect(() => {
    if (!selectedRisk) {
      navigate("/dynamic-elements-risk", { state: { apparatus } });
      return;
    }

    const fetchComponents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('prerecorded_risk_components')
        .select('*')
        .eq('risk_code', selectedRisk.risk_code)
        .order('risk_component_code');

      if (!error && data) {
        setComponents(data);
      }
      setLoading(false);
    };

    fetchComponents();
  }, [selectedRisk, apparatus, navigate]);

  // Categorize components by prefix
  const throwComponents = components.filter(c => c.risk_component_code.startsWith('thr_'));
  const rotationComponents = components.filter(c => c.risk_component_code.startsWith('utf_'));
  const catchComponents = components.filter(c => c.risk_component_code.startsWith('catch_'));

  // Calculate totals
  const throwTotal = throwComponents.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const baseRotationTotal = rotationComponents.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const catchTotal = catchComponents.reduce((sum, c) => sum + (c.value ?? 0), 0);
  
  // Check if the risk is R2
  const isR2 = selectedRisk?.risk_code?.toLowerCase() === 'r2';
  
  // R level is 3 for all standard risks except R2
  const getRLevel = () => {
    if (!selectedRisk) return '2';
    return isR2 ? '2' : '3';
  };

  // Additional rotation rows for non-R2 risks
  const additionalRotationRows: RiskComponent[] = isR2 ? [] : [
    {
      id: 'series-bonus',
      risk_code: selectedRisk?.risk_code || '',
      risk_component_code: 'series',
      description: 'Extra points for a series of identical jumps',
      symbol_image: null,
      symbol_text: 'S',
      value: 0.2,
    },
    {
      id: '3rotations-bonus',
      risk_code: selectedRisk?.risk_code || '',
      risk_component_code: '3rotations',
      description: 'Points for 3 rotations in a risk',
      symbol_image: null,
      symbol_text: '3rot',
      value: 0.3,
    },
  ];

  // Combined rotation components including additional rows
  const allRotationComponents = [...rotationComponents, ...additionalRotationRows];
  const rotationTotal = allRotationComponents.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const totalValue = selectedRisk?.rotations_value ?? (throwTotal + rotationTotal + catchTotal);

  const handleSave = () => {
    if (!selectedRisk) return;

    const riskData = {
      type: 'R' as const,
      label: `R₍${getRLevel()}₎`,
      value: totalValue,
      symbols: {
        main: selectedRisk.symbol_image,
      },
      components: [
        ...throwComponents.map(c => ({
          name: c.description || 'Throw',
          symbol: c.symbol_image,
          value: c.value ?? 0,
          section: 'throw'
        })),
        ...rotationComponents.map(c => ({
          name: c.description || 'Under the Flight',
          symbol: c.symbol_image,
          value: c.value ?? 0,
          section: 'rotation'
        })),
        ...catchComponents.map(c => ({
          name: c.description || 'Catch',
          symbol: c.symbol_image,
          value: c.value ?? 0,
          section: 'catch'
        })),
      ],
      riskCode: selectedRisk.risk_code,
      riskName: selectedRisk.name,
    };
    setSavedRiskData(riskData);
    setShowSuccessDialog(true);
  };

  const handleAddMoreStandardRisks = () => {
    navigate("/routine-calculator", { state: { newRisk: savedRiskData } });
    setTimeout(() => navigate("/dynamic-elements-risk", { state: { apparatus } }), 100);
  };

  const handleCreateOwnRisk = () => {
    navigate("/routine-calculator", { state: { newRisk: savedRiskData } });
    setTimeout(() => navigate("/create-custom-risk", { state: { apparatus } }), 100);
  };

  const handleGoToCalculator = () => {
    navigate("/routine-calculator", { state: { newRisk: savedRiskData } });
  };

  const handleCancel = () => {
    navigate("/dynamic-elements-risk", { state: { apparatus } });
  };

  const renderComponentRow = (component: RiskComponent, isLast: boolean = false) => (
    <div 
      key={component.id} 
      className={`flex items-center ${!isLast ? 'border-b border-border' : ''}`}
    >
      <div className="w-16 flex justify-center py-4">
        {component.symbol_image ? (
          <img 
            src={component.symbol_image} 
            alt={component.description || 'Symbol'} 
            className="h-8 w-auto max-w-[40px] object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : component.symbol_text ? (
          <div className="h-8 w-8 bg-primary/10 rounded flex items-center justify-center text-sm font-bold text-primary">
            {component.symbol_text}
          </div>
        ) : (
          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>
      <div className="flex-1 py-4 px-4">
        <span className="font-medium text-foreground text-sm">
          {component.description || component.risk_component_code}
        </span>
      </div>
      <div className="w-20 py-4 px-2 text-center border-l border-border">
        <p className="font-semibold text-primary">{component.value ?? 0}</p>
      </div>
    </div>
  );

  const renderSection = (title: string, sectionComponents: RiskComponent[], sectionTotal: number) => (
    <div className="mb-6">
      {/* Section Header */}
      <div className="flex items-center border-b-2 border-primary/30 bg-primary/5 rounded-t-lg">
        <div className="flex-1 py-3 px-4">
          <span className="text-base font-semibold text-primary">{title}</span>
        </div>
        <div className="w-20 py-3 px-2 text-center border-l border-primary/30">
          <span className="text-sm font-semibold text-muted-foreground">Value</span>
        </div>
      </div>
      
      {/* Section Components */}
      <div className="border-x border-b border-border rounded-b-lg bg-background">
        {sectionComponents.length > 0 ? (
          sectionComponents.map((component, index) => 
            renderComponentRow(component, index === sectionComponents.length - 1)
          )
        ) : (
          <div className="flex items-center py-4 px-4 text-muted-foreground text-sm">
            No components available
          </div>
        )}
        
        {/* Section Total */}
        {sectionComponents.length > 0 && (
          <div className="flex items-center border-t border-border bg-muted/30">
            <div className="w-16 py-2" />
            <div className="flex-1 py-2 px-4">
              <span className="font-medium text-muted-foreground text-sm">Section Total</span>
            </div>
            <div className="w-20 py-2 px-2 text-center border-l border-border">
              <p className="font-bold text-primary">{sectionTotal.toFixed(1)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!selectedRisk) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold text-center flex-1">
            Standard Risk Details
          </h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Risk Label */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-primary flex items-center justify-center gap-3">
              <span className="flex items-baseline">
                R<sub className="text-xl">{getRLevel()}</sub>
              </span>
              {selectedRisk.symbol_image && (
                <img 
                  src={selectedRisk.symbol_image} 
                  alt={selectedRisk.name} 
                  className="h-10 w-auto object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
            </h2>
            <p className="text-lg text-muted-foreground">{selectedRisk.name}</p>
          </div>

          {loading ? (
            <Card className="border-primary/20 shadow-md">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Loading components...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Throw Section */}
              {renderSection('Throw', throwComponents, throwTotal)}

              {/* Rotations Section */}
              {renderSection('Rotations', allRotationComponents, rotationTotal)}

              {/* Catch Section */}
              {renderSection('Catch', catchComponents, catchTotal)}

              {/* Total Value */}
              <Card className="border-primary/20 shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">Total Risk Value</span>
                    <span className="text-2xl font-bold text-primary">{totalValue.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4">
            <Button
              className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSave}
              disabled={loading}
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
              The risk {selectedRisk?.name} has been saved to the routine calculator.
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

export default StandardRiskDetail;
