import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const daysUntil = (d: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getStatus = (dates: string | null) => {
  const d = parseDateStart(dates);
  if (!d) return null;
  const diff = daysUntil(d);
  if (diff < 0) return { label: "Past", variant: "secondary" as const };
  if (diff <= 7) return { label: "This week", variant: "default" as const };
  return { label: "Upcoming", variant: "outline" as const };
};

const EventsList = () => {
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

  // Find next upcoming event (first with future date)
  const nextUpcomingId = events.find((e) => {
    const d = parseDateStart(e.dates);
    return d && daysUntil(d) >= 0;
  })?.id;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-foreground">Events</h2>
      <div className="space-y-4">
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events available</p>
        ) : (
          events.slice(0, 2).map((event) => {
            const status = getStatus(event.dates);
            const d = parseDateStart(event.dates);
            const diff = d ? daysUntil(d) : null;
            const isNext = event.id === nextUpcomingId;
            return (
              <div
                key={event.id}
                className="p-5 border-2 border-primary rounded-xl bg-background/60 hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                  {status && <Badge variant={status.variant}>{status.label}</Badge>}
                </div>
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
                {isNext && diff !== null && diff > 0 && (
                  <p className="text-sm font-medium text-primary mt-2">
                    In {diff} {diff === 1 ? "day" : "days"}
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
            );
          })
        )}
        {events.length > 2 && (
          <Button
            variant="outline"
            className="w-full mt-2 border-2 border-muted-foreground/40"
            onClick={() => navigate("/events")}
          >
            View All Events
          </Button>
        )}
      </div>
    </div>
  );
};

export default EventsList;
