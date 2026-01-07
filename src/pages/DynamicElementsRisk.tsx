import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DynamicElementsRisk = () => {
  const navigate = useNavigate();

  const handleSelectStandardRisk = () => {
    // TODO: Implement standard risk selection
  };

  const handleCreateOwnRisk = () => {
    // TODO: Implement custom risk creation
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/routine-calculator")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold text-center flex-1">
            Dynamic Elements with Rotations
            <span className="block text-lg font-normal text-muted-foreground">
              Risk Constructor
            </span>
          </h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Description Box */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Here you can create dynamic elements with rotations, naming Risks.</p>
              
              <div>
                <p>A valid risk consists of 3 parts:</p>
                <ul className="list-none pl-0 mt-1">
                  <li>A High throw of apparatus</li>
                  <li>2 base rotations</li>
                  <li>A catch of apparatus after rotations.</li>
                </ul>
              </div>
              
              <p>The base value of Risk (minimum 2 base rotations with a complete 360° for each rotation) is 0.20 p.</p>
              
              <p>
                Note that a minimum of two base rotations (around any axis/with or without passing on the floor) must be performed to make a risk valid. The 2 base rotations must be performed <strong>without any additional step(s)</strong> between the base rotations to validate the risk.
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button 
              variant="outline"
              className="w-full h-16 text-lg hover:scale-[1.02] transition-transform"
              onClick={handleSelectStandardRisk}
            >
              Select standard Risk of 0.2
            </Button>
            
            <Button 
              variant="outline"
              className="w-full h-16 text-lg hover:scale-[1.02] transition-transform"
              onClick={handleCreateOwnRisk}
            >
              Create your own Risk
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DynamicElementsRisk;
