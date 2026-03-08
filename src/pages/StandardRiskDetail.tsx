import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle, Plus, X, ChevronDown, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ApparatusType } from "@/types/apparatus";
import { NotesWithSymbols } from "@/components/routine/NotesWithSymbols";
import threeRotationsSymbol from "@/assets/3rotations-symbol.png";

interface RiskComponent {
  id: string;
  risk_code: string;
  risk_component_code: string;
  description: string | null;
  symbol_image: string | null;
  symbol_text?: string;
  value: number | null;
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
const isApplicableForApparatus = (item: { apparatus: string }, apparatusCode: string): boolean => {
  if (item.apparatus === 'all') return true;
  const codes = item.apparatus.split('&').map(c => c.trim());
  return codes.includes(apparatusCode);
};

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
  modifyingElementId?: string;
  existingRiskData?: {
    components: Array<{ name: string; symbol: string; value: number; section?: string }>;
    throwSymbols?: string[];
    catchSymbols?: string[];
  };
}

interface ExtraCriteria {
  id: string;
  code: string;
  name: string;
  symbol_image: string | null;
  value: number;
  notes?: string | null;
}

interface GeneralCriteria {
  id: string;
  code: string;
  name: string;
  symbol_image: string | null;
}

const StandardRiskDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [components, setComponents] = useState<RiskComponent[]>([]);
  
  // Extra criteria state
  const [dynamicThrows, setDynamicThrows] = useState<DynamicThrow[]>([]);
  const [dynamicCatches, setDynamicCatches] = useState<DynamicCatch[]>([]);
  const [generalCriteria, setGeneralCriteria] = useState<GeneralCriteria[]>([]);
  const [extraThrowCriteria, setExtraThrowCriteria] = useState<ExtraCriteria[]>([]);
  const [extraCatchCriteria, setExtraCatchCriteria] = useState<ExtraCriteria[]>([]);
  const [generalThrowCriteria, setGeneralThrowCriteria] = useState<ExtraCriteria[]>([]);
  const [generalCatchCriteria, setGeneralCatchCriteria] = useState<ExtraCriteria[]>([]);
  const [showThrowDropdown, setShowThrowDropdown] = useState(false);
  const [showCatchDropdown, setShowCatchDropdown] = useState(false);
  const [showThrowCriteriaDropdown, setShowThrowCriteriaDropdown] = useState(false);
  const [showCatchCriteriaDropdown, setShowCatchCriteriaDropdown] = useState(false);
  const throwDropdownRef = useRef<HTMLDivElement>(null);
  const catchDropdownRef = useRef<HTMLDivElement>(null);
  const throwCriteriaDropdownRef = useRef<HTMLDivElement>(null);
  const catchCriteriaDropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedRiskData, setSavedRiskData] = useState<any>(null);

  const state = location.state as LocationState;
  const apparatus = state?.apparatus;
  const selectedRisk = state?.selectedRisk;
  const modifyingElementId = state?.modifyingElementId;
  const existingRiskData = state?.existingRiskData;
  const apparatusCode = getApparatusCode(apparatus || null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    const loadDynamicThrows = async () => {
      const { data, error } = await supabase
        .from('dynamic_throws')
        .select('*')
        .eq('code', 'Thr3'); // Only Thr3 for throws
      if (data && !error) {
        setDynamicThrows(data);
      }
    };

    const loadDynamicCatches = async () => {
      const { data, error } = await supabase
        .from('dynamic_catches')
        .select('*')
        .not('code', 'in', '(Catch1,Catch7,Catch8)') // Exclude Catch1, Catch7, Catch8
        .order('code');
      if (data && !error) {
        setDynamicCatches(data);
      }
    };

    const loadGeneralCriteria = async () => {
      const { data, error } = await supabase
        .from('dynamic_general_criteria')
        .select('*');
      if (data && !error) {
        setGeneralCriteria(data);
      }
    };

    fetchComponents();
    loadDynamicThrows();
    loadDynamicCatches();
    loadGeneralCriteria();
  }, [selectedRisk, apparatus, navigate]);

  // Pre-populate extra criteria when modifying an existing risk
  useEffect(() => {
    if (!existingRiskData || !existingRiskData.components || dynamicThrows.length === 0 || dynamicCatches.length === 0 || generalCriteria.length === 0) {
      return;
    }

    const components = existingRiskData.components as Array<{ name: string; symbol: string | null; value: number; section?: string }>;
    
    // Get names from database for matching
    const throwNames = dynamicThrows.map(t => t.name);
    const catchNames = dynamicCatches.map(c => c.name);
    const generalCriteriaNames = generalCriteria.map(gc => gc.name);

    const newExtraThrowCriteria: ExtraCriteria[] = [];
    const newExtraCatchCriteria: ExtraCriteria[] = [];
    const newGeneralThrowCriteria: ExtraCriteria[] = [];
    const newGeneralCatchCriteria: ExtraCriteria[] = [];

    components.forEach((comp) => {
      // Skip base components (those from prerecorded_risk_components) - they will be loaded from DB
      // Only process user-added criteria
      
      // Check if it's a specific throw (from dynamic_throws)
      if (comp.section === 'throw' && throwNames.includes(comp.name)) {
        const throwItem = dynamicThrows.find(t => t.name === comp.name);
        if (throwItem) {
          newExtraThrowCriteria.push({
            id: `extra_throw_${throwItem.code}_${Date.now()}`,
            code: throwItem.code,
            name: throwItem.name,
            symbol_image: throwItem.symbol_image,
            value: comp.value,
          });
        }
        return;
      }

      // Check if it's a general criteria in throw section
      if (comp.section === 'throw' && generalCriteriaNames.includes(comp.name)) {
        const criteria = generalCriteria.find(gc => gc.name === comp.name);
        if (criteria) {
          newGeneralThrowCriteria.push({
            id: `general_throw_${criteria.code}_${Date.now()}`,
            code: criteria.code,
            name: criteria.name,
            symbol_image: criteria.symbol_image,
            value: comp.value,
          });
        }
        return;
      }

      // Check if it's a specific catch (from dynamic_catches)
      if (comp.section === 'catch' && catchNames.includes(comp.name)) {
        const catchItem = dynamicCatches.find(c => c.name === comp.name);
        if (catchItem) {
          newExtraCatchCriteria.push({
            id: `extra_catch_${catchItem.code}_${Date.now()}`,
            code: catchItem.code,
            name: catchItem.name,
            symbol_image: catchItem.symbol_image,
            value: comp.value,
            notes: catchItem.notes,
          });
        }
        return;
      }

      // Check if it's a general criteria in catch section
      if (comp.section === 'catch' && generalCriteriaNames.includes(comp.name)) {
        const criteria = generalCriteria.find(gc => gc.name === comp.name);
        if (criteria) {
          newGeneralCatchCriteria.push({
            id: `general_catch_${criteria.code}_${Date.now()}`,
            code: criteria.code,
            name: criteria.name,
            symbol_image: criteria.symbol_image,
            value: comp.value,
          });
        }
        return;
      }
    });

    // Set all the parsed criteria
    if (newExtraThrowCriteria.length > 0) {
      setExtraThrowCriteria(newExtraThrowCriteria);
    }
    if (newExtraCatchCriteria.length > 0) {
      setExtraCatchCriteria(newExtraCatchCriteria);
    }
    if (newGeneralThrowCriteria.length > 0) {
      setGeneralThrowCriteria(newGeneralThrowCriteria);
    }
    if (newGeneralCatchCriteria.length > 0) {
      setGeneralCatchCriteria(newGeneralCatchCriteria);
    }
  }, [existingRiskData, dynamicThrows, dynamicCatches, generalCriteria]);

  // Filter throws and catches based on apparatus
  const filteredThrows = dynamicThrows.filter(t => apparatusCode ? isApplicableForApparatus(t, apparatusCode) : true);
  const filteredCatches = dynamicCatches.filter(c => apparatusCode ? isApplicableForApparatus(c, apparatusCode) : true);

  // Handler to add extra throw criteria
  const handleAddThrowCriteria = (throwItem: DynamicThrow) => {
    // Check if already added
    if (extraThrowCriteria.some(c => c.code === throwItem.code)) return;
    
    const newCriteria: ExtraCriteria = {
      id: `extra_throw_${throwItem.code}_${Date.now()}`,
      code: throwItem.code,
      name: throwItem.name,
      symbol_image: throwItem.symbol_image,
      value: throwItem.value ?? 0.1,
    };
    setExtraThrowCriteria(prev => [...prev, newCriteria]);
    setShowThrowDropdown(false);
  };

  // Handler to add extra catch criteria
  const handleAddCatchCriteria = (catchItem: DynamicCatch) => {
    // Check if already added
    if (extraCatchCriteria.some(c => c.code === catchItem.code)) return;
    
    const newCriteria: ExtraCriteria = {
      id: `extra_catch_${catchItem.code}_${Date.now()}`,
      code: catchItem.code,
      name: catchItem.name,
      symbol_image: catchItem.symbol_image,
      value: catchItem.value ?? 0.1,
      notes: catchItem.notes,
    };
    setExtraCatchCriteria(prev => [...prev, newCriteria]);
    setShowCatchDropdown(false);
  };

  // Handler to remove extra throw criteria
  const handleRemoveThrowCriteria = (id: string) => {
    setExtraThrowCriteria(prev => prev.filter(c => c.id !== id));
  };

  // Handler to remove extra catch criteria
  const handleRemoveCatchCriteria = (id: string) => {
    setExtraCatchCriteria(prev => prev.filter(c => c.id !== id));
  };

  // Handler to toggle general throw criteria
  const handleToggleGeneralThrowCriteria = (criteria: GeneralCriteria) => {
    const isSelected = generalThrowCriteria.some(c => c.code === criteria.code);
    if (isSelected) {
      setGeneralThrowCriteria(prev => prev.filter(c => c.code !== criteria.code));
    } else {
      if (generalThrowCriteria.length < 2) {
        const newCriteria: ExtraCriteria = {
          id: `general_throw_${criteria.code}_${Date.now()}`,
          code: criteria.code,
          name: criteria.name,
          symbol_image: criteria.symbol_image,
          value: 0.1,
        };
        setGeneralThrowCriteria(prev => [...prev, newCriteria]);
      }
    }
  };

  // Handler to toggle general catch criteria
  const handleToggleGeneralCatchCriteria = (criteria: GeneralCriteria) => {
    const isSelected = generalCatchCriteria.some(c => c.code === criteria.code);
    if (isSelected) {
      setGeneralCatchCriteria(prev => prev.filter(c => c.code !== criteria.code));
    } else {
      if (generalCatchCriteria.length < 2) {
        const newCriteria: ExtraCriteria = {
          id: `general_catch_${criteria.code}_${Date.now()}`,
          code: criteria.code,
          name: criteria.name,
          symbol_image: criteria.symbol_image,
          value: 0.1,
        };
        setGeneralCatchCriteria(prev => [...prev, newCriteria]);
      }
    }
  };

  // Handler to remove general throw criteria
  const handleRemoveGeneralThrowCriteria = (id: string) => {
    setGeneralThrowCriteria(prev => prev.filter(c => c.id !== id));
  };

  // Handler to remove general catch criteria
  const handleRemoveGeneralCatchCriteria = (id: string) => {
    setGeneralCatchCriteria(prev => prev.filter(c => c.id !== id));
  };

  // Categorize components by prefix (case-insensitive, support both formats: thr_, Thr, etc.)
  const throwComponents = components.filter(c => 
    c.risk_component_code.toLowerCase().startsWith('thr') && 
    !c.risk_component_code.toLowerCase().includes('base') &&
    !c.risk_component_code.toLowerCase().includes('rotation')
  );
  const rotationComponents = components.filter(c => 
    c.risk_component_code.toLowerCase().startsWith('utf') || 
    c.risk_component_code.toLowerCase().includes('rotation') ||
    c.risk_component_code.toLowerCase().includes('base')
  );
  const catchComponents = components.filter(c => 
    c.risk_component_code.toLowerCase().startsWith('catch')
  );

  // Calculate totals including extra criteria
  const baseThrowTotal = throwComponents.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const extraThrowTotal = extraThrowCriteria.reduce((sum, c) => sum + c.value, 0);
  const generalThrowTotal = generalThrowCriteria.reduce((sum, c) => sum + c.value, 0);
  const throwTotal = baseThrowTotal + extraThrowTotal + generalThrowTotal;
  
  const baseRotationTotal = rotationComponents.reduce((sum, c) => sum + (c.value ?? 0), 0);
  
  const baseCatchTotal = catchComponents.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const extraCatchTotal = extraCatchCriteria.reduce((sum, c) => sum + c.value, 0);
  const generalCatchTotal = generalCatchCriteria.reduce((sum, c) => sum + c.value, 0);
  const catchTotal = baseCatchTotal + extraCatchTotal + generalCatchTotal;
  
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
      symbol_image: threeRotationsSymbol,
      value: 0.3,
    },
  ];

  // Combined rotation components including additional rows
  const allRotationComponents = [...rotationComponents, ...additionalRotationRows];
  const rotationTotal = allRotationComponents.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const totalValue = throwTotal + rotationTotal + catchTotal;

  const handleSave = () => {
    if (!selectedRisk) return;

    // For R2: Only extra criteria symbols (no base throw/catch symbols)
    // For others: All throw criteria + specific throw symbols (but not base Thr1)
    let throwSymbols: string[] = [];
    let catchSymbols: string[] = [];

    if (isR2) {
      // R2: Only extra throw/catch criteria symbols (user-added criteria)
      throwSymbols = [
        ...extraThrowCriteria.filter(c => c.symbol_image).map(c => c.symbol_image!),
        ...generalThrowCriteria.filter(c => c.symbol_image).map(c => c.symbol_image!),
      ];
      catchSymbols = [
        ...extraCatchCriteria.filter(c => c.symbol_image).map(c => c.symbol_image!),
        ...generalCatchCriteria.filter(c => c.symbol_image).map(c => c.symbol_image!),
      ];
    } else {
      // Non-R2: Include specific throw/catch criteria symbols (not base symbols from prerecorded components)
      throwSymbols = [
        ...extraThrowCriteria.filter(c => c.symbol_image).map(c => c.symbol_image!),
        ...generalThrowCriteria.filter(c => c.symbol_image).map(c => c.symbol_image!),
      ];
      catchSymbols = [
        ...extraCatchCriteria.filter(c => c.symbol_image).map(c => c.symbol_image!),
        ...generalCatchCriteria.filter(c => c.symbol_image).map(c => c.symbol_image!),
      ];
    }

    // Check for axis/level change in rotation components
    const hasAxisChange = rotationComponents.some(c => c.risk_component_code.includes('axis') || c.risk_component_code.includes('level'));
    const axisLevelSymbol = hasAxisChange ? rotationComponents.find(c => c.risk_component_code.includes('axis') || c.risk_component_code.includes('level'))?.symbol_image : undefined;

    // Calculate rLevel (2 for R2, 3 for others)
    const rLevel = isR2 ? 2 : 3;

    // Include series symbol for non-R2 risks (displayed as 'S' text)
    const hasSeries = !isR2;
    
    // Include DB indicator for non-R2 risks (to remind user that risk contains jumps/DB elements)
    const hasDB = !isR2;

    // Calculate DB count and value for non-R2 risks
    // Standard risks (except R2) have 3 DBs (jumps): during throw, under flight, and during catch
    const dbCount = isR2 ? 0 : 3;
    
    // Calculate dbValue as sum of thr_, utf_, catch_ component values (base jump values)
    const dbValue = isR2 ? 0 : [...throwComponents, ...rotationComponents, ...catchComponents].reduce((sum, c) => {
      const code = c.risk_component_code.toLowerCase();
      // Include components that represent the jumps (thr_, utf_, catch_ prefixes)
      if (code.startsWith('thr_') || code.startsWith('utf_') || code.startsWith('catch_')) {
        return sum + (c.value ?? 0);
      }
      return sum;
    }, 0);

    const riskData = {
      type: 'R' as const,
      label: `R₊`,
      rLevel: rLevel,
      value: totalValue,
      symbols: {
        main: selectedRisk.symbol_image,
      },
      throwSymbols: throwSymbols,
      catchSymbols: catchSymbols,
      axisLevelSymbol: axisLevelSymbol || undefined,
      hasSeries: hasSeries,
      hasDB: hasDB,
      isR2: isR2,
      isCustomRisk: false,
      apparatus: apparatus,
      dbCount: dbCount,
      dbValue: dbValue,
      components: [
        ...throwComponents.map(c => ({
          name: c.description || 'Throw',
          symbol: c.symbol_image,
          value: c.value ?? 0,
          section: 'throw'
        })),
        ...extraThrowCriteria.map(c => ({
          name: c.name,
          symbol: c.symbol_image,
          value: c.value,
          section: 'throw'
        })),
        ...generalThrowCriteria.map(c => ({
          name: c.name,
          symbol: c.symbol_image,
          value: c.value,
          section: 'throw'
        })),
        ...rotationComponents.map(c => ({
          name: c.description || 'Under the Flight',
          symbol: c.symbol_image,
          value: c.value ?? 0,
          section: 'rotation'
        })),
        ...additionalRotationRows.map(c => ({
          name: c.description || 'Rotation Bonus',
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
        ...extraCatchCriteria.map(c => ({
          name: c.name,
          symbol: c.symbol_image,
          value: c.value,
          section: 'catch'
        })),
        ...generalCatchCriteria.map(c => ({
          name: c.name,
          symbol: c.symbol_image,
          value: c.value,
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
    navigate("/routine-calculator", { 
      state: { 
        newRisk: savedRiskData, 
        modifyingElementId: modifyingElementId 
      } 
    });
    setTimeout(() => navigate("/dynamic-elements-risk", { state: { apparatus } }), 100);
  };

  const handleCreateOwnRisk = () => {
    navigate("/routine-calculator", { 
      state: { 
        newRisk: savedRiskData, 
        modifyingElementId: modifyingElementId 
      } 
    });
    setTimeout(() => navigate("/create-custom-risk", { state: { apparatus } }), 100);
  };

  const handleGoToCalculator = () => {
    navigate("/routine-calculator", { 
      state: { 
        newRisk: savedRiskData, 
        modifyingElementId: modifyingElementId 
      } 
    });
  };

  const handleCancel = () => {
    navigate("/dynamic-elements-risk", { state: { apparatus } });
  };

  const renderComponentRow = (component: RiskComponent, isLast: boolean = false) => (
    <div 
      key={component.id} 
      className={`flex items-center ${!isLast ? 'border-b border-border' : ''}`}
    >
      <div className="w-8 py-4" />
      <div className="w-12 flex justify-center py-4">
        {component.symbol_image ? (
          <img 
            src={component.symbol_image} 
            alt={component.description || 'Symbol'} 
            className="h-8 w-auto max-w-[40px] object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : component.symbol_text === 'S' ? (
          <span className="text-2xl font-bold text-foreground">S</span>
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
            <div className="w-8 py-2" />
            <div className="w-12 py-2" />
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
              {/* S symbol for Series - shown for all risks except R2 */}
              {!isR2 && (
                <span className="text-2xl font-bold text-foreground">S</span>
              )}
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
              <div className="mb-6">
                {/* Section Header */}
                <div className="flex items-center border-b-2 border-primary/30 bg-primary/5 rounded-t-lg">
                  <div className="flex-1 py-3 px-4 flex items-center justify-between">
                    <span className="text-base font-semibold text-primary">Throw</span>
                    <div className="relative" ref={throwCriteriaDropdownRef}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowThrowCriteriaDropdown(!showThrowCriteriaDropdown)}
                        className="text-primary hover:bg-primary/10"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Criteria
                      </Button>
                      
                      {showThrowCriteriaDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50">
                          <div className="p-3 border-b border-border">
                            <span className="font-medium text-foreground">Select Criteria (max 2)</span>
                          </div>
                          <div className="p-2 space-y-1">
                            {generalCriteria.map(criteria => (
                              <div
                                key={criteria.id}
                                className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                                onClick={() => handleToggleGeneralThrowCriteria(criteria)}
                              >
                                <Checkbox
                                  checked={generalThrowCriteria.some(c => c.code === criteria.code)}
                                  disabled={!generalThrowCriteria.some(c => c.code === criteria.code) && generalThrowCriteria.length >= 2}
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
                              onClick={() => setShowThrowCriteriaDropdown(false)}
                            >
                              Save Selection
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-20 py-3 px-2 text-center border-l border-primary/30">
                    <span className="text-sm font-semibold text-muted-foreground">Value</span>
                  </div>
                </div>
                
                {/* Section Components */}
                <div className="border-x border-b border-border rounded-b-lg bg-background">
                  {throwComponents.length > 0 ? (
                    throwComponents.map((component, index) => 
                      renderComponentRow(component, index === throwComponents.length - 1 && extraThrowCriteria.length === 0 && generalThrowCriteria.length === 0)
                    )
                  ) : (
                    <div className="flex items-center py-4 px-4 text-muted-foreground text-sm">
                      No throw components
                    </div>
                  )}
                  
                  {/* General Throw Criteria */}
                  {generalThrowCriteria.map((criteria, index) => (
                    <div 
                      key={criteria.id} 
                      className="flex items-center border-b border-border"
                    >
                      <div className="w-8 py-4" />
                      <div className="w-12 flex justify-center py-4">
                        {criteria.symbol_image ? (
                          <img 
                            src={criteria.symbol_image} 
                            alt={criteria.name} 
                            className="h-8 w-auto max-w-[40px] object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <div className="flex-1 py-4 px-4">
                        <span className="font-medium text-foreground text-sm">{criteria.name}</span>
                      </div>
                      <div className="w-20 py-4 px-2 text-center border-l border-border relative">
                        <p className="font-semibold text-primary">{criteria.value}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveGeneralThrowCriteria(criteria.id)}
                          className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Extra Throw Criteria (Specific Throws) */}
                  {extraThrowCriteria.map((criteria, index) => (
                    <div 
                      key={criteria.id} 
                      className={`flex items-center ${index !== extraThrowCriteria.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <div className="w-8 py-4" />
                      <div className="w-12 flex justify-center py-4">
                        {criteria.symbol_image ? (
                          <img 
                            src={criteria.symbol_image} 
                            alt={criteria.name} 
                            className="h-8 w-auto max-w-[40px] object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <div className="flex-1 py-4 px-4">
                        <span className="font-medium text-foreground text-sm">
                          <NotesWithSymbols notes={criteria.name} symbolMap={{}} />
                        </span>
                      </div>
                      <div className="w-20 py-4 px-2 text-center border-l border-border relative">
                        <p className="font-semibold text-primary">{criteria.value}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveThrowCriteria(criteria.id)}
                          className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add Specific Throw Button - hidden for R2 and when one is already selected */}
                  {filteredThrows.length > 0 && !isR2 && extraThrowCriteria.length === 0 && (
                    <div ref={throwDropdownRef} className="relative p-3">
                      <Button
                        variant="outline"
                        className="w-full py-3 text-primary border-primary/30 hover:bg-primary/5 flex items-center justify-center gap-2 rounded-lg"
                        onClick={() => setShowThrowDropdown(!showThrowDropdown)}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Extra Throw</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showThrowDropdown ? 'rotate-180' : ''}`} />
                      </Button>
                      
                      {showThrowDropdown && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-b-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredThrows
                            .filter(t => !extraThrowCriteria.some(c => c.code === t.code))
                            .map(throwItem => (
                              <div
                                key={throwItem.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                                onClick={() => handleAddThrowCriteria(throwItem)}
                              >
                                <div className="w-8 h-8 flex-shrink-0">
                                  {throwItem.symbol_image ? (
                                    <img 
                                      src={throwItem.symbol_image} 
                                      alt={throwItem.name} 
                                      className="h-8 w-8 object-contain"
                                    />
                                  ) : (
                                    <div className="h-8 w-8 bg-muted rounded" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-foreground">
                                    <NotesWithSymbols notes={throwItem.name} symbolMap={{}} />
                                  </p>
                                </div>
                                <div className="text-sm text-primary font-semibold">
                                  {throwItem.value ?? 0.1}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Section Total */}
                  {(throwComponents.length > 0 || extraThrowCriteria.length > 0 || generalThrowCriteria.length > 0) && (
                    <div className="flex items-center border-t border-border bg-muted/30">
                      <div className="w-8 py-2" />
                      <div className="w-12 py-2" />
                      <div className="flex-1 py-2 px-4">
                        <span className="font-medium text-muted-foreground text-sm">Section Total</span>
                      </div>
                      <div className="w-20 py-2 px-2 text-center border-l border-border">
                        <p className="font-bold text-primary">{throwTotal.toFixed(1)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rotations Section */}
              {renderSection('Rotations', allRotationComponents, rotationTotal)}

              {/* Catch Section */}
              <div className="mb-6">
                {/* Section Header */}
                <div className="flex items-center border-b-2 border-primary/30 bg-primary/5 rounded-t-lg">
                  <div className="flex-1 py-3 px-4 flex items-center justify-between">
                    <span className="text-base font-semibold text-primary">Catch</span>
                    <div className="relative" ref={catchCriteriaDropdownRef}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCatchCriteriaDropdown(!showCatchCriteriaDropdown)}
                        className="text-primary hover:bg-primary/10"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Criteria
                      </Button>
                      
                      {showCatchCriteriaDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50">
                          <div className="p-3 border-b border-border">
                            <span className="font-medium text-foreground">Select Criteria (max 2)</span>
                          </div>
                          <div className="p-2 space-y-1">
                            {generalCriteria.map(criteria => (
                              <div
                                key={criteria.id}
                                className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                                onClick={() => handleToggleGeneralCatchCriteria(criteria)}
                              >
                                <Checkbox
                                  checked={generalCatchCriteria.some(c => c.code === criteria.code)}
                                  disabled={!generalCatchCriteria.some(c => c.code === criteria.code) && generalCatchCriteria.length >= 2}
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
                              onClick={() => setShowCatchCriteriaDropdown(false)}
                            >
                              Save Selection
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-20 py-3 px-2 text-center border-l border-primary/30">
                    <span className="text-sm font-semibold text-muted-foreground">Value</span>
                  </div>
                </div>
                
                {/* Section Components */}
                <div className="border-x border-b border-border rounded-b-lg bg-background">
                  {catchComponents.length > 0 ? (
                    catchComponents.map((component, index) => 
                      renderComponentRow(component, index === catchComponents.length - 1 && extraCatchCriteria.length === 0 && generalCatchCriteria.length === 0)
                    )
                  ) : (
                    <div className="flex items-center py-4 px-4 text-muted-foreground text-sm">
                      No catch components
                    </div>
                  )}
                  
                  {/* General Catch Criteria */}
                  {generalCatchCriteria.map((criteria, index) => (
                    <div 
                      key={criteria.id} 
                      className="flex items-center border-b border-border"
                    >
                      <div className="w-8 py-4" />
                      <div className="w-12 flex justify-center py-4">
                        {criteria.symbol_image ? (
                          <img 
                            src={criteria.symbol_image} 
                            alt={criteria.name} 
                            className="h-8 w-auto max-w-[40px] object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <div className="flex-1 py-4 px-4">
                        <span className="font-medium text-foreground text-sm">{criteria.name}</span>
                      </div>
                      <div className="w-20 py-4 px-2 text-center border-l border-border relative">
                        <p className="font-semibold text-primary">{criteria.value}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveGeneralCatchCriteria(criteria.id)}
                          className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Extra Catch Criteria (Specific Catches) */}
                  {extraCatchCriteria.map((criteria, index) => (
                    <div 
                      key={criteria.id} 
                      className={`flex items-center ${index !== extraCatchCriteria.length - 1 ? 'border-b border-border' : ''}`}
                    >
                      <div className="w-8 py-4" />
                      <div className="w-12 flex justify-center py-4">
                        {criteria.symbol_image ? (
                          <img 
                            src={criteria.symbol_image} 
                            alt={criteria.name} 
                            className="h-8 w-auto max-w-[40px] object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        ) : (
                          <div className="h-8 w-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <div className="flex-1 py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground text-sm">
                            <NotesWithSymbols notes={criteria.name} symbolMap={{}} />
                          </span>
                          {criteria.notes && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-sm">
                                  <NotesWithSymbols notes={criteria.notes} symbolMap={{}} />
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                      <div className="w-20 py-4 px-2 text-center border-l border-border relative">
                        <p className="font-semibold text-primary">{criteria.value}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCatchCriteria(criteria.id)}
                          className="h-5 w-5 text-destructive hover:bg-destructive/10 absolute top-1 right-1"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Add Extra Catch Button - hidden for R2 and when one is already selected, excludes Catch during DB */}
                  {filteredCatches.filter(c => c.code !== 'Catch9').length > 0 && !isR2 && extraCatchCriteria.length === 0 && (
                    <div ref={catchDropdownRef} className="relative border-t border-border">
                      <Button
                        variant="ghost"
                        className="w-full py-3 text-primary hover:bg-primary/5 flex items-center justify-center gap-2"
                        onClick={() => setShowCatchDropdown(!showCatchDropdown)}
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Extra Catch</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${showCatchDropdown ? 'rotate-180' : ''}`} />
                      </Button>
                      
                      {showCatchDropdown && (
                        <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-b-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredCatches
                            .filter(c => c.code !== 'Catch9' && !extraCatchCriteria.some(ec => ec.code === c.code))
                            .map(catchItem => (
                              <div
                                key={catchItem.id}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-border last:border-b-0"
                                onClick={() => handleAddCatchCriteria(catchItem)}
                              >
                                <div className="w-8 h-8 flex-shrink-0">
                                  {catchItem.symbol_image ? (
                                    <img 
                                      src={catchItem.symbol_image} 
                                      alt={catchItem.name} 
                                      className="h-8 w-8 object-contain"
                                    />
                                  ) : (
                                    <div className="h-8 w-8 bg-muted rounded" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm text-foreground">
                                      <NotesWithSymbols notes={catchItem.name} symbolMap={{}} />
                                    </p>
                                    {catchItem.notes && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="inline-flex">
                                              <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-sm">
                                            <NotesWithSymbols notes={catchItem.notes} symbolMap={{}} />
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </div>
                                </div>
                                <div className="text-sm text-primary font-semibold">
                                  {catchItem.value ?? 0.1}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Section Total */}
                  {(catchComponents.length > 0 || extraCatchCriteria.length > 0 || generalCatchCriteria.length > 0) && (
                    <div className="flex items-center border-t border-border bg-muted/30">
                      <div className="w-8 py-2" />
                      <div className="w-12 py-2" />
                      <div className="flex-1 py-2 px-4">
                        <span className="font-medium text-muted-foreground text-sm">Section Total</span>
                      </div>
                      <div className="w-20 py-2 px-2 text-center border-l border-border">
                        <p className="font-bold text-primary">{catchTotal.toFixed(1)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
