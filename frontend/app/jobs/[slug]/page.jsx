"use client";

import { useEffect, useState } from "react";
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MapPin, CalendarClock, CalendarDays, Hash, Download, Mail, Phone, ArrowRight, ArrowLeft, Building2, Layers, Wrench } from "lucide-react";
import { Layout } from "../../../src/components/Layout";
import Seo from "../../../src/components/Seo";
import { VerifiedBadge } from "../../../src/components/VerifiedBadge";
import { Button } from "../../../src/components/ui/button";
import { api, fileUrl } from "../../../src/lib/api";
import { formatDate } from "../../../src/lib/format";

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2.5">
    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="break-words text-sm font-medium text-slate-800">{value}</div>
    </div>
  </div>
);

export default function JobDetail() {
  const { slug } = useParams();
  const [job, setJob] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setJob(null);
    setNotFound(false);
    api.get(`/jobs/${slug}`).then((r) => setJob(r.data)).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <Layout>
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-brand-900">Job not found</h1>
          <Link href="/jobs"><Button className="mt-6 bg-brand-600 text-white hover:bg-brand-700">Browse all jobs</Button></Link>
        </div>
      </Layout>
    );
  }
  if (!job) return <Layout><div className="mx-auto max-w-6xl px-4 py-24 text-slate-500">Loading...</div></Layout>;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    identifier: { "@type": "PropertyValue", name: "BitsNdBricks", value: job.bnb_id },
    hiringOrganization: { "@type": "Organization", name: job.organization },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.city, addressRegion: job.state, addressCountry: "IN" } },
    datePosted: job.posted_date,
    validThrough: job.last_date || undefined,
  };

  return (
    <Layout>
      <Seo title={`${job.title} Jobs in ${job.city} | BitsNdBricks`} description={`${job.title} at ${job.organization} in ${job.city}, ${job.state}. ${job.description?.slice(0, 140)}`} jsonLd={jsonLd} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>

        {/* Header (full width) */}
        <div className="mt-5">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            <h1 className="break-words font-display text-2xl font-bold leading-tight tracking-tight text-brand-900 sm:text-3xl">{job.title}</h1>
            {job.verified && <VerifiedBadge />}
          </div>
          <p className="mt-2 flex items-center gap-2 text-base font-medium text-slate-700 sm:text-lg">
            <Building2 className="h-5 w-5 flex-shrink-0 text-slate-400" /> <span className="break-words">{job.organization}</span>
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-8 lg:flex-row">
          {/* Main */}
          <div className="lg:w-2/3">
            <h2 className="font-display text-xl font-semibold text-brand-900">Job Description</h2>
            <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-slate-600">{job.description}</p>

            {job.attachment && (
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold text-brand-900">Attachment</h2>
                <a href={fileUrl(job.attachment.url)} target="_blank" rel="noopener noreferrer" data-testid="job-attachment">
                  <Button variant="outline" className="mt-3 gap-2"><Download className="h-4 w-4" /> Download Attachment</Button>
                </a>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:w-1/3">
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="font-display text-lg font-semibold text-brand-900">Basic Information</h2>
              <div className="mt-2 divide-y divide-slate-100">
                <InfoRow icon={MapPin} label="Location" value={`${job.city}, ${job.state}`} />
                <InfoRow icon={CalendarDays} label="Posted Date" value={formatDate(job.posted_date)} />
                {job.last_date && <InfoRow icon={CalendarClock} label="Last Date to Apply" value={formatDate(job.last_date)} />}
                {job.collar_type && job.collar_type !== "Not Specified" && <InfoRow icon={Layers} label="Collar Type" value={job.collar_type} />}
                {job.trade && <InfoRow icon={Wrench} label="Trade" value={job.trade} />}
                <InfoRow icon={Hash} label="Job ID" value={<span className="font-mono">{job.bnb_id}</span>} />
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <h3 className="font-display text-base font-semibold text-brand-900">Contact for Applicant</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Who applicants should reach out to or send their details to.</p>
                <div className="mt-3 space-y-2 break-words text-sm">
                  {job.applicant_email && (
                    <a href={`mailto:${job.applicant_email}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-600">
                      <Mail className="h-4 w-4 flex-shrink-0" /> {job.applicant_email}
                    </a>
                  )}
                  {job.applicant_phone && (
                    <a href={`tel:${job.applicant_phone}`} className="flex items-center gap-2 text-slate-600 hover:text-brand-600">
                      <Phone className="h-4 w-4 flex-shrink-0" /> {job.applicant_phone}
                    </a>
                  )}
                </div>
                {job.applicant_url && (
                  <a href={job.applicant_url} target="_blank" rel="noopener noreferrer" data-testid="job-apply-now">
                    <Button className="mt-4 w-full gap-2 bg-brand-600 py-6 text-white hover:bg-brand-700 active:scale-95">
                      Apply Now <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
            <p className="mt-4 px-1 text-xs leading-relaxed text-slate-400">
              BitsNdBricks is a discovery platform. Please verify all details directly with the employer or recruiter before applying.
            </p>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
