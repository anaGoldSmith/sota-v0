import { Link } from "react-router-dom";

const LandingFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border mt-12 bg-background">
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-semibold mb-3 text-foreground">Tools</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/routines" className="hover:text-primary">My Routines</Link></li>
            <li><Link to="/code-of-points" className="hover:text-primary">Code of Points</Link></li>
            <li><Link to="/standard-risks" className="hover:text-primary">Standard Risks</Link></li>
            <li><Link to="/dynamic-elements-risk" className="hover:text-primary">Dynamic Elements Risk</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3 text-foreground">Discover</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/events" className="hover:text-primary">Events</Link></li>
            <li><Link to="/admin" className="hover:text-primary">Admin</Link></li>
            <li><Link to="/auth" className="hover:text-primary">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Rhythm. Gymnastics. Score.
          </h3>
          <p className="text-sm text-muted-foreground italic">
            Check your D-score before the judges do.
          </p>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="container mx-auto px-4 py-4 text-xs text-muted-foreground text-center">
          © {year} Rhythm. Gymnastics. Score. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default LandingFooter;
