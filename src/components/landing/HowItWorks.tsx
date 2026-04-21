import { Target, ListPlus, Calculator } from "lucide-react";

const steps = [
  {
    icon: Target,
    title: "Pick your apparatus",
    description: "Choose Hoop, Ball, Clubs, or Ribbon to start a new routine.",
  },
  {
    icon: ListPlus,
    title: "Add your elements",
    description: "Jumps, balances, rotations, DA, technical elements, and risks.",
  },
  {
    icon: Calculator,
    title: "Get your D-score",
    description: "Instant DB + DA + R total, ready to save and refine.",
  },
];

const HowItWorks = () => (
  <section className="mb-10">
    <h2 className="text-2xl font-semibold text-center mb-6 text-foreground">How it works</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        return (
          <div
            key={step.title}
            className="relative p-6 rounded-xl border border-border bg-card flex flex-col items-center text-center"
          >
            <div className="absolute top-3 right-4 text-xs font-semibold text-muted-foreground">
              0{idx + 1}
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-1 text-foreground">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        );
      })}
    </div>
  </section>
);

export default HowItWorks;
