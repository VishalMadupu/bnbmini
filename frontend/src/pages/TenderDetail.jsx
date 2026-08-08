import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, CalendarClock, CalendarDays, Hash, Download, ArrowRight, ArrowLeft, Building2, IndianRupee, FileDigit, ExternalLink, Clock, Landmark } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { api, fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5">
    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  </div>
);

export default function TenderDetail() {
  const { slug } = useParams();
  const [tender, setTender] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setTender(null);
    setNotFound(false);
    api.get(`/tenders/${slug}`).then((r) => setTender(r.data)).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <Layout>
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-slate-900">Tender not found</h1>
          <Link to="/tenders"><Button className="mt-6 bg-orange-600 text-white hover:bg-orange-700">Browse all tenders</Button></Link>
        </div>
      </Layout>
    );
  }
  if (!tender) return <Layout><div className="mx-auto max-w-6xl px-4 py-24 text-slate-500">Loading...</div></Layout>;

  return (
    <Layout>
      <Seo title={`${tender.title} Tender in ${tender.city} | BitsNdBricks`} description={`${tender.title} by ${tender.organization} in ${tender.city}, ${tender.state}. ${tender.description?.slice(0, 140)}`} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/tenders" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-orange-600">
          <ArrowLeft className="h-4 w-4" /> Back to Tenders
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">{tender.title}</h1>
              <div className="flex items-center gap-2">
                {tender.verified && <VerifiedBadge />}
                {tender.is_expired ? (
                  <span data-testid="tender-status" className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">Expired</span>
                ) : (
                  <span data-testid="tender-status" className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">Open</span>
                )}
              </div>
            </div>
            {tender.original_reference && (
              <p className="mt-1 font-mono text-sm text-slate-400"># {tender.original_reference}</p>
            )}
            <p className="mt-2 flex items-center gap-2 text-lg font-medium text-slate-700">
              <Building2 className="h-5 w-5 text-slate-400" /> {tender.organization}
            </p>

            <div className="mt-8">
              <h2 className="font-display text-xl font-semibold text-slate-900">Tender Description</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">{tender.description}</p>
            </div>

            {tender.attachment && (
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold text-slate-900">Tender Documents</h2>
                <a href={fileUrl(tender.attachment.url)} target="_blank" rel="noopener noreferrer" data-testid="tender-attachment">
                  <Button variant="outline" className="mt-3 gap-2"><Download className="h-4 w-4" /> Download Tender Document</Button>
                </a>
              </div>
            )}

            {tender.contact_clarifications && (
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold text-slate-900">Contact for Clarifications</h2>
                <p className="mt-3 whitespace-pre-line text-slate-600">{tender.contact_clarifications}</p>
              </div>
            )}
          </div>

          <aside className="lg:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900">Tender Information</h2>
              <div className="mt-2 divide-y divide-slate-100">
                <InfoRow icon={MapPin} label="Location" value={`${tender.city}, ${tender.state}`} />
                {tender.authority_type && <InfoRow icon={Landmark} label="Authority Type" value={tender.authority_type} />}
                {tender.estimated_value && <InfoRow icon={IndianRupee} label="Estimated Value" value={tender.estimated_value} />}
                <InfoRow icon={CalendarDays} label="Posted Date" value={formatDate(tender.posted_date)} />
                {tender.last_date && <InfoRow icon={CalendarClock} label="Last Date for Submission" value={formatDate(tender.last_date)} />}
                <InfoRow icon={Clock} label="Status" value={tender.is_expired ? <span className="font-semibold text-red-600">Expired</span> : <span className="font-semibold text-green-700">Open</span>} />
                <InfoRow icon={Hash} label="BNB Tender ID" value={<span className="font-mono">{tender.bnb_id}</span>} />
                {tender.original_reference && <InfoRow icon={FileDigit} label="Original Tender Reference" value={tender.original_reference} />}
              </div>

              {tender.official_url && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h3 className="font-display text-base font-semibold text-slate-900">Official Tender Portal</h3>
                  <a href={tender.official_url} target="_blank" rel="noopener noreferrer" data-testid="tender-official-portal">
                    <Button className="mt-3 w-full gap-2 bg-orange-600 text-white hover:bg-orange-700 active:scale-95">
                      View / Apply on Official Portal <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              )}
            </div>
            <p className="mt-4 px-1 text-xs leading-relaxed text-slate-400">
              BitsNdBricks is a discovery platform only. Applications are not submitted through BitsNdBricks — always use the official issuing authority portal and verify all details.
            </p>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
