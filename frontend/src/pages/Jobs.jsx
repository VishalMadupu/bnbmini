import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";
import { JobCard } from "@/components/JobCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { JOB_CATEGORIES } from "@/lib/constants";

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [state, setState] = useState(params.get("state") || "all");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [meta, setMeta] = useState({ states: [], cities: [], byState: {} });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/meta").then((r) => setMeta({
      states: r.data.job_states, cities: r.data.job_cities, byState: r.data.job_cities_by_state,
    })).catch(() => {});
  }, []);

  const cityOptions = state === "all" ? meta.cities : (meta.byState[state] || []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/jobs", { params: { search, state, city, category } });
      setJobs(data);
    } finally {
      setLoading(false);
    }
  }, [search, state, city, category]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e) => {
    e.preventDefault();
    setParams(search ? { search } : {});
    load();
  };

  return (
    <Layout>
      <Seo title="Construction Jobs in India | BitsNdBricks" description="Browse construction jobs from companies and recruiters across India." />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Construction Jobs</h1>

        <form onSubmit={onSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              data-testid="jobs-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, companies or locations..."
              className="h-12 bg-white pl-11"
            />
          </div>
          <Button type="submit" data-testid="jobs-search-button" className="h-12 bg-orange-600 px-6 text-white hover:bg-orange-700">Search</Button>
        </form>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={state} onValueChange={(v) => { setState(v); setCity("all"); }}>
            <SelectTrigger data-testid="filter-state" className="bg-white"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {meta.states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger data-testid="filter-city" className="bg-white"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cityOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="filter-category" className="bg-white"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {JOB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <p className="mt-6 text-sm text-slate-500">{loading ? "Loading..." : `${jobs.length} job${jobs.length === 1 ? "" : "s"} found`}</p>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
        {!loading && jobs.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            No jobs match your search. Try adjusting the filters.
          </div>
        )}
      </div>
    </Layout>
  );
}
