import { Link } from "react-router-dom";
import { Briefcase, ClipboardList, FileUser, Building2, ArrowRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";

const options = [
  { to: "/submit/opportunity", icon: Briefcase, title: "Job or Tender", desc: "Post a construction job or tender opportunity for public listing after review." },
  { to: "/submit/work-requirement", icon: ClipboardList, title: "Work Requirement", desc: "Need a contractor, workmen, material or machinery? Post your requirement." },
  { to: "/submit/resume", icon: FileUser, title: "Submit Your Resume", desc: "Share your resume privately for relevant construction opportunities.", private: true },
  { to: "/submit/vendor", icon: Building2, title: "Vendor Registration", desc: "Register your company, services or supplies with BitsNdBricks.", private: true },
];

export default function SubmitHub() {
  return (
    <Layout>
      <Seo title="Submit to BitsNdBricks" description="Post a job, tender or work requirement, submit your resume, or register as a vendor." />
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">What would you like to submit?</h1>
        <p className="mt-2 text-slate-600">Choose an option below. No account needed.</p>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {options.map((o) => (
            <Link key={o.to} to={o.to} data-testid={`submit-option-${o.to.split("/").pop()}`} className="group flex flex-col rounded-lg border border-slate-200 bg-white p-6 transition-transform transition-shadow hover:-translate-y-1 hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-50 text-brand-600"><o.icon className="h-5 w-5" /></span>
                <h2 className="font-display text-lg font-semibold text-brand-900">{o.title}</h2>
                {o.private && <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Private</span>}
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500">{o.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
