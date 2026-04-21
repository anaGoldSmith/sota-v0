import { ListPlus, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const apparatusSymbols = [
  { file: "Rope.png", bg: "bg-pink-100", label: "Rope" },
  { file: "H.png", bg: "bg-amber-100", label: "Hoop" },
  { file: "B.png", bg: "bg-sky-100", label: "Ball" },
  { file: "CL.png", bg: "bg-emerald-100", label: "Clubs" },
  { file: "RIB.png", bg: "bg-violet-100", label: "Ribbon" },
].map((item) => ({
  ...item,
  url: supabase.storage.from("apparatus-symbols").getPublicUrl(item.file).data.publicUrl,
}));

const steps = [
  {
    type: "apparatus" as const,
    title: "Pick your apparatus",
    description: "Choose Hoop, Ball, Clubs, or Ribbon to start a new routine.",
  },
  {
    type: "icon" as const,
    icon: ListPlus,
    title: "Add your elements",
    description: "Jumps, balances, rotations, DA, technical elements, and risks.",
  },
  {
    type: "icon" as const,
    icon: Calculator,
    title: "Get your D-score",
    description: "Instant DB + DA + R total, ready to save and refine.",
  },
];

const HowItWorks = () => (
  <section className="mb-10">
    <h2 className="text-2xl font-semibold text-center mb-6 text-foreground">How it works</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {steps.map((step, idx) => (
        <div
          key={step.title}
          className="relative p-6 rounded-xl border border-border bg-card flex flex-col items-center text-center"
        >
          <div className="absolute top-2 right-2 text-xs font-semibold text-muted-foreground">
            Step {idx + 1}
          </div>
          {step.type === "apparatus" ? (
            <div className="flex items-center justify-center gap-2 mb-3">
              {apparatusSymbols.map((item) => (
                <div
                  key={item.file}
                  className={`h-10 w-10 rounded-full ${item.bg} flex items-center justify-center`}
                  title={item.label}
                >
                  <img
                    src={item.url}
                    alt={item.label}
                    className="h-6 w-6 object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <step.icon className="h-6 w-6" />
            </div>
          )}
          <h3 className="font-semibold text-lg mb-1 text-foreground">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;
