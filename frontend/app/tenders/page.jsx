"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Layout } from "../../src/components/Layout";
import Seo from "../../src/components/Seo";
import { TenderCard } from "../../src/components/TenderCard";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../src/components/ui/select";
import { api } from "../../src/lib/api";
import { TENDER_CATEGORIES } from "../../src/lib/constants";
function Tenders() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Shim for params.get
  const params = searchParams;
  
  const setParams = useCallback((paramsObj) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    Object.entries(paramsObj).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    });
    const search = current.toString();
    const query = search ? '?' + search : "";
    router.push(pathname + query);
  }, [searchParams, pathname, router]);
  const [search, setSearch] = useState(params.get("search") || "");
  const [state, setState] = useState(params.get("state") || "all");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState("all");
  const [meta, setMeta] = useState({ states: [], cities: [], byState: {} });
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/meta").then((r) => setMeta({
      states: r.data.tender_states, cities: r.data.tender_cities, byState: r.data.tender_cities_by_state,
    })).catch(() => {});
  }, []);

  const cityOptions = state === "all" ? meta.cities : (meta.byState[state] || []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tenders", { params: { search, state, city, category, include_expired: true } });
      setTenders(data);
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
      <Seo title="Construction Tenders in India | BitsNdBricks" description="Browse government and organization construction tenders from across India." />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900 sm:text-4xl">Construction Tenders</h1>

        <form onSubmit={onSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              data-testid="tenders-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenders, authorities or locations..."
              className="h-12 bg-white pl-11"
            />
          </div>
          <Button type="submit" data-testid="tenders-search-button" className="h-12 bg-brand-600 px-6 text-white hover:bg-brand-700">Search</Button>
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
              {TENDER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <p className="mt-6 text-sm text-slate-500">{loading ? "Loading..." : `${tenders.length} tender${tenders.length === 1 ? "" : "s"} found`}</p>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tenders.map((t) => <TenderCard key={t.id} tender={t} />)}
        </div>
        {!loading && tenders.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            No tenders match your search. Try adjusting the filters.
          </div>
        )}
      </div>
    </Layout>
  );
}

export default function TendersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <Tenders />
    </Suspense>
  );
}
