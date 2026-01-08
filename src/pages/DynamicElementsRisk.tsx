import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
const DynamicElementsRisk = () => {
  const navigate = useNavigate();
  const [isOverviewOpen, setIsOverviewOpen] = useState(true);
  const handleSelectStandardRisk = () => {
    // TODO: Implement standard risk selection
  };
  const handleCreateOwnRisk = () => {
    // TODO: Implement custom risk creation
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
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

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button className="w-full h-16 text-lg hover:scale-[1.02] transition-transform bg-primary hover:bg-primary/90 text-primary-foreground shadow-md" onClick={handleSelectStandardRisk}>
              <span className="flex items-baseline">
                Add Standard Risk of 0.2 - R<sub className="text-sm">2</sub>
              </span>
            </Button>
            
            <Button variant="outline" className="w-full h-16 text-lg hover:scale-[1.02] transition-transform border-secondary text-secondary hover:bg-secondary/10" onClick={handleCreateOwnRisk}>Create Risk with Extra Criteria</Button>
          </div>
        </div>
      </main>
    </div>;
};
export default DynamicElementsRisk;