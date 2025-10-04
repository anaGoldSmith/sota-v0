import { ArrowLeft, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const CodeOfPoints = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Rule Books
        </h1>
        <div className="w-10" /> {/* Spacer for alignment */}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* File PDF Section */}
        <section className="mb-8">
          <div className="p-6 border-2 border-primary rounded-xl hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">File.pdf</h3>
                <p className="text-sm text-muted-foreground">FIG Code of Points 2025-2028</p>
              </div>
            </div>
          </div>
        </section>

        {/* Other COPs Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Other COPs</h2>
          <div className="space-y-4">
            <div className="p-6 border-2 border-muted rounded-xl bg-muted/50">
              <h3 className="text-lg font-semibold mb-2 text-muted-foreground">Additional Resources</h3>
              <p className="text-muted-foreground">Other code of points files will be added here</p>
            </div>
          </div>
        </section>

        {/* Search Bar Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Search</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search in Code of Points..." 
              className="pl-10 h-12 text-lg"
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default CodeOfPoints;

