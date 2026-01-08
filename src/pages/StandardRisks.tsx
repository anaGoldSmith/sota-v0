import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const StandardRisks = () => {
  const navigate = useNavigate();
  const [symbols, setSymbols] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSymbols = async () => {
      const symbolCodes = ["R2", "Thr1", "baseRotations", "Catch 1"];
      const symbolUrls: Record<string, string> = {};
      
      for (const code of symbolCodes) {
        const { data } = supabase.storage
          .from("dynamic-element-symbols")
          .getPublicUrl(`other_risks/${code}.png`);
        symbolUrls[code] = data.publicUrl;
      }
      
      setSymbols(symbolUrls);
    };
    
    loadSymbols();
  }, []);

  const handleSave = () => {
    // TODO: Save the standard risk and return to routine calculator
    navigate("/routine-calculator");
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
          <div className="text-center flex items-center justify-center gap-3">
            <h2 className="text-3xl font-bold text-primary">
              R<sub className="text-xl">2</sub>
            </h2>
            {symbols["R2"] && (
              <img 
                src={symbols["R2"]} 
                alt="R2 Symbol" 
                className="h-10 w-10 object-contain"
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
                  <span className="text-sm font-semibold text-muted-foreground">Symbol</span>
                </div>
                <div className="flex-1 py-3 px-4">
                  <span className="text-sm font-semibold text-muted-foreground">Risk Components</span>
                </div>
                <div className="w-24 py-3 px-4 text-center border-l border-border">
                  <span className="text-sm font-semibold text-muted-foreground">Value</span>
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
                  {symbols["Catch 1"] ? (
                    <img 
                      src={symbols["Catch 1"]} 
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
    </div>
  );
};

export default StandardRisks;
