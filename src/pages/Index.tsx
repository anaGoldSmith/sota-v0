import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/rhythmic-gymnastics-hero.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Sport Space
        </h1>
        <Button variant="ghost" size="icon">
          <User className="h-6 w-6" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Available Sports Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Available Sports</h2>
          <div className="inline-block">
            <Button 
              variant="default" 
              size="lg"
              className="rounded-full px-8 py-6 text-lg font-medium bg-primary hover:bg-primary/90"
            >
              Rhythmic Gymnastics
            </Button>
          </div>
        </section>

        {/* Hero Image Section */}
        <section className="mb-8 rounded-xl overflow-hidden shadow-lg">
          <img 
            src={heroImage} 
            alt="Rhythmic Gymnastics Performance" 
            className="w-full h-[400px] object-cover"
          />
        </section>

        {/* Action Buttons */}
        <section className="flex gap-4 justify-center flex-wrap">
          <Button 
            variant="outline" 
            size="lg"
            className="rounded-full px-12 py-6 text-lg font-medium border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Tools
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="rounded-full px-12 py-6 text-lg font-medium border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Events
          </Button>
        </section>
      </main>
    </div>
  );
};

export default Index;
