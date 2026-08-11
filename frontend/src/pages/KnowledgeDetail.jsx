import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Hash, CalendarDays, User, Download, ExternalLink } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";
import { RichContent } from "@/components/RichContent";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { api, fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function KnowledgeDetail() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setItem(null); setNotFound(false);
    api.get(`/knowledge/${slug}`).then((r) => setItem(r.data)).catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) return <Layout><div className="mx-auto max-w-6xl px-4 py-24 text-center"><h1 className="font-display text-2xl font-bold text-brand-900">Article not found</h1><Link to="/knowledge-hub"><Button className="mt-6 bg-brand-600 text-white hover:bg-brand-700">Back to Knowledge Hub</Button></Link></div></Layout>;
  if (!item) return <Layout><div className="mx-auto max-w-6xl px-4 py-24 text-slate-500">Loading...</div></Layout>;

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: item.title, description: item.summary,
    author: item.author_name ? { "@type": "Person", name: item.author_name } : undefined,
    datePublished: item.posted_date, identifier: item.bnb_id,
  };

  return (
    <Layout>
      <Seo title={`${item.title || "Article"} | BitsNdBricks Knowledge Hub`} description={item.summary || (item.title || "")} jsonLd={jsonLd} />
      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/knowledge-hub" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="h-4 w-4" /> Back to Knowledge Hub</Link>

        {(item.content_type || item.tags?.length > 0) && (
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            {item.content_type && <span className="inline-flex items-center rounded-full bg-brand-900 px-2.5 py-0.5 text-xs font-semibold text-white">{item.content_type}</span>}
            {item.tags?.map((t) => <span key={t} className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{t}</span>)}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-start gap-x-3 gap-y-2">
          <h1 className="break-words font-display text-3xl font-bold leading-tight tracking-tight text-brand-900 sm:text-4xl">{item.title || "Untitled Article"}</h1>
          {item.verified && <VerifiedBadge />}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-slate-200 pb-6 text-sm text-slate-500">
          {item.author_name && <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" />{item.author_name}</span>}
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" />{formatDate(item.posted_date)}</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-xs"><Hash className="h-3.5 w-3.5 text-slate-400" />{item.bnb_id}</span>
        </div>

        {item.cover_image && (
          <img src={fileUrl(item.cover_image.url)} alt={item.title || "Cover"} className="mt-6 w-full rounded-lg border border-slate-200 object-cover" />
        )}

        {item.summary && <p className="mt-6 text-lg leading-relaxed text-slate-600">{item.summary}</p>}

        <div className="mt-6">
          <RichContent html={item.content} />
        </div>

        {(item.author_info || item.linkedin || item.profile_picture) && (
          <div className="mt-8 flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-5">
            {item.profile_picture && (
              <img src={fileUrl(item.profile_picture.url)} alt={item.author_name || "Author"} className="h-14 w-14 flex-shrink-0 rounded-full object-cover" />
            )}
            <div>
              <h3 className="font-display text-sm font-semibold text-brand-900">{item.author_name ? `About ${item.author_name}` : "About the author"}</h3>
              {item.author_info && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.author_info}</p>}
              {item.linkedin && (
                <a href={item.linkedin} target="_blank" rel="noopener noreferrer" data-testid="knowledge-linkedin" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                  <ExternalLink className="h-3.5 w-3.5" /> LinkedIn Profile
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {item.attachment && (
            <a href={fileUrl(item.attachment.url)} target="_blank" rel="noopener noreferrer" data-testid="knowledge-attachment">
              <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Download Attachment</Button>
            </a>
          )}
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer" data-testid="knowledge-source">
              <Button variant="outline" className="gap-2"><ExternalLink className="h-4 w-4" /> View Source</Button>
            </a>
          )}
        </div>

        <p className="mt-8 text-xs leading-relaxed text-slate-400">BitsNdBricks shares this information for general awareness. Please verify details independently before relying on them.</p>
      </article>
    </Layout>
  );
}
