"use client";

import { useState } from "react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle, SheetDescription } from "./ui/sheet";

const links = [
  { to: "/jobs", label: "Jobs", id: "jobs" },
  { to: "/tenders", label: "Tenders", id: "tenders" },
  { to: "/work-requirements", label: "Work Requirements", id: "work" },
  { to: "/knowledge-hub", label: "Knowledge Hub", id: "knowledge" },
];

export const Header = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" data-testid="logo-link" className="flex items-center gap-2">
          <BrandLogo className="h-9 w-9" />
          <span className="font-display text-lg font-bold tracking-tight text-brand-900">
            BitsNdBricks
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 sm:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              href={l.to}
              data-testid={`nav-${l.id}`}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-brand-600 ${
                pathname.startsWith(l.to) ? "text-brand-600" : "text-slate-700"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/submit" data-testid="nav-submit">
            <Button size="sm" className="ml-1 bg-brand-600 text-white hover:bg-brand-700 active:scale-95">
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
            <SheetContent side="right" className="w-72 overflow-y-auto">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <SheetDescription className="sr-only">Browse jobs, tenders, or submit a requirement</SheetDescription>
              <div className="mt-6 flex flex-col gap-1">
                {links.map((l) => (
                  <SheetClose asChild key={l.to}>
                    <Link
                      href={l.to}
                      data-testid={`mobile-nav-${l.id}`}
                      className={`rounded-md px-3 py-3 text-base font-medium ${
                        pathname.startsWith(l.to) ? "bg-brand-50 text-brand-600" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Link href="/submit" data-testid="mobile-nav-submit" className="mt-3">
                    <Button className="w-full bg-brand-600 py-6 text-base text-white hover:bg-brand-700">
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
