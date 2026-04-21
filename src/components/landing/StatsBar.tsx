import { Check } from "lucide-react";

const items = [
  "FIG Code of Points 2025–2028",
  "All 4 apparatus (Hoop, Ball, Clubs, Ribbon)",
  "Real-time D-score calculation",
  "Save & re-edit routines",
];

const StatsBar = () => (
  <section className="mb-8 rounded-xl border border-border bg-card px-6 py-4">
    <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2">
          <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </section>
);

export default StatsBar;
