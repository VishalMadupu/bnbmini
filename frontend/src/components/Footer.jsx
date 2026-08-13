"use client";

import Link from 'next/link';
import { BrandLogo } from "./BrandLogo";

export const Footer = () => (
  <footer className="mt-20 border-t border-slate-200 bg-white">
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" />
            <span className="font-display text-base font-bold text-brand-900">BitsNdBricks</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            A construction opportunity discovery platform. Find jobs and tenders
            from across India, all in one place.
          </p>
        </div>

        <div className="flex gap-12">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/jobs" className="text-slate-600 hover:text-brand-600">Jobs</Link></li>
              <li><Link href="/tenders" className="text-slate-600 hover:text-brand-600">Tenders</Link></li>
              <li><Link href="/submit" className="text-slate-600 hover:text-brand-600">Submit Requirement</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/privacy" data-testid="footer-privacy" className="text-slate-600 hover:text-brand-600">Privacy Policy</Link></li>
              <li><Link href="/disclaimer" data-testid="footer-disclaimer" className="text-slate-600 hover:text-brand-600">Disclaimer</Link></li>
              <li><Link href="/terms" data-testid="footer-terms" className="text-slate-600 hover:text-brand-600">Terms of Use</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-slate-100 pt-6 text-xs text-slate-400">
        © {new Date().getFullYear()} BitsNdBricks. BitsNdBricks is an information and discovery
        platform. Always verify opportunity details with the original source before acting.
      </div>
    </div>
  </footer>
);

export default Footer;
