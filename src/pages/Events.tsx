import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Calendar, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const parseDateStart = (dates: string | null): Date | null => {
  if (!dates) return null;
  const match = dates.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };
    loadEvents();
  }, []);

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.city?.toLowerCase().includes(q) ?? false) ||
      (e.dates?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/")}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">All Events</h1>
        <div className="w-10" />
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events by name, city, or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading events...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No events found</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((event) => (
              <div
                key={event.id}
                className="p-6 border-2 border-primary/30 rounded-xl hover:bg-accent transition-colors"
              >
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Events;
