import { useNavigate } from "react-router-dom";
import { ClipboardList, BookOpen, ShieldAlert, Zap } from "lucide-react";

const tools = [
  {
    title: "My Routines",
    description: "Create routines with DA, DB & R calculation",
    path: "/routines",
    icon: ClipboardList,
  },
  {
    title: "FIG Code of Points",
    description: "Search & access COP 2025–2028",
    path: "/code-of-points",
    icon: BookOpen,
  },
  {
    title: "Standard Risks",
    description: "Browse pre-recorded risk combinations",
    path: "/standard-risks",
    icon: ShieldAlert,
  },
  {
    title: "Dynamic Elements Risk",
    description: "Build dynamic throws & catches with risk",
    path: "/dynamic-elements-risk",
    icon: Zap,
  },
];

const ToolsGrid = () => {
  const navigate = useNavigate();
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-foreground">Tools</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.path}
              onClick={() => navigate(tool.path)}
              className="text-left p-5 border-2 border-primary rounded-xl bg-background/60 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">{tool.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ToolsGrid;
