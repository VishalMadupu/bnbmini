import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Archive, Send, XCircle, Eye, KeyRound, LogOut, Download, LayoutDashboard, ExternalLink, ClipboardCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { isValidContact } from "@/lib/validate";
import Seo from "@/components/Seo";
import { FileUpload } from "@/components/FileUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import { RichContent } from "@/components/RichContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { api, API, fileUrl } from "@/lib/api";
import { INDIAN_STATES, SOURCE_TYPES, VERIFICATION_OPTIONS, STATUS_OPTIONS, COLLAR_TYPES, AUTHORITY_TYPES, REQUIREMENT_TYPES, CONTENT_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

const statusColor = {
  active: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  draft: "bg-slate-100 text-slate-700",
  archived: "bg-slate-200 text-slate-600",
  rejected: "bg-red-100 text-red-700",
  new: "bg-amber-100 text-amber-800",
  reviewed: "bg-green-100 text-green-800",
};

const emptyForm = {
  title: "", organization: "", state: "", city: "", category: "", description: "",
  collar_type: "Not Specified", trade: "", authority_type: "",
  requirement_type: "Contractor / Consultancy", quantity: "", contact: "",
  last_date: "", applicant_email: "", applicant_phone: "", applicant_url: "",
  estimated_value: "", original_reference: "", official_url: "", contact_clarifications: "",
  attachment: null, source_type: "BNB Research", verification_status: "no_badge", status: "active",
  submitter_name: "", submitter_company: "", submitter_email: "", submitter_phone: "", submitter_notes: "",
};

const Field = ({ label, children }) => (
  <div>
    <Label className="mb-1 block text-xs font-medium text-slate-600">{label}</Label>
    {children}
  </div>
);

function Editor({ open, onClose, kind, editing, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (editing) {
      const dateVal = editing.last_date || editing.required_by;
      setForm({ ...emptyForm, ...editing, last_date: dateVal ? dateVal.slice(0, 10) : "" });
    } else {
      setForm(emptyForm);
    }
  }, [editing, open]);

  const save = async () => {
    if (kind === "workrequirement" && form.contact && !isValidContact(form.contact)) {
      toast.error("Contact must be a 10-digit mobile number or a valid email");
      return;
    }
    setSaving(true);
    try {
      const path = kind === "workrequirement" ? "work-requirements" : `${kind}s`;
      const payload = {
        ...form,
        last_date: form.last_date || null,
        required_by: form.last_date || null,
        contact: form.contact || null,
        quantity: form.quantity || null,
        category: form.category || null,
      };
      if (editing) {
        await api.put(`/admin/${path}/${editing.id}`, payload);
        toast.success("Updated");
      } else {
        await api.post(`/admin/${path}`, payload);
        toast.success("Created");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed — check the fields and try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display capitalize">{editing ? `Edit ${kind}` : `Create ${kind}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Title *"><Input data-testid="admin-field-title" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Organization *"><Input data-testid="admin-field-org" value={form.organization} onChange={(e) => set("organization", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="State *">
              <Select value={form.state} onValueChange={(v) => set("state", v)}>
                <SelectTrigger data-testid="admin-field-state"><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="City *"><Input data-testid="admin-field-city" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          </div>
          <Field label="Description *"><Textarea data-testid="admin-field-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={kind === "workrequirement" ? "Required by" : kind === "job" ? "Last date to apply" : "Last date for submission"}>
              <Input type="date" data-testid="admin-field-lastdate" value={form.last_date} onChange={(e) => set("last_date", e.target.value)} />
            </Field>
            <Field label="Category"><Input value={form.category || ""} onChange={(e) => set("category", e.target.value)} /></Field>
          </div>

          {kind === "workrequirement" ? (
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Requirement type">
                  <Select value={form.requirement_type} onValueChange={(v) => set("requirement_type", v)}>
                    <SelectTrigger data-testid="admin-field-reqtype"><SelectValue /></SelectTrigger>
                    <SelectContent>{REQUIREMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Quantity"><Input placeholder="e.g. 20 workers" value={form.quantity || ""} onChange={(e) => set("quantity", e.target.value)} /></Field>
              </div>
              <Field label="Contact for Respondents"><Input data-testid="admin-field-contact" placeholder="10-digit mobile or email" value={form.contact || ""} onChange={(e) => set("contact", e.target.value)} /></Field>
            </div>
          ) : kind === "job" ? (
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Collar type">
                  <Select value={form.collar_type} onValueChange={(v) => set("collar_type", v)}>
                    <SelectTrigger data-testid="admin-field-collar"><SelectValue /></SelectTrigger>
                    <SelectContent>{COLLAR_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Trade"><Input placeholder="e.g. Electrician, Mason" value={form.trade || ""} onChange={(e) => set("trade", e.target.value)} /></Field>
              </div>
              <Field label="Applicant email"><Input value={form.applicant_email || ""} onChange={(e) => set("applicant_email", e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Applicant phone"><Input value={form.applicant_phone || ""} onChange={(e) => set("applicant_phone", e.target.value)} /></Field>
                <Field label="Applicant URL"><Input value={form.applicant_url || ""} onChange={(e) => set("applicant_url", e.target.value)} /></Field>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Authority type">
                  <Select value={form.authority_type || ""} onValueChange={(v) => set("authority_type", v)}>
                    <SelectTrigger data-testid="admin-field-authority"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{AUTHORITY_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Estimated value"><Input placeholder="₹4.25 Crore" value={form.estimated_value || ""} onChange={(e) => set("estimated_value", e.target.value)} /></Field>
              </div>
              <Field label="Original reference"><Input value={form.original_reference || ""} onChange={(e) => set("original_reference", e.target.value)} /></Field>
              <Field label="Official tender URL"><Input value={form.official_url || ""} onChange={(e) => set("official_url", e.target.value)} /></Field>
              <Field label="Contact for clarifications"><Input value={form.contact_clarifications || ""} onChange={(e) => set("contact_clarifications", e.target.value)} /></Field>
            </div>
          )}

          <FileUpload label={kind === "tender" ? "Tender document" : "Attachment"} value={form.attachment} onChange={(v) => set("attachment", v)} testid="admin-field-attachment" />

          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
            <Field label="Source type">
              <Select value={form.source_type} onValueChange={(v) => set("source_type", v)}>
                <SelectTrigger data-testid="admin-field-source"><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Verification">
              <Select value={form.verification_status} onValueChange={(v) => set("verification_status", v)}>
                <SelectTrigger data-testid="admin-field-verification"><SelectValue /></SelectTrigger>
                <SelectContent>{VERIFICATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger data-testid="admin-field-status"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button data-testid="admin-save-button" onClick={save} disabled={saving} className="bg-brand-600 text-white hover:bg-brand-700">
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KnowledgeEditor({ open, onClose, editing, onSaved }) {
  const kEmpty = {
    content_type: "Article", title: "", summary: "", content: "", tagsText: "", source_url: "",
    cover_image: null, attachment: null, author_name: "", author_info: "",
    linkedin: "", profile_picture: null, author_contact: "",
    source_type: "BNB Research", verification_status: "no_badge", status: "active",
  };
  const [form, setForm] = useState(kEmpty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (editing) {
      setForm({ ...kEmpty, ...editing, tagsText: (editing.tags || []).join(", ") });
    } else {
      setForm(kEmpty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open]);

  const save = async () => {
    setSaving(true);
    try {
      const tags = form.tagsText.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        content_type: form.content_type, title: form.title || null, summary: form.summary || null, content: form.content || null,
        tags, source_url: form.source_url || null, cover_image: form.cover_image,
        attachment: form.attachment, author_name: form.author_name || null,
        author_info: form.author_info || null, linkedin: form.linkedin || null,
        profile_picture: form.profile_picture, author_contact: form.author_contact || null,
        source_type: form.source_type,
        verification_status: form.verification_status, status: form.status, declaration: true,
      };
      if (editing) {
        await api.put(`/admin/knowledge/${editing.id}`, payload);
        toast.success("Updated");
      } else {
        await api.post("/admin/knowledge", payload);
        toast.success("Created");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">{editing ? "Edit article" : "Create article"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Content Type">
              <Select value={form.content_type} onValueChange={(v) => set("content_type", v)}>
                <SelectTrigger data-testid="kadmin-field-contenttype"><SelectValue /></SelectTrigger>
                <SelectContent>{CONTENT_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Tags (comma-separated)"><Input data-testid="kadmin-field-tags" placeholder="Regulations, Safety" value={form.tagsText} onChange={(e) => set("tagsText", e.target.value)} /></Field>
          </div>
          <Field label="Title"><Input data-testid="kadmin-field-title" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Summary"><Textarea data-testid="kadmin-field-summary" rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} /></Field>
          <Field label="Content"><RichTextEditor value={form.content} onChange={(v) => set("content", v)} testid="kadmin-editor" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <FileUpload label="Cover image" value={form.cover_image} onChange={(v) => set("cover_image", v)} testid="kadmin-field-cover" />
            <FileUpload label="Attachment" value={form.attachment} onChange={(v) => set("attachment", v)} testid="kadmin-field-attachment" />
          </div>
          <Field label="Source URL"><Input data-testid="kadmin-field-source" value={form.source_url} onChange={(e) => set("source_url", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Author name"><Input value={form.author_name} onChange={(e) => set("author_name", e.target.value)} /></Field>
            <Field label="LinkedIn"><Input data-testid="kadmin-field-linkedin" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} /></Field>
          </div>
          <Field label="Author info"><Input value={form.author_info} onChange={(e) => set("author_info", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Author contact (private)"><Input data-testid="kadmin-field-contact" value={form.author_contact} onChange={(e) => set("author_contact", e.target.value)} /></Field>
            <FileUpload label="Profile picture" value={form.profile_picture} onChange={(v) => set("profile_picture", v)} testid="kadmin-field-profilepic" />
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
            <Field label="Source type">
              <Select value={form.source_type} onValueChange={(v) => set("source_type", v)}>
                <SelectTrigger data-testid="kadmin-field-sourcetype"><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Verification">
              <Select value={form.verification_status} onValueChange={(v) => set("verification_status", v)}>
                <SelectTrigger data-testid="kadmin-field-verification"><SelectValue /></SelectTrigger>
                <SelectContent>{VERIFICATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger data-testid="kadmin-field-status"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button data-testid="kadmin-save-button" onClick={save} disabled={saving} className="bg-brand-600 text-white hover:bg-brand-700">{saving ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const RECORD_FILE_KEYS = ["attachment", "resume", "brochure", "cover_image", "profile_picture"];
const RECORD_HIDE = ["_id", "id", "_type", "slug", "content", "declaration"];
const humanize = (k) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmtVal = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
};

function FullRecordDialog({ item, onClose }) {
  if (!item) return null;
  const isKnowledge = item.record_type === "Knowledge Hub" || item._type === "knowledge";
  const entries = Object.entries(item).filter(
    ([k, v]) => !RECORD_HIDE.includes(k) && !RECORD_FILE_KEYS.includes(k) && !(v && typeof v === "object" && !Array.isArray(v))
  );
  const files = RECORD_FILE_KEYS.filter((k) => item[k]);
  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" data-testid="admin-full-record">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 font-display">
            <span className="font-mono text-base text-brand-600">{item.bnb_id}</span>
            {item.record_type && <Badge className="bg-brand-900 text-white">{item.record_type}</Badge>}
            {item.status && <Badge className={`${statusColor[item.status] || "bg-slate-100"} capitalize`}>{item.status}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {entries.map(([k, v]) => (
            <div key={k} className="break-words border-b border-slate-100 py-1.5">
              <span className="text-xs uppercase tracking-wide text-slate-400">{humanize(k)}</span>
              <div className="text-slate-800">{fmtVal(v)}</div>
            </div>
          ))}
        </div>

        {isKnowledge && item.content && (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h4 className="mb-2 font-display text-sm font-semibold text-brand-900">Full Content</h4>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <RichContent html={item.content} />
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            {files.map((k) => (
              <a key={k} href={fileUrl(item[k].url)} target="_blank" rel="noopener noreferrer" data-testid={`record-file-${k}`}>
                <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> {humanize(k)} ({item[k].filename})</Button>
              </a>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const PUBLIC_MODS = [
  { key: "jobs", label: "Jobs", kind: "job" },
  { key: "tenders", label: "Tenders", kind: "tender" },
  { key: "work-requirements", label: "Work Requirements", kind: "workrequirement" },
  { key: "knowledge", label: "Knowledge Hub", kind: "knowledge" },
];
const PRIVATE_MODS = [
  { key: "resumes", label: "Resumes", kind: "resume" },
  { key: "vendors", label: "Vendors", kind: "vendor" },
];

function StatTile({ value, label, onClick, accent }) {
  return (
    <button type="button" onClick={onClick} data-testid={`stat-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
      className="flex flex-col items-start rounded-md border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50">
      <span className={`text-xl font-bold ${accent || "text-brand-900"}`}>{value ?? 0}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </button>
  );
}

function DashboardPanel({ stats, onJump }) {
  if (!stats) return <p className="mt-6 text-sm text-slate-400">Loading dashboard...</p>;
  return (
    <div className="mt-6 space-y-8" data-testid="admin-dashboard-panel">
      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-brand-900">Public Content</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PUBLIC_MODS.map((m) => {
            const s = stats.public?.[m.key] || {};
            return (
              <div key={m.key} className="rounded-lg border border-slate-200 bg-white p-5" data-testid={`dashboard-card-${m.key}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold text-brand-900">{m.label}</h3>
                  <button onClick={() => onJump(m.kind, "all")} className="text-xs font-semibold text-brand-600 hover:text-brand-700">View all ({s.total ?? 0}) →</button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  <StatTile value={s.pending} label="Pending" accent="text-amber-600" onClick={() => onJump(m.kind, "pending")} />
                  <StatTile value={s.published} label="Published" accent="text-green-600" onClick={() => onJump(m.kind, "active")} />
                  <StatTile value={s.archived} label="Archived" accent="text-slate-500" onClick={() => onJump(m.kind, "archived")} />
                  <StatTile value={s.bnb_created} label="BNB Created" onClick={() => onJump(m.kind, "all")} />
                  <StatTile value={s.public_submissions} label="Public Submissions" onClick={() => onJump(m.kind, "all")} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-brand-900">Private Submissions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PRIVATE_MODS.map((m) => {
            const s = stats.private?.[m.key] || {};
            return (
              <div key={m.key} className="rounded-lg border border-slate-200 bg-white p-5" data-testid={`dashboard-card-${m.key}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display font-semibold text-brand-900">{m.label}</h3>
                  <button onClick={() => onJump(m.kind, "all")} className="text-xs font-semibold text-brand-600 hover:text-brand-700">View all ({s.total ?? 0}) →</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile value={s.new_pending} label="New/Pending" accent="text-amber-600" onClick={() => onJump(m.kind, "all")} />
                  <StatTile value={s.reviewed} label="Reviewed" accent="text-green-600" onClick={() => onJump(m.kind, "all")} />
                  <StatTile value={s.archived} label="Archived" accent="text-slate-500" onClick={() => onJump(m.kind, "all")} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/admin/login", { password });
      localStorage.setItem("bnb_admin_token", data.token);
      onLogin(data.token);
    } catch (err) {
      toast.error("Incorrect password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center"><BrandLogo className="h-8 w-8" /></span>
          <span className="font-display text-lg font-bold text-brand-900">BitsNdBricks Admin</span>
        </div>
        <p className="mt-4 text-sm text-slate-500">Enter the admin password to continue.</p>
        <div className="mt-4">
          <Label className="mb-1.5 block text-sm font-medium text-slate-700">Password</Label>
          <Input data-testid="admin-login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoFocus />
        </div>
        <Button data-testid="admin-login-button" type="submit" disabled={loading} className="mt-5 w-full gap-2 bg-brand-600 text-white hover:bg-brand-700">
          <KeyRound className="h-4 w-4" /> {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem("bnb_admin_token"));
  const [kind, setKind] = useState("dashboard");
  const [statusFilter, setStatusFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [kEditorOpen, setKEditorOpen] = useState(false);
  const [kEditing, setKEditing] = useState(null);

  const openCreate = () => {
    if (kind === "knowledge") { setKEditing(null); setKEditorOpen(true); }
    else { setEditing(null); setEditorOpen(true); }
  };
  const openEdit = (it) => {
    if (it._type === "knowledge") { setKEditing(it); setKEditorOpen(true); }
    else { setEditing(it); setEditorOpen(true); }
  };

  const kindPath = (k) => (k === "workrequirement" ? "work-requirements" : k === "knowledge" ? "knowledge" : `${k}s`);
  const isPrivate = kind === "resume" || kind === "vendor";

  const logout = () => {
    localStorage.removeItem("bnb_admin_token");
    setToken(null);
  };

  const doExport = async () => {
    try {
      const token2 = localStorage.getItem("bnb_admin_token");
      const params = new URLSearchParams();
      if (!isPrivate && kind !== "inbox" && statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`${API}/admin/export/${kindPath(kind === "inbox" ? "job" : kind)}?${params}`, { headers: { Authorization: `Bearer ${token2}` } });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bnb-${kindPath(kind)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const load = useCallback(async () => {
    if (kind === "dashboard") { setLoading(false); return; }
    setLoading(true);
    try {
      if (kind === "inbox") {
        const [j, t, w] = await Promise.all([
          api.get(`/admin/jobs`, { params: { status: "pending" } }),
          api.get(`/admin/tenders`, { params: { status: "pending" } }),
          api.get(`/admin/work-requirements`, { params: { status: "pending" } }),
        ]);
        const merged = [
          ...j.data.map((x) => ({ ...x, _type: "job" })),
          ...t.data.map((x) => ({ ...x, _type: "tender" })),
          ...w.data.map((x) => ({ ...x, _type: "workrequirement" })),
        ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        setItems(merged);
      } else {
        const params = kind === "resume" || kind === "vendor" ? {} : { status: statusFilter };
        const { data } = await api.get(`/admin/${kindPath(kind)}`, { params });
        setItems(data.map((x) => ({ ...x, _type: kind })));
      }
    } catch (err) {
      if (err.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  }, [kind, statusFilter]);

  useEffect(() => { if (token) load(); }, [load, token]);

  const refreshCounts = useCallback(async () => {
    try {
      const [j, t, w] = await Promise.all([
        api.get("/admin/jobs", { params: { status: "pending" } }),
        api.get("/admin/tenders", { params: { status: "pending" } }),
        api.get("/admin/work-requirements", { params: { status: "pending" } }),
      ]);
      setPendingCount(j.data.length + t.data.length + w.data.length);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => { if (token) refreshCounts(); }, [token, refreshCounts]);

  const loadStats = useCallback(async () => {
    try { const { data } = await api.get("/admin/stats"); setStats(data); } catch (e) { /* ignore */ }
  }, []);
  useEffect(() => { if (token) loadStats(); }, [token, kind, loadStats]);

  if (!token) return <AdminLogin onLogin={setToken} />;

  const patch = async (id, body, rowKind) => {
    await api.patch(`/admin/${kindPath(rowKind || kind)}/${id}/status`, body);
    toast.success("Updated");
    load();
    refreshCounts();
    loadStats();
  };

  const patchPrivate = async (id, status) => {
    await api.patch(`/admin/${kindPath(kind)}/${id}/status`, { status });
    toast.success("Updated");
    load();
    loadStats();
  };

  const jump = (k, status) => { setKind(k); setStatusFilter(status || "all"); clearSel(); };

  const remove = async (id, rowKind) => {
    if (!window.confirm("Delete this record permanently?")) return;
    await api.delete(`/admin/${kindPath(rowKind || kind)}/${id}`);
    toast.success("Deleted");
    load();
    refreshCounts();
    loadStats();
  };

  const toggleSel = (id) => setSelected((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const clearSel = () => setSelected(new Set());
  const bulkAction = async (body) => {
    const chosen = items.filter((x) => selected.has(x.id));
    await Promise.all(chosen.map((x) => api.patch(`/admin/${kindPath(x._type)}/${x.id}/status`, body)));
    toast.success(`Updated ${chosen.length} item(s)`);
    clearSel();
    load();
    refreshCounts();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Seo title="Admin — BitsNdBricks" description="Internal admin" />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center"><BrandLogo className="h-8 w-8" /></span>
            <span className="font-display text-lg font-bold text-brand-900">BitsNdBricks Admin</span>
          </div>
          <div className="flex items-center gap-4">
            {pendingCount > 0 && (
              <button data-testid="admin-pending-badge" onClick={() => { setKind("inbox"); clearSel(); }} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200">
                {pendingCount} pending
              </button>
            )}
            <a href="/" className="text-sm text-slate-500 hover:text-brand-600">View site →</a>
            <button data-testid="admin-logout" onClick={logout} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={kind} onValueChange={(v) => { setKind(v); clearSel(); }}>
            <TabsList>
              <TabsTrigger value="dashboard" data-testid="admin-tab-dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="job" data-testid="admin-tab-jobs">Jobs</TabsTrigger>
              <TabsTrigger value="tender" data-testid="admin-tab-tenders">Tenders</TabsTrigger>
              <TabsTrigger value="workrequirement" data-testid="admin-tab-wr">Work Req.</TabsTrigger>
              <TabsTrigger value="knowledge" data-testid="admin-tab-knowledge">Knowledge</TabsTrigger>
              <TabsTrigger value="inbox" data-testid="admin-tab-inbox">Inbox{kind === "inbox" && items.length ? ` (${items.length})` : ""}</TabsTrigger>
              <TabsTrigger value="resume" data-testid="admin-tab-resumes">Resumes</TabsTrigger>
              <TabsTrigger value="vendor" data-testid="admin-tab-vendors">Vendors</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-3">
            {kind !== "dashboard" && !isPrivate && kind !== "inbox" && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="admin-status-filter" className="w-40 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {kind !== "dashboard" && (
              <Button variant="outline" data-testid="admin-export-button" onClick={doExport} className="gap-2">
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            )}
            {!isPrivate && kind !== "inbox" && (
              <Button data-testid="admin-create-button" onClick={openCreate} className="gap-2 bg-brand-600 text-white hover:bg-brand-700">
                <Plus className="h-4 w-4" /> Create
              </Button>
            )}
          </div>
        </div>

        {kind === "inbox" && (
          <p className="mt-4 text-sm text-slate-500">Public submissions awaiting review (Jobs, Tenders & Work Requirements). Approve (publish), verify, or reject each one.</p>
        )}
        {isPrivate && (
          <p className="mt-4 text-sm text-slate-500">Private {kind === "resume" ? "resume" : "vendor"} submissions — not shown publicly.</p>
        )}

        {kind === "dashboard" ? (
          <DashboardPanel stats={stats} onJump={jump} />
        ) : isPrivate ? (
          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">{kind === "resume" ? "Name" : "Company"}</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Contact</th>
                  <th className="px-4 py-3 hidden lg:table-cell">{kind === "resume" ? "Role" : "Reg. State"}</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No {kind === "resume" ? "resumes" : "vendors"} yet.</td></tr>
                ) : items.map((it) => (
                  <tr key={it.id} data-testid={`admin-row-${it.bnb_id}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{it.bnb_id}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{kind === "resume" ? it.full_name : it.company_name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-500">{it.email || it.phone || "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-500">{kind === "resume" ? (it.preferred_role || "—") : (it.reg_state || "—")}</td>
                    <td className="px-4 py-3"><Badge className={`${statusColor[it.status] || "bg-slate-100 text-slate-700"} capitalize`}>{it.status || "new"}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button title="View full record" data-testid={`admin-view-${it.bnb_id}`} onClick={() => setDetail(it)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></button>
                        {it.status !== "reviewed" && (
                          <button title="Mark reviewed" data-testid={`admin-reviewed-${it.bnb_id}`} onClick={() => patchPrivate(it.id, "reviewed")} className="rounded p-1.5 text-green-600 hover:bg-green-50"><ClipboardCheck className="h-4 w-4" /></button>
                        )}
                        {it.status !== "archived" && (
                          <button title="Archive" data-testid={`admin-archive-${it.bnb_id}`} onClick={() => patchPrivate(it.id, "archived")} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Archive className="h-4 w-4" /></button>
                        )}
                        <button title="Delete" data-testid={`admin-delete-${it.bnb_id}`} onClick={() => remove(it.id, kind)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
        <div>
        {kind === "inbox" && selected.size > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
            <span className="text-sm font-medium text-slate-700">{selected.size} selected</span>
            <Button size="sm" data-testid="bulk-approve" onClick={() => bulkAction({ status: "active" })} className="gap-1 bg-green-600 text-white hover:bg-green-700"><Send className="h-4 w-4" /> Approve &amp; publish</Button>
            <Button size="sm" variant="outline" data-testid="bulk-reject" onClick={() => bulkAction({ status: "rejected", verification_status: "rejected" })} className="gap-1 text-amber-700"><XCircle className="h-4 w-4" /> Reject</Button>
            <button onClick={clearSel} className="text-sm text-slate-500 hover:text-slate-700">Clear</button>
          </div>
        )}

        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {kind === "inbox" && <th className="px-4 py-3"><Checkbox data-testid="bulk-select-all" checked={items.length > 0 && selected.size === items.length} onCheckedChange={(c) => setSelected(c ? new Set(items.map((i) => i.id)) : new Set())} /></th>}
                <th className="px-4 py-3">ID</th>
                {kind === "inbox" && <th className="px-4 py-3">Type</th>}
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3 hidden md:table-cell">Location</th>
                <th className="px-4 py-3 hidden lg:table-cell">Last date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={kind === "inbox" ? 9 : 7} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={kind === "inbox" ? 9 : 7} className="px-4 py-10 text-center text-slate-400">{kind === "inbox" ? "No pending submissions to review." : `No ${kind}s found.`}</td></tr>
              ) : items.map((it) => (
                <tr key={it.id} data-testid={`admin-row-${it.bnb_id}`} className="hover:bg-slate-50">
                  {kind === "inbox" && <td className="px-4 py-3"><Checkbox data-testid={`bulk-select-${it.bnb_id}`} checked={selected.has(it.id)} onCheckedChange={() => toggleSel(it.id)} /></td>}
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{it.bnb_id}</td>
                  {kind === "inbox" && <td className="px-4 py-3"><Badge className="bg-slate-100 capitalize text-slate-700">{it._type}</Badge></td>}
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div className="max-w-xs truncate">{it.title || <span className="italic text-slate-400">(untitled)</span>}</div>
                    <div className="text-xs text-slate-400">{it.organization}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">{it.city}, {it.state}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500">{formatDate(it.last_date) || "—"}</td>
                  <td className="px-4 py-3"><Badge className={`${statusColor[it.status]} capitalize`}>{it.status}</Badge></td>
                  <td className="px-4 py-3">
                    {it.verification_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
                    ) : it.verification_status === "rejected" ? (
                      <span className="text-xs text-red-600">Rejected</span>
                    ) : <span className="text-xs text-slate-400">No badge</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button title="View full record" data-testid={`admin-submitter-${it.bnb_id}`} onClick={() => setDetail(it)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></button>
                      <button title="Edit" data-testid={`admin-edit-${it.bnb_id}`} onClick={() => openEdit(it)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                      {it.status !== "active" && (
                        <button title="Approve & publish" data-testid={`admin-publish-${it.bnb_id}`} onClick={() => patch(it.id, { status: "active" }, it._type)} className="rounded p-1.5 text-green-600 hover:bg-green-50"><Send className="h-4 w-4" /></button>
                      )}
                      {it.verification_status !== "verified" && (
                        <button title="Mark verified" data-testid={`admin-verify-${it.bnb_id}`} onClick={() => patch(it.id, { verification_status: "verified" }, it._type)} className="rounded p-1.5 text-green-600 hover:bg-green-50"><CheckCircle2 className="h-4 w-4" /></button>
                      )}
                      {it.status !== "archived" && (
                        <button title="Archive" onClick={() => patch(it.id, { status: "archived" }, it._type)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Archive className="h-4 w-4" /></button>
                      )}
                      {it.status !== "rejected" && (
                        <button title="Reject" data-testid={`admin-reject-${it.bnb_id}`} onClick={() => patch(it.id, { status: "rejected", verification_status: "rejected" }, it._type)} className="rounded p-1.5 text-amber-600 hover:bg-amber-50"><XCircle className="h-4 w-4" /></button>
                      )}
                      <button title="Delete" data-testid={`admin-delete-${it.bnb_id}`} onClick={() => remove(it.id, it._type)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
        )}
      </div>

      <FullRecordDialog item={detail} onClose={() => setDetail(null)} />

      <Editor open={editorOpen} onClose={() => setEditorOpen(false)} kind={kind === "inbox" ? (editing?._type || "job") : kind} editing={editing} onSaved={load} />
      <KnowledgeEditor open={kEditorOpen} onClose={() => setKEditorOpen(false)} editing={kEditing} onSaved={load} />
    </div>
  );
}
