import { User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LandingHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between p-4 border-b border-border">
      <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label="Admin">
        <Settings className="h-6 w-6" />
      </Button>
      <div className="flex flex-col items-center">
        <p className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Rhythm. Gymnastics. Score.
        </p>
        <p className="text-base text-muted-foreground italic -mt-0.5">
          Check your D-score before the judges do
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={() => navigate("/auth")} aria-label="Sign in">
        <User className="h-6 w-6" />
      </Button>
    </header>
  );
};

export default LandingHeader;
