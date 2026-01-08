import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, CheckCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CriteriaItem {
  id: string;
  name: string;
  symbol?: string;
  value: number;
  code?: string;
}

interface GeneralCriteria {
  id: string;
  code: string;
  name: string;
  symbol_image: string | null;
}

const CreateCustomRisk = () => {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedRiskData, setSavedRiskData] = useState<any>(null);
  
  // Dropdown states
  const [showThrowDropdown, setShowThrowDropdown] = useState(false);
  const [showCatchDropdown, setShowCatchDropdown] = useState(false);
  const [generalCriteria, setGeneralCriteria] = useState<GeneralCriteria[]>([]);
  const [selectedThrowCriteria, setSelectedThrowCriteria] = useState<string[]>([]);
  const [selectedCatchCriteria, setSelectedCatchCriteria] = useState<string[]>([]);
  
  const throwDropdownRef = useRef<HTMLDivElement>(null);
  const catchDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (throwDropdownRef.current && !throwDropdownRef.current.contains(event.target as Node)) {
        setShowThrowDropdown(false);
      }
      if (catchDropdownRef.current && !catchDropdownRef.current.contains(event.target as Node)) {
        setShowCatchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    
    const loadGeneralCriteria = async () => {
      const { data, error } = await supabase
        .from('dynamic_general_criteria')
        .select('*');
      
      if (data && !error) {
        setGeneralCriteria(data);
      }
    };
    
    loadSymbols();
    loadGeneralCriteria();
  }, []);

  // Update selected criteria based on current throw/catch criteria
  useEffect(() => {
    const throwCodes = throwCriteria.filter(t => t.code).map(t => t.code!);
    setSelectedThrowCriteria(throwCodes);
  }, [throwCriteria]);

  useEffect(() => {
    const catchCodes = catchCriteria.filter(c => c.code).map(c => c.code!);
    setSelectedCatchCriteria(catchCodes);
  }, [catchCriteria]);

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

  const handleToggleThrowCriteria = (criteria: GeneralCriteria) => {
    const isSelected = selectedThrowCriteria.includes(criteria.code);
    
    if (isSelected) {
      // Remove from throw criteria
      setThrowCriteria(throwCriteria.filter(t => t.code !== criteria.code));
    } else {
      // Add to throw criteria (max 2 extra criteria)
      const extraCriteriaCount = throwCriteria.filter(t => t.code).length;
      if (extraCriteriaCount < 2) {
        const newCriteria: CriteriaItem = {
          id: `thr_${criteria.code}`,
          name: criteria.name,
          symbol: criteria.symbol_image || undefined,
          value: 0.1,
          code: criteria.code
        };
        setThrowCriteria([...throwCriteria, newCriteria]);
      }
    }
  };

  const handleToggleCatchCriteria = (criteria: GeneralCriteria) => {
    const isSelected = selectedCatchCriteria.includes(criteria.code);
    
    if (isSelected) {
      // Remove from catch criteria
      setCatchCriteria(catchCriteria.filter(c => c.code !== criteria.code));
    } else {
      // Add to catch criteria (max 2 extra criteria)
      const extraCriteriaCount = catchCriteria.filter(c => c.code).length;
      if (extraCriteriaCount < 2) {
        const newCriteria: CriteriaItem = {
          id: `catch_${criteria.code}`,
          name: criteria.name,
          symbol: criteria.symbol_image || undefined,
          value: 0.1,
          code: criteria.code
        };
        setCatchCriteria([...catchCriteria, newCriteria]);
      }
    }
  };

  const handleSaveThrowSelection = () => {
    setShowThrowDropdown(false);
  };

  const handleSaveCatchSelection = () => {
    setShowCatchDropdown(false);
  };

  const handleSave = () => {
    const riskData = {
      type: 'R' as const,
      label: `R₊`,
      rLevel: rLevel,
      value: totalValue,
      symbols: symbols,
      components: [
        ...throwCriteria.map(t => ({ name: t.name, symbol: t.symbol || symbols["Thr1"], value: t.value })),
        ...rotations.map(r => ({ name: r.name, symbol: symbols["baseRotations"], value: r.value })),
        ...catchCriteria.map(c => ({ name: c.name, symbol: c.symbol || symbols["Catch1"], value: c.value })),
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
                <div className="relative" ref={throwDropdownRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowThrowDropdown(!showThrowDropdown)}
                    className="text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                  
                  {/* Throw Dropdown Menu */}
                  {showThrowDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-border">
                        <span className="font-medium text-foreground">Select Criteria (max 2)</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {generalCriteria.map((criteria) => (
                          <div
                            key={criteria.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleToggleThrowCriteria(criteria)}
                          >
                            <Checkbox 
                              checked={selectedThrowCriteria.includes(criteria.code)}
                              disabled={!selectedThrowCriteria.includes(criteria.code) && selectedThrowCriteria.length >= 2}
                            />
                            {criteria.symbol_image && (
                              <img 
                                src={criteria.symbol_image} 
                                alt={criteria.name}
                                className="h-6 w-6 object-contain"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            )}
                            <span className="text-sm text-foreground">{criteria.name}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 border-t border-border">
                        <Button
                          size="sm"
                          className="w-full bg-primary hover:bg-primary/90"
                          onClick={handleSaveThrowSelection}
                        >
                          Save Selection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {throwCriteria.map((item, index) => (
                <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                  <div className="w-16 flex justify-center py-4">
                    {item.symbol ? (
                      <img 
                        src={item.symbol} 
                        alt={item.name} 
                        className="h-8 w-8 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : symbols["Thr1"] ? (
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
                  {item.code && (
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
                <div className="relative" ref={catchDropdownRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCatchDropdown(!showCatchDropdown)}
                    className="text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                  
                  {/* Catch Dropdown Menu */}
                  {showCatchDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-border">
                        <span className="font-medium text-foreground">Select Criteria (max 2)</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {generalCriteria.map((criteria) => (
                          <div
                            key={criteria.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                            onClick={() => handleToggleCatchCriteria(criteria)}
                          >
                            <Checkbox 
                              checked={selectedCatchCriteria.includes(criteria.code)}
                              disabled={!selectedCatchCriteria.includes(criteria.code) && selectedCatchCriteria.length >= 2}
                            />
                            {criteria.symbol_image && (
                              <img 
                                src={criteria.symbol_image} 
                                alt={criteria.name}
                                className="h-6 w-6 object-contain"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            )}
                            <span className="text-sm text-foreground">{criteria.name}</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 border-t border-border">
                        <Button
                          size="sm"
                          className="w-full bg-primary hover:bg-primary/90"
                          onClick={handleSaveCatchSelection}
                        >
                          Save Selection
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {catchCriteria.map((item, index) => (
                <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                  <div className="w-16 flex justify-center py-4">
                    {item.symbol ? (
                      <img 
                        src={item.symbol} 
                        alt={item.name} 
                        className="h-8 w-8 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : symbols["Catch1"] ? (
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
                  {item.code && (
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
