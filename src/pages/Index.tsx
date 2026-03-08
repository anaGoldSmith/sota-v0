import { useState, useEffect } from "react";
import { Menu, User, MapPin, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/rhythmic-gymnastics-hero.jpg";

interface Event {
  id: string;
  title: string;
  dates: string | null;
  city: string | null;
  link: string | null;
  event_id: string;
}

// Parse "DD/MM/YYYY" from the start of a date range like "02/07/2026 - 04/07/2026"
const parseDateStart = (dates: string | null): Date | null => {
  if (!dates) return null;
  const match = dates.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

const Index = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      const { data } = await supabase
        .from("events")
        .select("id, event_id, title, dates, city, link");
      if (data) {
        const sorted = [...data].sort((a, b) => {
          const dateA = parseDateStart(a.dates);
          const dateB = parseDateStart(b.dates);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateA.getTime() - dateB.getTime();
        });
        setEvents(sorted);
      }
    };
    loadEvents();
  }, []);

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
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events available</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="p-6 border-2 border-primary/30 rounded-xl hover:bg-accent transition-colors">
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{event.title}</h3>
                    {event.dates && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                        <Calendar className="h-3.5 w-3.5" /> {event.dates}
                      </p>
                    )}
                    {event.city && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1">
                        <MapPin className="h-3.5 w-3.5" /> {event.city}
                      </p>
                    )}
                    {event.link && (
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary flex items-center gap-1.5 hover:underline mt-2"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Details
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>;
};
export default Index;