import { Link, useLocation } from "react-router-dom";
import { HardHat } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/jobs", label: "Jobs" },
  { to: "/tenders", label: "Tenders" },
];

export const Header = () => {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900">
            <HardHat className="h-5 w-5 text-orange-500" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            BitsNdBricks
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.label.toLowerCase()}`}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-orange-600 ${
                pathname.startsWith(l.to) ? "text-orange-600" : "text-slate-700"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/submit" data-testid="nav-submit">
            <Button
              size="sm"
              className="ml-1 bg-orange-600 text-white hover:bg-orange-700 active:scale-95"
            >
              Submit Requirement
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
