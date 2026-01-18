import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, AlertCircle, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TechnicalElementSelection, DaElementSelection } from "./ElementInformationDialog";

interface FouetteComponent {
  id: string;
  rotations: number;
}

interface FouetteRotationHandling {
  rotationIndex: number; // 0-based index across all components
  teElement?: TechnicalElementSelection;
  daElement?: DaElementSelection;
}

interface FouetteComponentsEditorProps {
  components: FouetteComponent[];
  onChange: (components: FouetteComponent[]) => void;
  baseValue: number;
  maxComponents?: number;
  rotationHandlings?: FouetteRotationHandling[];
  onAssignHandling?: (rotationIndex: number) => void;
  onRemoveHandling?: (rotationIndex: number) => void;
  getTechnicalElementSymbol?: (filename: string | null, apparatus: string) => string | null;
  apparatus?: string | null;
}

export const FouetteComponentsEditor = ({
  components,
  onChange,
  baseValue,
  maxComponents = 10,
  rotationHandlings = [],
  onAssignHandling,
  onRemoveHandling,
  getTechnicalElementSymbol,
  apparatus,
}: FouetteComponentsEditorProps) => {
  const addComponent = () => {
    if (components.length >= maxComponents) return;
    onChange([
      ...components,
      { id: crypto.randomUUID(), rotations: 1 }
    ]);
  };

  const removeComponent = (id: string) => {
    if (components.length <= 1) return; // Must have at least one component
    onChange(components.filter(c => c.id !== id));
  };

  const updateComponentRotations = (id: string, rotations: number) => {
    if (rotations < 1) rotations = 1;
    onChange(components.map(c => 
      c.id === id ? { ...c, rotations } : c
    ));
  };

  const incrementRotations = (id: string) => {
    const component = components.find(c => c.id === id);
    if (component) {
      updateComponentRotations(id, component.rotations + 1);
    }
  };

  const decrementRotations = (id: string) => {
    const component = components.find(c => c.id === id);
    if (component && component.rotations > 1) {
      updateComponentRotations(id, component.rotations - 1);
    }
  };

  // Calculate total rotations and value
  const totalRotations = components.reduce((sum, c) => sum + c.rotations, 0);
  // Value = 0.1 per rotation
  const totalValue = totalRotations * 0.1;

  // Build flat list of rotations with their component info
  const buildRotationsList = () => {
    const rotations: { componentIndex: number; componentId: string; rotationInComponent: number; globalIndex: number }[] = [];
    let globalIndex = 0;
    components.forEach((component, componentIndex) => {
      for (let i = 0; i < component.rotations; i++) {
        rotations.push({
          componentIndex,
          componentId: component.id,
          rotationInComponent: i + 1,
          globalIndex,
        });
        globalIndex++;
      }
    });
    return rotations;
  };

  const rotationsList = buildRotationsList();

  // Helper to get handling for a rotation
  const getHandlingForRotation = (globalIndex: number) => {
    return rotationHandlings.find(h => h.rotationIndex === globalIndex);
  };

  // Helper to get ordinal suffix
  const getOrdinalSuffix = (n: number): string => {
    if (n === 1) return 'st';
    if (n === 2) return 'nd';
    if (n === 3) return 'rd';
    return 'th';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Fouetté Components</span>
        <span className="text-xs text-muted-foreground">
          {components.length}/{maxComponents} components
        </span>
      </div>

      <ScrollArea className="max-h-[150px]">
        <div className="space-y-2 pr-2">
          {components.map((component, index) => {
            const componentValue = component.rotations * 0.1;
            return (
              <div 
                key={component.id} 
                className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border"
              >
                <span className="text-xs text-muted-foreground w-8">
                  #{index + 1}
                </span>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => decrementRotations(component.id)}
                  disabled={component.rotations <= 1}
                  className="h-7 w-7"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                
                <Input
                  type="number"
                  min={1}
                  value={component.rotations}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      updateComponentRotations(component.id, val);
                    }
                  }}
                  className="text-center text-sm font-semibold h-7 w-14"
                />
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => incrementRotations(component.id)}
                  className="h-7 w-7"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                
                <span className="text-xs text-muted-foreground flex-1">
                  {component.rotations} {component.rotations === 1 ? 'rotation' : 'rotations'}
                </span>
                
                <span className="text-sm font-mono text-primary">
                  {componentValue.toFixed(1)}
                </span>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeComponent(component.id)}
                  disabled={components.length <= 1}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Button
        variant="outline"
        size="sm"
        onClick={addComponent}
        disabled={components.length >= maxComponents}
        className="w-full text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Component ({components.length}/{maxComponents})
      </Button>

      {/* Rotation Handling Assignment Section */}
      {onAssignHandling && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Rotation Handling</span>
            <span className="text-xs text-muted-foreground">
              First 2 rotations require handling
            </span>
          </div>
          
          <ScrollArea className="max-h-[180px]">
            <div className="space-y-2 pr-2">
              {rotationsList.map((rotation) => {
                const handling = getHandlingForRotation(rotation.globalIndex);
                const isRequired = rotation.globalIndex < 2;
                const hasHandling = !!handling?.teElement || !!handling?.daElement;
                
                return (
                  <div 
                    key={rotation.globalIndex}
                    className={`p-2 rounded-md border ${
                      isRequired && !hasHandling 
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700' 
                        : hasHandling 
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700'
                          : 'bg-muted/20 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Status icon */}
                      <div className="flex-shrink-0">
                        {hasHandling ? (
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : isRequired ? (
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      
                      {/* Rotation label */}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium">
                          {rotation.globalIndex + 1}{getOrdinalSuffix(rotation.globalIndex + 1)} rotation
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          (Component #{rotation.componentIndex + 1})
                        </span>
                        {isRequired && !hasHandling && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 ml-1 font-medium">
                            • Required
                          </span>
                        )}
                      </div>
                      
                      {/* Handling display or assign button */}
                      {hasHandling ? (
                        <div className="flex items-center gap-2">
                          {handling?.teElement && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 rounded text-xs">
                              {handling.teElement.symbol_image && apparatus && getTechnicalElementSymbol && (
                                <img 
                                  src={getTechnicalElementSymbol(handling.teElement.symbol_image, apparatus) || ''} 
                                  alt="" 
                                  className="h-4 w-4 object-contain" 
                                />
                              )}
                              <span className="text-green-700 dark:text-green-300 truncate max-w-[100px]">
                                {handling.teElement.name}
                              </span>
                            </div>
                          )}
                          {handling?.daElement && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 rounded text-xs">
                              {handling.daElement.symbolImages.slice(0, 2).map((url, idx) => (
                                url.startsWith('TEXT:') ? (
                                  <span key={idx} className="text-xs font-bold">{url.replace('TEXT:', '')}</span>
                                ) : (
                                  <img key={idx} src={url} alt="" className="h-4 w-4 object-contain" />
                                )
                              ))}
                              <span className="text-purple-700 dark:text-purple-300 truncate max-w-[80px]">
                                DA
                              </span>
                            </div>
                          )}
                          {onRemoveHandling && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-destructive"
                              onClick={() => onRemoveHandling(rotation.globalIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          variant={isRequired ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => onAssignHandling(rotation.globalIndex)}
                        >
                          + Assign
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Summary */}
      <div className="p-3 bg-secondary/50 rounded-md border mt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Total Rotations:</span>
          <span className="font-medium">{totalRotations}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-medium">Total Value:</span>
          <span className="font-bold text-primary">
            {totalRotations} × 0.1 = {totalValue.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};

export type { FouetteComponent, FouetteRotationHandling };
