import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, FileText, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Routines = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-2xl font-bold">My Routines</h1>
          <div className="w-10" /> {/* Spacer for alignment */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Action Buttons */}
          <div className="grid gap-4">
            <Button 
              size="lg" 
              className="h-16 text-lg flex items-center justify-start gap-4"
            >
              <Plus className="h-6 w-6" />
              Create New Routine
            </Button>

            <Button 
              variant="outline"
              size="lg" 
              className="h-16 text-lg flex items-center justify-start gap-4"
            >
              <FileText className="h-6 w-6" />
              View All Routines
            </Button>

            <Button 
              variant="outline"
              size="lg" 
              className="h-16 text-lg flex items-center justify-start gap-4"
            >
              <Trash2 className="h-6 w-6" />
              Delete Routine
            </Button>
          </div>

          {/* Empty State */}
          <div className="mt-12 text-center text-muted-foreground">
            <p className="text-lg">No routines yet</p>
            <p className="text-sm mt-2">Create your first routine to get started</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Routines;
