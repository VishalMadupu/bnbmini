"use client";

"use clinet"
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Layout } from "../../../src/components/Layout";
import Seo from "../../../src/components/Seo";
import { Field } from "../../../src/components/FormField";
import { FileUpload } from "../../../src/components/FileUpload";
import { Button } from "../../../src/components/ui/button";
import { Input } from "../../../src/components/ui/input";
import { Textarea } from "../../../src/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../src/components/ui/select";
import { api } from "../../../src/lib/api";
import { INDIAN_STATES, REQUIREMENT_TYPES } from "../../../src/lib/constants";
import { isValidContact } from "../../../src/lib/validate";
import { toast } from "sonner";

const empty = {
  requirement_type: "Contractor / Consultancy", title: "", organization: "", state: "", city: "",
  quantity: "", description: "", required_by: "", contact: "", attachment: null,
  submitter_name: "", submitter_contact: "", submitter_notes: "",
};

export default function WorkRequirementSubmit() {
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.contact && !isValidContact(form.contact)) { toast.error("Contact must be a 10-digit mobile number or a valid email"); return; }
    setSubmitting(true);
    try {
      await api.post("/submissions/work-requirement", { ...form, title: form.title || null, organization: form.organization || null, state: form.state || null, city: form.city || null, quantity: form.quantity || null, description: form.description || null, required_by: form.required_by || null, contact: form.contact || null, submitter_name: form.submitter_name || null, submitter_contact: form.submitter_contact || null, submitter_notes: form.submitter_notes || null });
      setDone(true); window.scrollTo(0, 0);
    } catch (err) { toast.error(err.response?.data?.detail || "Submission failed"); } finally { setSubmitting(false); }
  };

  if (done) return (
    <Layout><div className="mx-auto max-w-xl px-4 py-24 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-green-600" /><h1 className="mt-4 font-display text-2xl font-bold text-brand-900">Thank you.</h1><p className="mt-2 text-slate-600" data-testid="wr-success">Your requirement has been submitted to BitsNdBricks for review.</p><Button onClick={() => { setForm(empty); setDone(false); }} className="mt-6 bg-brand-600 text-white hover:bg-brand-700">Submit another</Button></div></Layout>
  );

  return (
    <Layout>
      <Seo title="Submit a Work Requirement | BitsNdBricks" description="Post a construction work requirement — contractor, workmen, material or machinery." />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900">Submit a Work Requirement</h1>
        <p className="mt-2 text-slate-600">Share your construction requirement with BitsNdBricks. Our team will review it before publishing. All fields are optional.</p>
        <form onSubmit={submit} className="mt-8 space-y-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-brand-900">Requirement Information</h2>
            <Field label="Requirement Type">
              <Select value={form.requirement_type} onValueChange={(v) => set("requirement_type", v)}>
                <SelectTrigger data-testid="wr-field-type"><SelectValue /></SelectTrigger>
                <SelectContent>{REQUIREMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Requirement Title"><Input data-testid="wr-field-title" placeholder="e.g. Civil Contractor Required for Residential Project" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="Company / Organization"><Input data-testid="wr-field-org" placeholder="e.g. ABC Constructions" value={form.organization} onChange={(e) => set("organization", e.target.value)} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="State"><Select value={form.state} onValueChange={(v) => set("state", v)}><SelectTrigger data-testid="wr-field-state"><SelectValue placeholder="Select state / UT" /></SelectTrigger><SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="City"><Input data-testid="wr-field-city" placeholder="e.g. Hyderabad" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
            </div>
            <Field label="Quantity"><Input data-testid="wr-field-quantity" placeholder="e.g. 20 workers, 500 MT, 2 excavators" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} /></Field>
            <Field label="Description"><Textarea data-testid="wr-field-description" rows={4} placeholder="Describe what you need, including scope, specifications or other useful details." value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Required By" hint="If no date is provided, this requirement will be archived 14 days after posting."><Input data-testid="wr-field-requiredby" type="date" value={form.required_by} onChange={(e) => set("required_by", e.target.value)} /></Field>
            <Field label="Contact for Respondents" hint="Who should respondents contact regarding this requirement?"><Input data-testid="wr-field-contact" placeholder="10-digit mobile number or email address" value={form.contact} onChange={(e) => set("contact", e.target.value)} /></Field>
            <FileUpload label="Attachment" value={form.attachment} onChange={(v) => set("attachment", v)} testid="wr-field-attachment" />
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-brand-900">Submitter Information</h2>
            <p className="text-xs text-slate-400">Kept for our reference only, not shown publicly.</p>
            <Field label="Your Name"><Input data-testid="wr-field-sname" placeholder="e.g. Rajesh Kumar" value={form.submitter_name} onChange={(e) => set("submitter_name", e.target.value)} /></Field>
            <Field label="Your Email / Contact"><Input data-testid="wr-field-scontact" placeholder="e.g. rajesh@email.com / 9876543210" value={form.submitter_contact} onChange={(e) => set("submitter_contact", e.target.value)} /></Field>
            <Field label="Other Notes"><Textarea data-testid="wr-field-snotes" rows={3} placeholder="Anything else we should know about this requirement" value={form.submitter_notes} onChange={(e) => set("submitter_notes", e.target.value)} /></Field>
          </div>
          <Button type="submit" data-testid="wr-submit-button" disabled={submitting} className="w-full bg-brand-600 py-6 text-base font-semibold text-white hover:bg-brand-700">{submitting ? "Submitting..." : "Submit Requirement"}</Button>
        </form>
      </div>
    </Layout>
  );
}
