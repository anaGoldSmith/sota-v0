import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/rhythmic-gymnastics-hero.jpg";
const Index = () => {
  const navigate = useNavigate();

  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" className="rounded-full text-lg">
          <Menu className="h-10 w-10" strokeWidth={2.5} />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Sport Space
        </h1>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/auth")}
        >
          <User className="h-6 w-6" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Available Sports Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Available Sports</h2>
          <div className="inline-block">
            <Button variant="default" size="lg" className="rounded-full px-8 py-6 text-lg font-medium bg-primary hover:bg-primary/90">
              Rhythmic Gymnastics
            </Button>
          </div>
        </section>

        {/* Hero Image Section */}
        <section className="mb-8 rounded-xl overflow-hidden shadow-lg">
          <img src={heroImage} alt="Rhythmic Gymnastics Performance" className="w-full h-[250px] object-cover" />
        </section>

        {/* Two Column Layout: Tools and Events */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tools Column */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Tools</h2>
            <div className="space-y-4">
              <div 
                className="p-6 border-2 border-primary rounded-xl hover:bg-accent transition-colors cursor-pointer"
                onClick={() => navigate("/routines")}
              >
                <h3 className="text-lg font-semibold mb-2 text-foreground">My Routines</h3>
                <p className="text-muted-foreground">Create routines with DA & DD calculation</p>
              </div>
              <div 
                className="p-6 border-2 border-primary rounded-xl hover:bg-accent transition-colors cursor-pointer"
                onClick={() => navigate("/code-of-points")}
              >
                <h3 className="text-lg font-semibold mb-2 text-foreground">FIG Code of Points</h3>
                <p className="text-muted-foreground">Search & Access COP 2025-2028</p>
              </div>
            </div>
          </div>

          {/* Events Column */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-foreground">Events</h2>
            <div className="space-y-4">
              <div className="p-6 border-2 border-muted rounded-xl bg-muted/50">
                <h3 className="text-lg font-semibold mb-2 text-muted-foreground">Event Placeholder 1</h3>
                <p className="text-muted-foreground">Event details will be added here</p>
              </div>
              <div className="p-6 border-2 border-muted rounded-xl bg-muted/50">
                <h3 className="text-lg font-semibold mb-2 text-muted-foreground">Event Placeholder 2</h3>
                <p className="text-muted-foreground">Event details will be added here</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>;
};
export default Index;