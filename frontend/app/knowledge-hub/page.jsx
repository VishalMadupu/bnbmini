"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, BookOpen } from "lucide-react";
import { Layout } from "../../src/components/Layout";
import Seo from "../../src/components/Seo";
import { KnowledgeCard } from "../../src/components/KnowledgeCard";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../src/components/ui/select";
import { api } from "../../src/lib/api";

function KnowledgeHub() {
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
  const [tag, setTag] = useState("all");
  const [tags, setTags] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/meta").then((r) => setTags(r.data.knowledge_tags || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/knowledge", { params: { search, tag } });
      setItems(data);
    } finally { setLoading(false); }
  }, [search, tag]);

  useEffect(() => { load(); }, [load]);

  return (
    <Layout>
      <Seo title="Knowledge Hub — Construction Insights & Guides | BitsNdBricks" description="Articles, guides and insights for the construction industry — from regulations and best practices to technology and market trends." />
      <section className="border-b border-slate-200 bg-brand-900">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white"><BookOpen className="h-3.5 w-3.5" /> Knowledge Hub</span>
          <h1 className="mt-4 max-w-2xl font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">Insights for the construction industry</h1>
          <p className="mt-3 max-w-xl text-slate-300">Guides, regulations, best practices and trends — curated and contributed by the BitsNdBricks community.</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <form onSubmit={(e) => { e.preventDefault(); setParams(search ? { search } : {}); load(); }} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input data-testid="knowledge-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles, topics or authors..." className="h-12 bg-white pl-11" />
          </div>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger data-testid="knowledge-filter-tag" className="h-12 bg-white sm:w-52"><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Topics</SelectItem>{tags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit" data-testid="knowledge-search-button" className="h-12 bg-brand-600 px-6 text-white hover:bg-brand-700">Search</Button>
        </form>

        <p className="mt-6 text-sm text-slate-500">{loading ? "Loading..." : `${items.length} article${items.length === 1 ? "" : "s"}`}</p>
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((k) => <KnowledgeCard key={k.id} item={k} />)}
        </div>
        {!loading && items.length === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">No articles published yet.</div>
        )}
      </div>
    </Layout>
  );
}

export default function KnowledgeHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <KnowledgeHub />
    </Suspense>
  );
}
