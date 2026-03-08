import { useState, useEffect } from "react";
import { User, MapPin, Calendar, ExternalLink } from "lucide-react";
import landingBottomBg from "@/assets/landing-bottom-bg.jpg";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

    const loadHeroImages = async () => {
      const { data, error } = await supabase.storage
        .from("landing-page-images")
        .list("", { limit: 20 });
      if (!error && data && data.length > 0) {
        const urls = data
          .filter(f => f.name && !f.name.startsWith("."))
          .map(f => supabase.storage.from("landing-page-images").getPublicUrl(f.name).data.publicUrl);
        setHeroImages(urls);
      }
    };

    loadEvents();
    loadHeroImages();
  }, []);

  // Cycle through images every 4 seconds
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="w-10" />
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Rhythm. Gymnastics. Score.
          </h1>
          <p className="text-base text-muted-foreground italic -mt-0.5">Check your D-score before the judges do</p>
        </div>
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
        {/* Hero Image Carousel */}
        <section className="mb-8 rounded-xl overflow-hidden shadow-lg relative">
          {heroImages.length > 0 ? (
            <div className="relative w-full h-[350px] md:h-[450px]">
              {heroImages.map((url, index) => (
                <img
                  key={url}
                  src={url}
                  alt={`Rhythmic Gymnastics ${index + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                    index === currentImageIndex ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}
              {/* Dots indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentImageIndex ? "bg-primary" : "bg-background/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-[350px] md:h-[450px] bg-muted flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          )}
        </section>

        {/* Two Column Layout: Tools and Events */}
        <section
          className="grid grid-cols-1 md:grid-cols-2 gap-8 relative rounded-xl p-8 overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.30]"
            style={{ backgroundImage: `url(${landingBottomBg})` }}
          />
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
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events available</p>
              ) : (
                events.slice(0, 2).map((event) => (
                  <div key={event.id} className="p-6 border-2 border-primary rounded-xl hover:bg-accent transition-colors">
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
              {events.length > 2 && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => navigate("/events")}
                >
                  View All Events
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
export default Index;
