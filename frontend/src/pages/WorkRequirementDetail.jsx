import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, CalendarClock, CalendarDays, Hash, Download, ArrowLeft, Building2, Package, Layers, Mail, Phone } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { api, fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { isMobile } from "@/lib/validate";

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5">
    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
    <div className="min-w-0"><div className="text-xs uppercase tracking-wide text-slate-400">{label}</div><div className="break-words text-sm font-medium text-slate-800">{value}</div></div>
  </div>
);

export default function WorkRequirementDetail() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { setItem(null); setNotFound(false); api.get(`/work-requirements/${slug}`).then((r) => setItem(r.data)).catch(() => setNotFound(true)); }, [slug]);

  if (notFound) return <Layout><div className="mx-auto max-w-6xl px-4 py-24 text-center"><h1 className="font-display text-2xl font-bold text-brand-900">Requirement not found</h1><Link to="/work-requirements"><Button className="mt-6 bg-brand-600 text-white hover:bg-brand-700">Browse all requirements</Button></Link></div></Layout>;
  if (!item) return <Layout><div className="mx-auto max-w-6xl px-4 py-24 text-slate-500">Loading...</div></Layout>;

  const contactLink = item.contact ? (isMobile(item.contact) ? `tel:${item.contact}` : `mailto:${item.contact}`) : null;
  const ContactIcon = item.contact && isMobile(item.contact) ? Phone : Mail;

  return (
    <Layout>
      <Seo title={`${item.title || item.requirement_type} in ${item.city || "India"} | BitsNdBricks`} description={`${item.requirement_type} requirement${item.organization ? " by " + item.organization : ""}. ${(item.description || "").slice(0, 140)}`} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link to="/work-requirements" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Back to Work Requirements</Link>

        <div className="mt-5">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{item.requirement_type}</span>
          <div className="mt-2 flex flex-wrap items-start gap-x-3 gap-y-2">
            <h1 className="break-words font-display text-2xl font-bold leading-tight tracking-tight text-brand-900 sm:text-3xl">{item.title || item.requirement_type}</h1>
            {item.verified && <VerifiedBadge />}
          </div>
          {item.organization && <p className="mt-2 flex items-center gap-2 text-base font-medium text-slate-700 sm:text-lg"><Building2 className="h-5 w-5 flex-shrink-0 text-slate-400" /><span className="break-words">{item.organization}</span></p>}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-8 lg:flex-row">
          <div className="lg:w-2/3">
            <h2 className="font-display text-xl font-semibold text-brand-900">Description</h2>
            <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-slate-600">{item.description || "No description provided."}</p>
            {item.attachment && (
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold text-brand-900">Attachment</h2>
                <a href={fileUrl(item.attachment.url)} target="_blank" rel="noopener noreferrer" data-testid="wr-attachment"><Button variant="outline" className="mt-3 gap-2"><Download className="h-4 w-4" /> Download Attachment</Button></a>
              </div>
            )}
          </div>
          <aside className="lg:w-1/3">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-brand-900">Key Information</h2>
              <div className="mt-2 divide-y divide-slate-100">
                <InfoRow icon={Layers} label="Requirement Type" value={item.requirement_type} />
                {(item.city || item.state) && <InfoRow icon={MapPin} label="Location" value={`${item.city || ""}${item.city && item.state ? ", " : ""}${item.state || ""}`} />}
                {item.quantity && <InfoRow icon={Package} label="Quantity" value={item.quantity} />}
                <InfoRow icon={CalendarDays} label="Posted Date" value={formatDate(item.posted_date)} />
                {item.required_by && <InfoRow icon={CalendarClock} label="Required By" value={formatDate(item.required_by)} />}
                <InfoRow icon={Hash} label="Requirement ID" value={<span className="font-mono">{item.bnb_id}</span>} />
              </div>
              {item.contact && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <h3 className="font-display text-base font-semibold text-brand-900">Contact for Respondents</h3>
                  <a href={contactLink} data-testid="wr-contact" className="mt-3 flex items-center gap-2 break-words text-sm text-slate-600 hover:text-brand-600"><ContactIcon className="h-4 w-4 flex-shrink-0" />{item.contact}</a>
                </div>
              )}
            </div>
            <p className="mt-4 px-1 text-xs leading-relaxed text-slate-400">BitsNdBricks is a discovery platform. Please verify all details directly with the requirement owner before acting.</p>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
