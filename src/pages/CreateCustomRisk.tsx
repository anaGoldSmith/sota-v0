import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, CheckCircle, X, ChevronDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ApparatusType } from "@/types/apparatus";
import { useToast } from "@/hooks/use-toast";
import { NotesWithSymbols } from "@/components/routine/NotesWithSymbols";
interface CriteriaItem {
  id: string;
  name: string;
  symbol?: string;
  value: number;
  code?: string;
  note?: string;
}
interface GeneralCriteria {
  id: string;
  code: string;
  name: string;
  symbol_image: string | null;
}
interface DynamicThrow {
  id: string;
  code: string;
  name: string;
  apparatus: string;
  symbol_image: string | null;
  value: number | null;
}
interface DynamicCatch {
  id: string;
  code: string;
  name: string;
  apparatus: string;
  extra_criteria: string | null;
  notes: string | null;
  symbol_image: string | null;
  value: number | null;
}

// Map apparatus type to code
const getApparatusCode = (apparatus: ApparatusType | null): string => {
  switch (apparatus) {
    case 'hoop':
      return 'H';
    case 'ball':
      return 'B';
    case 'clubs':
      return 'CL';
    case 'ribbon':
      return 'R';
    default:
      return '';
  }
};

// Check if item is applicable for current apparatus
const isApplicableForApparatus = (item: {
  apparatus: string;
}, apparatusCode: string): boolean => {
  if (item.apparatus === 'all') return true;
  const codes = item.apparatus.split('&').map(c => c.trim());
  return codes.includes(apparatusCode);
};
const CreateCustomRisk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const [symbols, setSymbols] = useState<Record<string, string>>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedRiskData, setSavedRiskData] = useState<any>(null);

  // Get apparatus from navigation state
  const apparatus = (location.state as {
    apparatus?: ApparatusType;
  })?.apparatus;
  const apparatusCode = getApparatusCode(apparatus || null);

  // Dropdown states
  const [showThrowDropdown, setShowThrowDropdown] = useState(false);
  const [showCatchDropdown, setShowCatchDropdown] = useState(false);
  const [showThrowCriteriaDropdown, setShowThrowCriteriaDropdown] = useState(false);
  const [showCatchCriteriaDropdown, setShowCatchCriteriaDropdown] = useState(false);
  const [generalCriteria, setGeneralCriteria] = useState<GeneralCriteria[]>([]);
  const [dynamicThrows, setDynamicThrows] = useState<DynamicThrow[]>([]);
  const [dynamicCatches, setDynamicCatches] = useState<DynamicCatch[]>([]);
  const [selectedThrowCriteria, setSelectedThrowCriteria] = useState<string[]>([]);
  const [selectedCatchCriteria, setSelectedCatchCriteria] = useState<string[]>([]);
  const throwDropdownRef = useRef<HTMLDivElement>(null);
  const catchDropdownRef = useRef<HTMLDivElement>(null);
  const throwCriteriaDropdownRef = useRef<HTMLDivElement>(null);
  const catchCriteriaDropdownRef = useRef<HTMLDivElement>(null);

  // Selected throw and catch
  const [selectedThrow, setSelectedThrow] = useState<DynamicThrow | null>(null);
  const [selectedCatch, setSelectedCatch] = useState<DynamicCatch | null>(null);

  // Rotation type: 'one' | 'two' | 'series'
  type RotationType = 'one' | 'two' | 'series';

  // Risk components state
  const [throwCriteria, setThrowCriteria] = useState<CriteriaItem[]>([]);
  const [rotationType, setRotationType] = useState<RotationType | null>(null);
  const [seriesCount, setSeriesCount] = useState<number>(3);
  const [showRotationDropdown, setShowRotationDropdown] = useState(false);
  const [catchCriteria, setCatchCriteria] = useState<CriteriaItem[]>([]);
  const rotationDropdownRef = useRef<HTMLDivElement>(null);

  // Calculate rotation value based on type
  const getRotationValue = (): number => {
    if (!rotationType) return 0;
    if (rotationType === 'one') return 0.1;
    if (rotationType === 'two') return 0.2;
    // Series: base rotations (0.1 each) + 0.2 series bonus
    return seriesCount * 0.1 + 0.2;
  };

  // Calculate R level based on rotation type
  const getRLevel = (): number => {
    if (!rotationType) return 0;
    if (rotationType === 'one') return 1;
    if (rotationType === 'two') return 2;
    return seriesCount; // Series shows number of rotations
  };
  const rotationValue = getRotationValue();
  const rLevel = getRLevel();

  // Calculate total value
  const throwValue = selectedThrow?.value ?? 0;
  const catchValue = selectedCatch?.value ?? 0;
  const totalValue = throwValue + throwCriteria.reduce((sum, item) => sum + item.value, 0) + rotationValue + catchValue + catchCriteria.reduce((sum, item) => sum + item.value, 0);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (throwDropdownRef.current && !throwDropdownRef.current.contains(event.target as Node)) {
        setShowThrowDropdown(false);
      }
      if (catchDropdownRef.current && !catchDropdownRef.current.contains(event.target as Node)) {
        setShowCatchDropdown(false);
      }
      if (throwCriteriaDropdownRef.current && !throwCriteriaDropdownRef.current.contains(event.target as Node)) {
        setShowThrowCriteriaDropdown(false);
      }
      if (catchCriteriaDropdownRef.current && !catchCriteriaDropdownRef.current.contains(event.target as Node)) {
        setShowCatchCriteriaDropdown(false);
      }
      if (rotationDropdownRef.current && !rotationDropdownRef.current.contains(event.target as Node)) {
        setShowRotationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  useEffect(() => {
    const loadSymbols = async () => {
      const symbolUrls: Record<string, string> = {};
      const {
        data: rotationsData
      } = supabase.storage.from("dynamic-element-symbols").getPublicUrl("other_risks/baseRotations.png");
      symbolUrls["baseRotations"] = rotationsData.publicUrl;
      const {
        data: extraRotationData
      } = supabase.storage.from("dynamic-element-symbols").getPublicUrl("other_risks/extraRotation.PNG");
      symbolUrls["extraRotation"] = extraRotationData.publicUrl;
      setSymbols(symbolUrls);
    };
    const loadGeneralCriteria = async () => {
      const {
        data,
        error
      } = await supabase.from('dynamic_general_criteria').select('*');
      if (data && !error) {
        setGeneralCriteria(data);
      }
    };
    const loadDynamicThrows = async () => {
      const {
        data,
        error
      } = await supabase.from('dynamic_throws').select('*');
      if (data && !error) {
        setDynamicThrows(data);
      }
    };
    const loadDynamicCatches = async () => {
      // Force fresh data by adding cache-busting timestamp
      const {
        data,
        error
      } = await supabase.from('dynamic_catches').select('*').order('code');
      if (data && !error) {
        console.log('Loaded catches:', data.find(c => c.code === 'Catch4'));
        setDynamicCatches(data);
      }
    };
    loadSymbols();
    loadGeneralCriteria();
    loadDynamicThrows();
    loadDynamicCatches();
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

  // Filter throws and catches based on apparatus
  const filteredThrows = dynamicThrows.filter(t => apparatusCode ? isApplicableForApparatus(t, apparatusCode) : true);
  const filteredCatches = dynamicCatches.filter(c => apparatusCode ? isApplicableForApparatus(c, apparatusCode) : true);

  // Build symbol map for notes parsing (combines catches, general criteria, and throws)
  const notesSymbolMap = useMemo(() => {
    const map: Record<string, string | null> = {};

    // Add catch symbols
    dynamicCatches.forEach(c => {
      if (c.symbol_image) {
        map[c.code] = c.symbol_image;
      }
    });

    // Add general criteria symbols
    generalCriteria.forEach(gc => {
      if (gc.symbol_image) {
        map[gc.code] = gc.symbol_image;
      }
    });

    // Add throw symbols
    dynamicThrows.forEach(t => {
      if (t.symbol_image) {
        map[t.code] = t.symbol_image;
      }
    });
    return map;
  }, [dynamicCatches, generalCriteria, dynamicThrows]);
  const handleSelectRotationType = (type: 'one' | 'two' | 'series') => {
    setRotationType(type);
    if (type === 'series') {
      setSeriesCount(3); // Default to 3 for series
    }
    setShowRotationDropdown(false);
  };
  const handleClearRotationType = () => {
    setRotationType(null);
    setSeriesCount(3);
  };
  const handleSelectThrow = (throwItem: DynamicThrow) => {
    setSelectedThrow(throwItem);
    setShowThrowDropdown(false);

    // Auto-add Cr1V and Cr2H when Thr2 is selected
    if (throwItem.code === 'Thr2') {
      const cr1v = generalCriteria.find(gc => gc.code === 'Cr1V');
      const cr2h = generalCriteria.find(gc => gc.code === 'Cr2H');
      const newCriteria: CriteriaItem[] = [];
      if (cr1v && !selectedThrowCriteria.includes('Cr1V')) {
        newCriteria.push({
          id: `throw_${cr1v.code}`,
          name: cr1v.name,
          symbol: cr1v.symbol_image || undefined,
          value: 0.1,
          code: cr1v.code,
          note: 'Without Vision: extra criteria added to throw after rolling the hoop on the floor'
        });
      }
      if (cr2h && !selectedThrowCriteria.includes('Cr2H')) {
        newCriteria.push({
          id: `throw_${cr2h.code}`,
          name: cr2h.name,
          symbol: cr2h.symbol_image || undefined,
          value: 0.1,
          code: cr2h.code,
          note: 'Without Hands: extra criteria added to throw after rolling the hoop on the floor'
        });
      }
      if (newCriteria.length > 0) {
        setThrowCriteria(prev => [...prev.filter(c => c.code !== 'Cr1V' && c.code !== 'Cr2H'), ...newCriteria]);
      }
    }
  };
  const handleSelectCatch = (catchItem: DynamicCatch) => {
    setSelectedCatch(catchItem);
    setShowCatchDropdown(false);

    // Auto-add Cr2H when Catch3 is selected
    if (catchItem.code === 'Catch3') {
      const cr2h = generalCriteria.find(gc => gc.code === 'Cr2H');
      if (cr2h && !selectedCatchCriteria.includes('Cr2H')) {
        const newCriteria: CriteriaItem = {
          id: `catch_${cr2h.code}`,
          name: cr2h.name,
          symbol: cr2h.symbol_image || undefined,
          value: 0.1,
          code: cr2h.code,
          note: 'the criterion {Cr2H} is given for catches with rebounds on the arm(s) or other body parts'
        };
        setCatchCriteria(prev => [...prev.filter(c => c.code !== 'Cr2H'), newCriteria]);
      }
    }
  };
  const handleToggleThrowCriteria = (criteria: GeneralCriteria) => {
    const isSelected = selectedThrowCriteria.includes(criteria.code);
    if (isSelected) {
      setThrowCriteria(throwCriteria.filter(t => t.code !== criteria.code));
    } else {
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
      setCatchCriteria(catchCriteria.filter(c => c.code !== criteria.code));
    } else {
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
  const handleSaveThrowCriteriaSelection = () => {
    setShowThrowCriteriaDropdown(false);
  };
  const handleSaveCatchCriteriaSelection = () => {
    setShowCatchCriteriaDropdown(false);
  };
  const handleSave = () => {
    const riskData = {
      type: 'R' as const,
      label: `R₊`,
      rLevel: rLevel,
      value: totalValue,
      symbols: symbols,
      components: [...(selectedThrow ? [{
        name: selectedThrow.name,
        symbol: selectedThrow.symbol_image || '',
        value: selectedThrow.value ?? 0
      }] : []), ...throwCriteria.map(t => ({
        name: t.name,
        symbol: t.symbol || '',
        value: t.value
      })),
      // Add rotation component based on type
      ...(rotationType ? [{
        name: rotationType === 'one' ? 'One Rotation' : rotationType === 'two' ? '2 Base Rotations' : `Series (${seriesCount} rotations)`,
        symbol: symbols["baseRotations"] || '',
        value: rotationValue
      }] : []), ...(selectedCatch ? [{
        name: selectedCatch.name,
        symbol: selectedCatch.symbol_image || '',
        value: selectedCatch.value ?? 0
      }] : []), ...catchCriteria.map(c => ({
        name: c.name,
        symbol: c.symbol || '',
        value: c.value
      }))]
    };
    setSavedRiskData(riskData);
    setShowSuccessDialog(true);
  };
  const handleAddMoreStandardRisks = () => {
    navigate("/routine-calculator", {
      state: {
        newRisk: savedRiskData
      }
    });
    setTimeout(() => navigate("/standard-risks", {
      state: {
        apparatus
      }
    }), 100);
  };
  const handleCreateAnotherRisk = () => {
    navigate("/routine-calculator", {
      state: {
        newRisk: savedRiskData
      }
    });
    setTimeout(() => navigate("/create-custom-risk", {
      state: {
        apparatus
      }
    }), 100);
  };
  const handleGoToCalculator = () => {
    navigate("/routine-calculator", {
      state: {
        newRisk: savedRiskData
      }
    });
  };
  const handleCancel = () => {
    navigate("/dynamic-elements-risk", {
      state: {
        apparatus
      }
    });
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dynamic-elements-risk", {
          state: {
            apparatus
          }
        })} className="text-primary-foreground hover:bg-primary-foreground/20">
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
                <CardTitle className="text-lg text-primary">Throw</CardTitle>
                <div className="relative" ref={throwCriteriaDropdownRef}>
                  <Button variant="ghost" size="sm" onClick={() => {
                  if (!selectedThrow) {
                    toast({
                      title: "Selection required",
                      description: "Please select a throw type before adding extra criteria.",
                      variant: "destructive"
                    });
                    return;
                  }
                  setShowThrowCriteriaDropdown(!showThrowCriteriaDropdown);
                }} className={`text-primary hover:bg-primary/10 ${!selectedThrow ? 'opacity-50' : ''}`}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                  
                  {showThrowCriteriaDropdown && selectedThrow && <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-border">
                        <span className="font-medium text-foreground">Select Criteria (max 2)</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {generalCriteria.map(criteria => <div key={criteria.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer" onClick={() => handleToggleThrowCriteria(criteria)}>
                            <Checkbox checked={selectedThrowCriteria.includes(criteria.code)} disabled={!selectedThrowCriteria.includes(criteria.code) && selectedThrowCriteria.length >= 2} />
                            {criteria.symbol_image && <img src={criteria.symbol_image} alt={criteria.name} className="h-6 w-6 object-contain" onError={e => e.currentTarget.style.display = 'none'} />}
                            <span className="text-sm text-foreground">{criteria.name}</span>
                          </div>)}
                      </div>
                      <div className="p-2 border-t border-border">
                        <Button size="sm" className="w-full bg-primary hover:bg-primary/90" onClick={handleSaveThrowCriteriaSelection}>
                          Save Selection
                        </Button>
                      </div>
                    </div>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedThrow ? <div className="p-4" ref={throwDropdownRef}>
                  <Button variant="outline" className="w-full justify-between border-dashed border-2 border-primary/30 hover:border-primary/50 h-14" onClick={() => setShowThrowDropdown(!showThrowDropdown)}>
                    <span className="text-muted-foreground">Select Throw</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  
                  {showThrowDropdown && <div className="mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {filteredThrows.length === 0 ? <div className="p-4 text-center text-muted-foreground">
                          No throws available for this apparatus
                        </div> : filteredThrows.map(throwItem => {
                  const symbolUrl = throwItem.symbol_image || supabase.storage.from('dynamic-element-symbols').getPublicUrl(`dynamic_throws/${throwItem.code}.png`).data.publicUrl;
                  return <div key={throwItem.id} className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0" onClick={() => handleSelectThrow(throwItem)}>
                              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                                <img src={symbolUrl} alt={throwItem.code} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-foreground text-sm">
                                  <NotesWithSymbols notes={throwItem.name} symbolMap={notesSymbolMap} />
                                </span>
                              </div>
                              <div className="w-12 text-right flex-shrink-0">
                                <span className="text-primary font-semibold">{throwItem.value ?? 0}</span>
                              </div>
                            </div>;
                })}
                    </div>}
                </div> : <>
                  {/* Selected Throw Row */}
                  <div className="flex items-center border-b border-border">
                    <div className="w-16 flex justify-center py-4">
                      {selectedThrow.symbol_image ? <img src={selectedThrow.symbol_image} alt={selectedThrow.name} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} /> : <div className="h-8 w-8 bg-muted rounded" />}
                    </div>
                    <div className="flex-1 py-4 px-4">
                      <span className="font-medium text-foreground">
                        <NotesWithSymbols notes={selectedThrow.name} symbolMap={notesSymbolMap} />
                      </span>
                    </div>
                    <div className="w-20 py-4 px-2 text-center border-l border-border">
                      <p className="font-semibold text-foreground">{selectedThrow.value ?? 0}</p>
                    </div>
                    <div className="w-10 flex justify-center">
                      <Button variant="ghost" size="icon" onClick={() => {
                    setSelectedThrow(null);
                    setThrowCriteria([]);
                  }} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Extra Throw Criteria */}
                  {throwCriteria.map(item => <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                      <div className="w-16 flex justify-center py-4">
                        {item.symbol ? <img src={item.symbol} alt={item.name} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} /> : <div className="h-8 w-8 bg-muted rounded" />}
                      </div>
                      <div className="flex-1 py-4 px-4">
                        <span className="font-medium text-foreground">
                          {item.note ? <NotesWithSymbols notes={item.note} symbolMap={notesSymbolMap} /> : item.name}
                        </span>
                      </div>
                      <div className="w-20 py-4 px-2 text-center border-l border-border">
                        <p className="font-semibold text-foreground">{item.value}</p>
                      </div>
                      <div className="w-10 flex justify-center">
                        <Button variant="ghost" size="icon" onClick={() => setThrowCriteria(throwCriteria.filter(t => t.id !== item.id))} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>)}
                </>}
            </CardContent>
          </Card>

          {/* Rotations Section */}
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="pb-2 bg-secondary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-primary">Rotations</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!rotationType ? <div className="relative p-4" ref={rotationDropdownRef}>
                  <Button variant="outline" onClick={() => setShowRotationDropdown(!showRotationDropdown)} className="w-full justify-between border-primary/30 text-foreground hover:bg-primary/5">
                    <span>Select Rotation Type</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showRotationDropdown ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {showRotationDropdown && <div className="absolute left-4 right-4 top-full mt-1 bg-background border border-border rounded-lg shadow-lg z-50">
                      <div className="p-2 space-y-1">
                        <div className="flex items-center gap-3 p-3 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectRotationType('one')}>
                          <div className="w-8 h-8 flex items-center justify-center">
                            {symbols["extraRotation"] ? <img src={symbols["extraRotation"]} alt="Extra Rotation" className="h-6 w-6 object-contain" /> : <div className="h-6 w-6 bg-muted rounded" />}
                          </div>
                          <span className="flex-1 font-medium text-foreground">One Rotation</span>
                          <span className="text-primary font-semibold">0.1</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectRotationType('two')}>
                          <div className="w-8 h-8 flex items-center justify-center">
                            {symbols["baseRotations"] ? <img src={symbols["baseRotations"]} alt="Base Rotations" className="h-6 w-6 object-contain" /> : <div className="h-6 w-6 bg-muted rounded" />}
                          </div>
                          <span className="flex-1 font-medium text-foreground">2 Base Rotations</span>
                          <span className="text-primary font-semibold">0.2</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded hover:bg-muted cursor-pointer" onClick={() => handleSelectRotationType('series')}>
                          <div className="w-8 h-8 flex items-center justify-center">
                            <span className="text-lg font-bold text-foreground">S</span>
                          </div>
                          <span className="flex-1 font-medium text-foreground">Series (0.2 for a series + at least 0.3 for 3 selected pre-acrobatic elements)</span>
                          <span className="text-primary font-semibold">0.5</span>
                        </div>
                      </div>
                    </div>}
                </div> : <div className="space-y-0">
                  <div className="flex items-center border-b border-border">
                    <div className="w-16 flex justify-center py-4">
                      {rotationType === 'series' ? <span className="text-2xl font-bold text-foreground">S</span> : symbols["baseRotations"] ? <img src={symbols["baseRotations"]} alt="Rotation" className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} /> : <div className="h-8 w-8 bg-muted rounded" />}
                    </div>
                    <div className="flex-1 py-4 px-4">
                      <span className="font-medium text-foreground">
                        {rotationType === 'one' && 'One Rotation'}
                        {rotationType === 'two' && '2 Base Rotations'}
                        {rotationType === 'series' && <div className="flex items-center gap-3">
                            <span>Series</span>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setSeriesCount(Math.max(3, seriesCount - 1))} disabled={seriesCount <= 3}>
                                -
                              </Button>
                              <span className="w-6 text-center font-semibold">{seriesCount}</span>
                              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setSeriesCount(seriesCount + 1)}>
                                +
                              </Button>
                              <span className="text-sm text-muted-foreground">rotations</span>
                            </div>
                          </div>}
                      </span>
                    </div>
                    <div className="w-20 py-4 px-2 text-center border-l border-border">
                      <p className="font-semibold text-primary">{rotationValue.toFixed(1)}</p>
                    </div>
                    <div className="w-10 flex justify-center">
                      <Button variant="ghost" size="icon" onClick={handleClearRotationType} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>}
            </CardContent>
          </Card>

          {/* Catch Section */}
          <Card className="border-primary/20 shadow-md">
            <CardHeader className="pb-2 bg-secondary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-primary">Catch</CardTitle>
                <div className="relative" ref={catchCriteriaDropdownRef}>
                  <Button variant="ghost" size="sm" onClick={() => {
                  if (!selectedCatch) {
                    toast({
                      title: "Selection required",
                      description: "Please select a catch type before adding extra criteria.",
                      variant: "destructive"
                    });
                    return;
                  }
                  setShowCatchCriteriaDropdown(!showCatchCriteriaDropdown);
                }} className={`text-primary hover:bg-primary/10 ${!selectedCatch ? 'opacity-50' : ''}`}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Criteria
                  </Button>
                  
                  {showCatchCriteriaDropdown && selectedCatch && <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50">
                      <div className="p-3 border-b border-border">
                        <span className="font-medium text-foreground">Select Criteria (max 2)</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {generalCriteria.map(criteria => <div key={criteria.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer" onClick={() => handleToggleCatchCriteria(criteria)}>
                            <Checkbox checked={selectedCatchCriteria.includes(criteria.code)} disabled={!selectedCatchCriteria.includes(criteria.code) && selectedCatchCriteria.length >= 2} />
                            {criteria.symbol_image && <img src={criteria.symbol_image} alt={criteria.name} className="h-6 w-6 object-contain" onError={e => e.currentTarget.style.display = 'none'} />}
                            <span className="text-sm text-foreground">{criteria.name}</span>
                          </div>)}
                      </div>
                      <div className="p-2 border-t border-border">
                        <Button size="sm" className="w-full bg-primary hover:bg-primary/90" onClick={handleSaveCatchCriteriaSelection}>
                          Save Selection
                        </Button>
                      </div>
                    </div>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedCatch ? <div className="p-4" ref={catchDropdownRef}>
                  <Button variant="outline" className="w-full justify-between border-dashed border-2 border-primary/30 hover:border-primary/50 h-14" onClick={() => setShowCatchDropdown(!showCatchDropdown)}>
                    <span className="text-muted-foreground">Select Catch</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  
                  {showCatchDropdown && <div className="mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                      {filteredCatches.length === 0 ? <div className="p-4 text-center text-muted-foreground">
                          No catches available for this apparatus
                        </div> : filteredCatches.map(catchItem => {
                  const symbolUrl = catchItem.symbol_image || supabase.storage.from('dynamic-element-symbols').getPublicUrl(`dynamic_catches/${catchItem.code}.png`).data.publicUrl;
                  return <div key={catchItem.id} className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0" onClick={() => handleSelectCatch(catchItem)}>
                              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                                <img src={symbolUrl} alt={catchItem.code} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} />
                              </div>
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-foreground text-sm">{catchItem.name}</span>
                                {catchItem.notes && <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-sm">
                                        <NotesWithSymbols notes={catchItem.notes} symbolMap={notesSymbolMap} />
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>}
                              </div>
                              <div className="w-12 text-right flex-shrink-0">
                                <span className="text-primary font-semibold">{catchItem.value ?? 0}</span>
                              </div>
                            </div>;
                })}
                    </div>}
                </div> : <>
                  {/* Selected Catch Row */}
                  <div className="flex items-center border-b border-border">
                    <div className="w-16 flex justify-center py-4">
                      {selectedCatch.symbol_image ? <img src={selectedCatch.symbol_image} alt={selectedCatch.name} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} /> : <div className="h-8 w-8 bg-muted rounded" />}
                    </div>
                    <div className="flex-1 py-4 px-4 flex items-center gap-2">
                      <span className="font-medium text-foreground">{selectedCatch.name}</span>
                      {selectedCatch.notes && <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <NotesWithSymbols notes={selectedCatch.notes} symbolMap={notesSymbolMap} />
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>}
                    </div>
                    <div className="w-20 py-4 px-2 text-center border-l border-border">
                      <p className="font-semibold text-foreground">{selectedCatch.value ?? 0}</p>
                    </div>
                    <div className="w-10 flex justify-center">
                      <Button variant="ghost" size="icon" onClick={() => {
                    setSelectedCatch(null);
                    setCatchCriteria([]);
                  }} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Extra Catch Criteria */}
                  {catchCriteria.map(item => <div key={item.id} className="flex items-center border-b border-border last:border-b-0">
                      <div className="w-16 flex justify-center py-4">
                        {item.symbol ? <img src={item.symbol} alt={item.name} className="h-8 w-8 object-contain" onError={e => e.currentTarget.style.display = 'none'} /> : <div className="h-8 w-8 bg-muted rounded" />}
                      </div>
                      <div className="flex-1 py-4 px-4">
                        <span className="font-medium text-foreground">
                          {item.name}{item.note && ': '}
                          {item.note && <NotesWithSymbols notes={item.note} symbolMap={notesSymbolMap} />}
                        </span>
                      </div>
                      <div className="w-20 py-4 px-2 text-center border-l border-border">
                        <p className="font-semibold text-foreground">{item.value}</p>
                      </div>
                      <div className="w-10 flex justify-center">
                        <Button variant="ghost" size="icon" onClick={() => setCatchCriteria(catchCriteria.filter(c => c.id !== item.id))} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>)}
                </>}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4">
            <Button className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave}>
              Save
            </Button>
            <Button variant="outline" className="px-8 border-muted-foreground" onClick={handleCancel}>
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
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleAddMoreStandardRisks}>
              Add More Standard Risks
            </Button>
            <Button variant="outline" className="w-full border-secondary text-secondary hover:bg-secondary/10" onClick={handleCreateAnotherRisk}>
              Create Another Custom Risk
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGoToCalculator}>
              Go to Routine Calculator
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default CreateCustomRisk;