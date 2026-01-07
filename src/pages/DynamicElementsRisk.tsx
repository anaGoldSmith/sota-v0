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
            <CardContent className="space-y-6">
              <p>Here you can create dynamic elements with rotations, called Risks.</p>
              
              <div>
                <p className="font-medium mb-2">A valid Risk must include all three of the following parts:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>A high throw of the apparatus</li>
                  <li>Two base rotations</li>
                  <li>A catch of the apparatus after the rotations</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-2">Risk Value</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>The base value of a Risk is 0.20 points</li>
                  <li>This value is awarded for a minimum of two base rotations</li>
                  <li>Each base rotation must be a full 360°</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold mb-2">Important Rules</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>At least two base rotations must be performed to validate a Risk</li>
                  <li>Rotations can be performed around any axis, with or without passing on the floor</li>
                  <li>The two base rotations must be continuous</li>
                  <li>No additional steps are allowed between the two base rotations</li>
                </ul>
              </div>
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
