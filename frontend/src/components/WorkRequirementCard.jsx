import { Link } from "react-router-dom";
import { MapPin, CalendarClock, ArrowRight, Package, Hash } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { formatDate } from "@/lib/format";

export const WorkRequirementCard = ({ item }) => (
  <Link
    to={`/work-requirements/${item.slug}`}
    data-testid={`wr-card-${item.bnb_id}`}
    className="group flex flex-col rounded-lg border border-slate-200 bg-white p-6 transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-md"
  >
    <span className="mb-2 inline-flex w-fit items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
      {item.requirement_type}
    </span>
    <div className="flex items-start justify-between gap-3">
      <h3 className="break-words font-display text-lg font-semibold leading-snug tracking-tight text-brand-900 group-hover:text-brand-600">
        {item.title || "Requirement"}
      </h3>
      {item.verified && <VerifiedBadge />}
    </div>
    {item.organization && <p className="mt-1 text-sm font-medium text-slate-700">{item.organization}</p>}

    <div className="mt-4 space-y-2 text-sm text-slate-500">
      {(item.city || item.state) && (
        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" />{item.city}{item.city && item.state ? ", " : ""}{item.state}</div>
      )}
      {item.quantity && <div className="flex items-center gap-2"><Package className="h-4 w-4 text-slate-400" />{item.quantity}</div>}
      {item.required_by && <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-slate-400" />Required by {formatDate(item.required_by)}</div>}
    </div>

    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
      <span className="flex items-center gap-1 font-mono text-xs text-slate-400"><Hash className="h-3 w-3" />{item.bnb_id}</span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
        View Requirement <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  </Link>
);

export default WorkRequirementCard;
