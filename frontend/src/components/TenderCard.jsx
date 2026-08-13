"use client";

import Link from 'next/link';
import { MapPin, CalendarClock, ArrowRight, IndianRupee, Hash } from "lucide-react";
import { VerifiedBadge } from "./VerifiedBadge";
import { formatDate } from "../lib/format";

export const TenderCard = ({ tender }) => (
  <Link
    href={`/tenders/${tender.slug}`}
    data-testid={`tender-card-${tender.bnb_id}`}
    className={`group flex flex-col rounded-lg border bg-white p-6 transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-md ${
      tender.is_expired ? "border-slate-200 opacity-90" : "border-slate-200"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <h3 className="break-words font-display text-lg font-semibold leading-snug tracking-tight text-brand-900 group-hover:text-brand-600">
        {tender.title}
      </h3>
      {tender.verified && <VerifiedBadge />}
    </div>
    <p className="mt-1 text-sm font-medium text-slate-700">{tender.organization}</p>
    {tender.original_reference && (
      <p className="mt-0.5 font-mono text-xs italic text-slate-400">No: {tender.original_reference}</p>
    )}

    <div className="mt-4 space-y-2 text-sm text-slate-500">
      {tender.estimated_value && (
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-slate-400" />
          {tender.estimated_value}
        </div>
      )}
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-slate-400" />
        {tender.city}, {tender.state}
      </div>
      {tender.last_date && (
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          {tender.is_expired ? "Closed" : "Last date"} {formatDate(tender.last_date)}
        </div>
      )}
    </div>

    <div className="mt-4">
      {tender.is_expired ? (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
          Expired
        </span>
      ) : (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
          Open
        </span>
      )}
    </div>

    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
      <span className="flex items-center gap-1 font-mono text-xs text-slate-400"><Hash className="h-3 w-3" />{tender.bnb_id}</span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
        View Tender <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </Link>
);

export default TenderCard;
