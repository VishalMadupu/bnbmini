import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";
import { Field } from "@/components/FormField";
import { FileUpload } from "@/components/FileUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { isUrl } from "@/lib/validate";
import { toast } from "sonner";

const empty = {
  title: "", summary: "", content: "", tagsText: "", source_url: "",
  cover_image: null, attachment: null, author_name: "", author_info: "", declaration: false,
};

export default function KnowledgeSubmit() {
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.declaration) { toast.error("Please confirm the declaration before submitting"); return; }
    const plain = form.content.replace(/<[^>]*>/g, "").trim();
    if (!plain) { toast.error("Please add some content before submitting"); return; }
    if (form.source_url && !isUrl(form.source_url)) { toast.error("Source URL must start with http:// or https://"); return; }
    setSubmitting(true);
    try {
      const tags = form.tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      await api.post("/submissions/knowledge", {
        title: form.title || null, summary: form.summary || null, content: form.content,
        tags, source_url: form.source_url || null, cover_image: form.cover_image,
        attachment: form.attachment, author_name: form.author_name || null,
        author_info: form.author_info || null, declaration: form.declaration,
      });
      setDone(true); window.scrollTo(0, 0);
    } catch (err) { toast.error(err.response?.data?.detail || "Submission failed"); } finally { setSubmitting(false); }
  };

  if (done) return (
    <Layout><div className="mx-auto max-w-xl px-4 py-24 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-green-600" /><h1 className="mt-4 font-display text-2xl font-bold text-brand-900">Thank you.</h1><p className="mt-2 text-slate-600" data-testid="knowledge-success">Your article has been submitted to BitsNdBricks for review. It will be published after approval.</p><Button onClick={() => { setForm(empty); setDone(false); }} className="mt-6 bg-brand-600 text-white hover:bg-brand-700">Submit another</Button></div></Layout>
  );

  return (
    <Layout>
      <Seo title="Contribute to the Knowledge Hub | BitsNdBricks" description="Share a construction article, guide or insight with the BitsNdBricks community." />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900">Contribute to the Knowledge Hub</h1>
        <p className="mt-2 text-slate-600">Share an article, guide or insight for the construction community. Our team reviews every submission before publishing.</p>

        <form onSubmit={submit} className="mt-8 space-y-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-brand-900">Article</h2>
            <Field label="Title"><Input data-testid="knowledge-field-title" placeholder="e.g. Understanding GST for Construction Contractors" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="Short Summary" hint="A one or two line preview shown on cards."><Textarea data-testid="knowledge-field-summary" rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
            <Field label="Content" hint="You can paste formatted text directly from Word or Google Docs, and add images, links and tables.">
              <RichTextEditor value={form.content} onChange={(v) => set("content", v)} testid="knowledge-editor" />
            </Field>
            <Field label="Tags" hint="Comma-separated, e.g. Regulations, GST, Contracts"><Input data-testid="knowledge-field-tags" placeholder="Regulations, Safety, Technology" value={form.tagsText} onChange={(e) => set("tagsText", e.target.value)} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FileUpload label="Cover Image (optional)" value={form.cover_image} onChange={(v) => set("cover_image", v)} testid="knowledge-field-cover" />
              <FileUpload label="Attachment (optional)" value={form.attachment} onChange={(v) => set("attachment", v)} testid="knowledge-field-attachment" />
            </div>
            <Field label="Source URL (optional)" hint="If this is based on or references an external source."><Input data-testid="knowledge-field-source" placeholder="https://example.com/article" value={form.source_url} onChange={(e) => set("source_url", e.target.value)} /></Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-brand-900">Author</h2>
            <Field label="Author Name"><Input data-testid="knowledge-field-author" placeholder="e.g. Rajesh Kumar" value={form.author_name} onChange={(e) => set("author_name", e.target.value)} /></Field>
            <Field label="About the Author"><Textarea data-testid="knowledge-field-authorinfo" rows={2} placeholder="e.g. Civil engineer with 12 years in infrastructure projects." value={form.author_info} onChange={(e) => set("author_info", e.target.value)} /></Field>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <Checkbox data-testid="knowledge-declaration" checked={form.declaration} onCheckedChange={(c) => set("declaration", !!c)} className="mt-0.5" />
            <span>I confirm this content is original or that I have the right to share it, and that it does not infringe any copyright. I understand BitsNdBricks will review it before publishing.</span>
          </label>

          <Button type="submit" data-testid="knowledge-submit-button" disabled={submitting} className="w-full bg-brand-600 py-6 text-base font-semibold text-white hover:bg-brand-700">{submitting ? "Submitting..." : "Submit Article"}</Button>
        </form>
      </div>
    </Layout>
  );
}
