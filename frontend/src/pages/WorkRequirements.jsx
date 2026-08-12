"use client"
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";
import { WorkRequirementCard } from "@/components/WorkRequirementCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { REQUIREMENT_TYPES } from "@/lib/constants";

export default function WorkRequirements() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [type, setType] = useState("all");
  const [state, setState] = useState("all");
  const [city, setCity] = useState("all");
  const [meta, setMeta] = useState({ states: [], byState: {}, cities: [] });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/meta").then((r) => setMeta({ states: r.data.wr_states, byState: r.data.wr_cities_by_state, cities: r.data.wr_cities })).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/work-requirements", { params: { search, requirement_type: type, state, city, include_expired: true } });
      setItems(data);
    } finally { setLoading(false); }
  }, [search, type, state, city]);

  useEffect(() => { load(); }, [load]);
  const cityOptions = state === "all" ? meta.cities : (meta.byState[state] || []);

  return (
    <Layout>
      <Seo title="Construction Work Requirements in India | BitsNdBricks" description="Browse construction work requirements — contractors, workmen, material and machinery — from across India." />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">Work Requirements</h1>

        <form onSubmit={(e) => { e.preventDefault(); setParams(search ? { search } : {}); load(); }} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input data-testid="wr-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requirements, companies or locations..." className="h-12 bg-white pl-11" />
          </div>
          <Button type="submit" data-testid="wr-search-button" className="h-12 bg-brand-600 px-6 text-white hover:bg-brand-700">Search</Button>
        </form>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger data-testid="wr-filter-type" className="bg-white"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Types</SelectItem>{REQUIREMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={state} onValueChange={(v) => { setState(v); setCity("all"); }}>
            <SelectTrigger data-testid="wr-filter-state" className="bg-white"><SelectValue placeholder="State" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All States</SelectItem>{meta.states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger data-testid="wr-filter-city" className="bg-white"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Cities</SelectItem>{cityOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <p className="mt-6 text-sm text-slate-500">{loading ? "Loading..." : `${items.length} requirement${items.length === 1 ? "" : "s"} found`}</p>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => <WorkRequirementCard key={w.id} item={w} />)}
        </div>
        {!loading && items.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">No requirements match your search.</div>
        )}
      </div>
    </Layout>
  );
}
