"use client";

import Link from 'next/link';
import { ArrowRight, Hash, CalendarDays, User } from "lucide-react";
import { formatDate } from "../lib/format";
import { fileUrl } from "../lib/api";

export const KnowledgeCard = ({ item }) => (
  <Link
    href={`/knowledge-hub/${item.slug}`}
    data-testid={`knowledge-card-${item.bnb_id}`}
    className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-md"
  >
    {item.cover_image && (
      <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
        <img src={fileUrl(item.cover_image.url)} alt={item.title || "Article"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
    )}
    <div className="flex flex-1 flex-col p-6">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {item.content_type && (
          <span className="inline-flex items-center rounded-full bg-brand-900 px-2.5 py-0.5 text-xs font-semibold text-white">{item.content_type}</span>
        )}
        {item.tags?.slice(0, 2).map((t) => (
          <span key={t} className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{t}</span>
        ))}
      </div>
      <h3 className="break-words font-display text-lg font-semibold leading-snug tracking-tight text-brand-900 group-hover:text-brand-600">
        {item.title || "Untitled Article"}
      </h3>
      {item.summary && <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-500">{item.summary}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
        {item.author_name && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{item.author_name}</span>}
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(item.posted_date)}</span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="flex items-center gap-1 font-mono text-xs text-slate-400"><Hash className="h-3 w-3" />{item.bnb_id}</span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Read Article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
      </div>
    </div>
  </Link>
);

export default KnowledgeCard;
