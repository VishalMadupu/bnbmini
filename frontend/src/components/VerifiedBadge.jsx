"use client";

import { CheckCircle2 } from "lucide-react";

export const VerifiedBadge = ({ className = "" }) => (
  <span
    data-testid="verified-badge"
    className={`inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 ${className}`}
  >
    <CheckCircle2 className="h-3.5 w-3.5" />
    Verified Source
  </span>
);

export default VerifiedBadge;
