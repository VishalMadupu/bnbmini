import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Briefcase, FileText } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";
import { JobCard } from "@/components/JobCard";
import { TenderCard } from "@/components/TenderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState([]);
  const [tenders, setTenders] = useState([]);

  useEffect(() => {
    api.get("/jobs", { params: { limit: 6 } }).then((r) => setJobs(r.data)).catch(() => {});
    api.get("/tenders", { params: { limit: 6 } }).then((r) => setTenders(r.data)).catch(() => {});
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(`/jobs?search=${encodeURIComponent(q)}`);
  };

  return (
    <Layout>
      <Seo
        title="BitsNdBricks — Construction Jobs & Tenders in India"
        description="Find construction jobs and tenders from across India. All construction opportunities in one place."
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-900">
        <img
          src="https://images.unsplash.com/photo-1527335988388-b40ee248d80c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"
          alt="Construction site"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Construction Opportunities.<br className="hidden sm:block" /> All in One Place.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Find construction jobs and tenders from across India.
          </p>

          <form onSubmit={search} className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                data-testid="hero-search-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search jobs, tenders, companies or locations..."
                className="h-14 rounded-lg border-0 bg-white pl-12 text-base text-slate-900 shadow-lg"
              />
            </div>
            <Button
              type="submit"
              data-testid="hero-search-button"
              className="h-14 rounded-lg bg-orange-600 px-8 text-base font-semibold text-white hover:bg-orange-700 active:scale-95"
            >
              Search
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap gap-4">
            <Button
              data-testid="hero-find-jobs"
              onClick={() => navigate("/jobs")}
              variant="secondary"
              className="gap-2 bg-white/10 text-white hover:bg-white/20"
            >
              <Briefcase className="h-4 w-4" /> Find Jobs
            </Button>
            <Button
              data-testid="hero-find-tenders"
              onClick={() => navigate("/tenders")}
              variant="secondary"
              className="gap-2 bg-white/10 text-white hover:bg-white/20"
            >
              <FileText className="h-4 w-4" /> Find Tenders
            </Button>
          </div>
        </div>
      </section>

      {/* Latest Jobs */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Latest Jobs</h2>
          <Button variant="ghost" data-testid="view-all-jobs" onClick={() => navigate("/jobs")} className="gap-1 text-orange-600 hover:text-orange-700">
            View All Jobs <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {jobs.length === 0 ? (
          <p className="mt-6 text-slate-500">No jobs published yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.slice(0, 6).map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )}
      </section>

      {/* Latest Tenders */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Latest Tenders</h2>
          <Button variant="ghost" data-testid="view-all-tenders" onClick={() => navigate("/tenders")} className="gap-1 text-orange-600 hover:text-orange-700">
            View All Tenders <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        {tenders.length === 0 ? (
          <p className="mt-6 text-slate-500">No tenders published yet.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tenders.slice(0, 6).map((t) => <TenderCard key={t.id} tender={t} />)}
          </div>
        )}
      </section>

      {/* Submission CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Have a construction job requirement or tender?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-slate-500">
            Share it with BitsNdBricks. Our team reviews the information before publishing.
          </p>
          <Button
            data-testid="cta-submit"
            onClick={() => navigate("/submit")}
            className="mt-6 bg-orange-600 px-8 text-white hover:bg-orange-700 active:scale-95"
          >
            Submit Requirement
          </Button>
        </div>
      </section>
    </Layout>
  );
}
