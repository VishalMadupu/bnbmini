import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Archive, Send, XCircle, Eye, HardHat } from "lucide-react";
import Seo from "@/components/Seo";
import { FileUpload } from "@/components/FileUpload";
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
import { api } from "@/lib/api";
import { INDIAN_STATES, SOURCE_TYPES, VERIFICATION_OPTIONS, STATUS_OPTIONS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

const statusColor = {
  active: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  draft: "bg-slate-100 text-slate-700",
  archived: "bg-slate-200 text-slate-600",
  rejected: "bg-red-100 text-red-700",
};

const emptyForm = {
  title: "", organization: "", state: "", city: "", category: "", description: "",
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
      setForm({ ...emptyForm, ...editing, last_date: editing.last_date ? editing.last_date.slice(0, 10) : "" });
    } else {
      setForm(emptyForm);
    }
  }, [editing, open]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        last_date: form.last_date || null,
        category: form.category || null,
      };
      if (editing) {
        await api.put(`/admin/${kind}s/${editing.id}`, payload);
        toast.success(`${kind} updated`);
      } else {
        await api.post(`/admin/${kind}s`, payload);
        toast.success(`${kind} created`);
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error("Save failed — check required fields (title, organization, state, city, description)");
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
            <Field label={kind === "job" ? "Last date to apply" : "Last date for submission"}>
              <Input type="date" data-testid="admin-field-lastdate" value={form.last_date} onChange={(e) => set("last_date", e.target.value)} />
            </Field>
            <Field label="Category"><Input value={form.category || ""} onChange={(e) => set("category", e.target.value)} /></Field>
          </div>

          {kind === "job" ? (
            <div className="grid grid-cols-1 gap-3">
              <Field label="Applicant email"><Input value={form.applicant_email || ""} onChange={(e) => set("applicant_email", e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Applicant phone"><Input value={form.applicant_phone || ""} onChange={(e) => set("applicant_phone", e.target.value)} /></Field>
                <Field label="Applicant URL"><Input value={form.applicant_url || ""} onChange={(e) => set("applicant_url", e.target.value)} /></Field>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Estimated value"><Input placeholder="₹4.25 Crore" value={form.estimated_value || ""} onChange={(e) => set("estimated_value", e.target.value)} /></Field>
                <Field label="Original reference"><Input value={form.original_reference || ""} onChange={(e) => set("original_reference", e.target.value)} /></Field>
              </div>
              <Field label="Official tender URL"><Input value={form.official_url || ""} onChange={(e) => set("official_url", e.target.value)} /></Field>
              <Field label="Contact for clarifications"><Input value={form.contact_clarifications || ""} onChange={(e) => set("contact_clarifications", e.target.value)} /></Field>
            </div>
          )}

          <FileUpload label={kind === "job" ? "Attachment" : "Tender document"} value={form.attachment} onChange={(v) => set("attachment", v)} testid="admin-field-attachment" />

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
          <Button data-testid="admin-save-button" onClick={save} disabled={saving} className="bg-orange-600 text-white hover:bg-orange-700">
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubmitterDialog({ item, onClose }) {
  if (!item) return null;
  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-display">Submitter Information</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <div><span className="text-slate-400">Name: </span>{item.submitter_name || "—"}</div>
          <div><span className="text-slate-400">Company: </span>{item.submitter_company || "—"}</div>
          <div><span className="text-slate-400">Email: </span>{item.submitter_email || "—"}</div>
          <div><span className="text-slate-400">Phone: </span>{item.submitter_phone || "—"}</div>
          <div><span className="text-slate-400">Notes: </span>{item.submitter_notes || "—"}</div>
          <div className="border-t border-slate-100 pt-2"><span className="text-slate-400">Source type: </span>{item.source_type}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const [kind, setKind] = useState("job");
  const [statusFilter, setStatusFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitter, setSubmitter] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/${kind}s`, { params: { status: statusFilter } });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [kind, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id, body) => {
    await api.patch(`/admin/${kind}s/${id}/status`, body);
    toast.success("Updated");
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this listing permanently?")) return;
    await api.delete(`/admin/${kind}s/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Seo title="Admin — BitsNdBricks" description="Internal admin" />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900"><HardHat className="h-4 w-4 text-orange-500" /></span>
            <span className="font-display text-lg font-bold text-slate-900">BitsNdBricks Admin</span>
          </div>
          <a href="/" className="text-sm text-slate-500 hover:text-orange-600">View site →</a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={kind} onValueChange={(v) => { setKind(v); }}>
            <TabsList>
              <TabsTrigger value="job" data-testid="admin-tab-jobs">Jobs</TabsTrigger>
              <TabsTrigger value="tender" data-testid="admin-tab-tenders">Tenders</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="admin-status-filter" className="w-40 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button data-testid="admin-create-button" onClick={() => { setEditing(null); setEditorOpen(true); }} className="gap-2 bg-orange-600 text-white hover:bg-orange-700">
              <Plus className="h-4 w-4" /> Create {kind}
            </Button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">ID</th>
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
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No {kind}s found.</td></tr>
              ) : items.map((it) => (
                <tr key={it.id} data-testid={`admin-row-${it.bnb_id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{it.bnb_id}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <div className="max-w-xs truncate">{it.title}</div>
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
                      <button title="View submitter" data-testid={`admin-submitter-${it.bnb_id}`} onClick={() => setSubmitter(it)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></button>
                      <button title="Edit" data-testid={`admin-edit-${it.bnb_id}`} onClick={() => { setEditing(it); setEditorOpen(true); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                      {it.status !== "active" && (
                        <button title="Publish" data-testid={`admin-publish-${it.bnb_id}`} onClick={() => patch(it.id, { status: "active" })} className="rounded p-1.5 text-green-600 hover:bg-green-50"><Send className="h-4 w-4" /></button>
                      )}
                      {it.verification_status !== "verified" && (
                        <button title="Mark verified" data-testid={`admin-verify-${it.bnb_id}`} onClick={() => patch(it.id, { verification_status: "verified" })} className="rounded p-1.5 text-green-600 hover:bg-green-50"><CheckCircle2 className="h-4 w-4" /></button>
                      )}
                      {it.status !== "archived" && (
                        <button title="Archive" onClick={() => patch(it.id, { status: "archived" })} className="rounded p-1.5 text-slate-500 hover:bg-slate-100"><Archive className="h-4 w-4" /></button>
                      )}
                      {it.status !== "rejected" && (
                        <button title="Reject" data-testid={`admin-reject-${it.bnb_id}`} onClick={() => patch(it.id, { status: "rejected", verification_status: "rejected" })} className="rounded p-1.5 text-amber-600 hover:bg-amber-50"><XCircle className="h-4 w-4" /></button>
                      )}
                      <button title="Delete" data-testid={`admin-delete-${it.bnb_id}`} onClick={() => remove(it.id)} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Editor open={editorOpen} onClose={() => setEditorOpen(false)} kind={kind} editing={editing} onSaved={load} />
      <SubmitterDialog item={submitter} onClose={() => setSubmitter(null)} />
    </div>
  );
}
