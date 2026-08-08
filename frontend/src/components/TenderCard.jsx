import { Link } from "react-router-dom";
import { MapPin, CalendarClock, ArrowRight, IndianRupee } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatDate } from "@/lib/format";

export const TenderCard = ({ tender }) => (
  <Link
    to={`/tenders/${tender.slug}`}
    data-testid={`tender-card-${tender.bnb_id}`}
    className="group flex flex-col rounded-lg border border-slate-200 bg-white p-6 transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-md"
  >
    <div className="flex items-start justify-between gap-3">
      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-slate-900 group-hover:text-orange-600">
        {tender.title}
      </h3>
      {tender.verified && <VerifiedBadge />}
    </div>
    <p className="mt-1 text-sm font-medium text-slate-700">{tender.organization}</p>

    <div className="mt-4 space-y-2 text-sm text-slate-500">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-slate-400" />
        {tender.city}, {tender.state}
      </div>
      {tender.estimated_value && (
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-slate-400" />
          {tender.estimated_value}
        </div>
      )}
      {tender.last_date && (
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-400" />
          Last date {formatDate(tender.last_date)}
        </div>
      )}
    </div>

    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
      <span className="font-mono text-xs text-slate-400">{tender.bnb_id}</span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
        View Tender <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </Link>
);

export default TenderCard;
