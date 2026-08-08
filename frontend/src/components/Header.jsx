import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { HardHat, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const links = [
  { to: "/jobs", label: "Jobs" },
  { to: "/tenders", label: "Tenders" },
];

export const Header = () => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

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

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
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
            <Button size="sm" className="ml-1 bg-orange-600 text-white hover:bg-orange-700 active:scale-95">
              Submit Requirement
            </Button>
          </Link>
        </nav>

        {/* Mobile menu */}
        <div className="sm:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button data-testid="mobile-menu-button" aria-label="Open menu" className="flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="mt-6 flex flex-col gap-1">
                {links.map((l) => (
                  <SheetClose asChild key={l.to}>
                    <Link
                      to={l.to}
                      data-testid={`mobile-nav-${l.label.toLowerCase()}`}
                      className={`rounded-md px-3 py-3 text-base font-medium ${
                        pathname.startsWith(l.to) ? "bg-orange-50 text-orange-600" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link to="/submit" data-testid="mobile-nav-submit" className="mt-3">
                    <Button className="w-full bg-orange-600 py-6 text-base text-white hover:bg-orange-700">
                      Submit Requirement
                    </Button>
                  </Link>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
