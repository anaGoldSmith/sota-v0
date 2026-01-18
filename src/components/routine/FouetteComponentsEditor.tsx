import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, Info } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FouetteComponent {
  id: string;
  rotations: number;
}

interface FouetteComponentsEditorProps {
  components: FouetteComponent[];
  onChange: (components: FouetteComponent[]) => void;
  baseValue: number;
  maxComponents?: number;
}

export const FouetteComponentsEditor = ({
  components,
  onChange,
  baseValue,
  maxComponents = 10,
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Fouetté Components</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <p>A Fouetté consists of up to 10 identical components connected with heel support and is counted as one Difficulty. Each component may include one or more rotations. To be valid, apparatus handling must be performed within the first two rotations.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-xs text-muted-foreground">
          {components.length}/{maxComponents} components
        </span>
      </div>

      <div className="space-y-2">
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

      {/* Validation note */}
      <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>
          To validate the element, apparatus handling must be performed within the first 2 rotations of fouetté.
        </span>
      </div>
    </div>
  );
};

export type { FouetteComponent };
