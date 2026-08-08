import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { INDIAN_STATES } from "@/lib/constants";
import { toast } from "sonner";

const Field = ({ label, required, children }) => (
  <div>
    <Label className="mb-1.5 block text-sm font-medium text-slate-700">
      {label} {required && <span className="text-orange-600">*</span>}
    </Label>
    {children}
  </div>
);

const empty = {
  title: "", organization: "", state: "", city: "", description: "",
  last_date: "", applicant_email: "", applicant_phone: "", applicant_url: "",
  estimated_value: "", original_reference: "", official_url: "", contact_clarifications: "",
  attachment: null,
  submitter_name: "", submitter_company: "", submitter_email: "", submitter_phone: "", submitter_notes: "",
};

export default function Submit() {
  const [kind, setKind] = useState("job");
  const [form, setForm] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/submissions", {
        kind,
        title: form.title,
        organization: form.organization,
        state: form.state,
        city: form.city,
        description: form.description,
        last_date: form.last_date || null,
        applicant_email: form.applicant_email || null,
        applicant_phone: form.applicant_phone || null,
        applicant_url: form.applicant_url || null,
        estimated_value: form.estimated_value || null,
        original_reference: form.original_reference || null,
        official_url: form.official_url || null,
        contact_clarifications: form.contact_clarifications || null,
        attachment: form.attachment,
        submitter_name: form.submitter_name,
        submitter_company: form.submitter_company || null,
        submitter_email: form.submitter_email,
        submitter_phone: form.submitter_phone || null,
        submitter_notes: form.submitter_notes || null,
      });
      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      toast.error("Submission failed. Please check required fields.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
          <h1 className="mt-4 font-display text-2xl font-bold text-slate-900">Thank you.</h1>
          <p className="mt-2 text-slate-600" data-testid="submit-success">
            Your requirement has been submitted to BitsNdBricks for review.
          </p>
          <Button
            onClick={() => { setForm(empty); setDone(false); }}
            className="mt-6 bg-orange-600 text-white hover:bg-orange-700"
          >
            Submit another
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Seo title="Submit a Construction Opportunity | BitsNdBricks" description="Share a construction job or tender with BitsNdBricks for review." />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Submit a Construction Opportunity</h1>
        <p className="mt-2 text-slate-600">
          Have a construction job requirement or tender? Share it with BitsNdBricks. Our team will
          review the information before publishing.
        </p>

        <div className="mt-6">
          <Label className="mb-2 block text-sm font-medium text-slate-700">What would you like to submit?</Label>
          <div className="flex gap-2">
            {["job", "tender"].map((k) => (
              <button
                key={k}
                type="button"
                data-testid={`submit-kind-${k}`}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
                  kind === k ? "border-orange-600 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              {kind === "job" ? "Job Information" : "Tender Information"}
            </h2>
            <div className="mt-4 space-y-4">
              <Field label={kind === "job" ? "Job Title" : "Tender Title"} required>
                <Input data-testid="field-title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label={kind === "job" ? "Company / Organization" : "Issuing Authority / Organization"} required>
                <Input data-testid="field-organization" required value={form.organization} onChange={(e) => set("organization", e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="State" required>
                  <Select value={form.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger data-testid="field-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="City" required>
                  <Input data-testid="field-city" required value={form.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
              </div>

              {kind === "tender" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Estimated Tender Value">
                    <Input data-testid="field-value" placeholder="₹4.25 Crore" value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} />
                  </Field>
                  <Field label="Original Tender Reference No.">
                    <Input data-testid="field-reference" value={form.original_reference} onChange={(e) => set("original_reference", e.target.value)} />
                  </Field>
                </div>
              )}

              <Field label={kind === "job" ? "Job Description" : "Tender Description"} required>
                <Textarea data-testid="field-description" required rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </Field>

              <Field label={kind === "job" ? "Last Date to Apply" : "Last Date for Submission"} required={kind === "tender"}>
                <Input data-testid="field-lastdate" type="date" value={form.last_date} onChange={(e) => set("last_date", e.target.value)} required={kind === "tender"} />
              </Field>

              {kind === "job" ? (
                <>
                  <Field label="Applicant Contact (email)" required>
                    <Input data-testid="field-applicant-email" type="email" required value={form.applicant_email} onChange={(e) => set("applicant_email", e.target.value)} />
                  </Field>
                  <Field label="Applicant Contact Number">
                    <Input data-testid="field-applicant-phone" value={form.applicant_phone} onChange={(e) => set("applicant_phone", e.target.value)} />
                  </Field>
                  <Field label="Applicant URL">
                    <Input data-testid="field-applicant-url" placeholder="https://..." value={form.applicant_url} onChange={(e) => set("applicant_url", e.target.value)} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Official Tender URL">
                    <Input data-testid="field-official-url" placeholder="https://..." value={form.official_url} onChange={(e) => set("official_url", e.target.value)} />
                  </Field>
                  <Field label="Contact for Clarifications">
                    <Input data-testid="field-contact" value={form.contact_clarifications} onChange={(e) => set("contact_clarifications", e.target.value)} />
                  </Field>
                </>
              )}

              <FileUpload label={kind === "job" ? "Attachment" : "Tender Documents"} value={form.attachment} onChange={(v) => set("attachment", v)} testid="field-attachment" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-slate-900">Submitter Information</h2>
            <p className="mt-1 text-xs text-slate-400">For internal BitsNdBricks use only — not shown publicly.</p>
            <div className="mt-4 space-y-4">
              <Field label="Name" required>
                <Input data-testid="field-submitter-name" required value={form.submitter_name} onChange={(e) => set("submitter_name", e.target.value)} />
              </Field>
              <Field label="Company Name">
                <Input data-testid="field-submitter-company" value={form.submitter_company} onChange={(e) => set("submitter_company", e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Contact Email" required>
                  <Input data-testid="field-submitter-email" type="email" required value={form.submitter_email} onChange={(e) => set("submitter_email", e.target.value)} />
                </Field>
                <Field label="Contact Number">
                  <Input data-testid="field-submitter-phone" value={form.submitter_phone} onChange={(e) => set("submitter_phone", e.target.value)} />
                </Field>
              </div>
              <Field label="Other Notes">
                <Textarea data-testid="field-submitter-notes" rows={3} value={form.submitter_notes} onChange={(e) => set("submitter_notes", e.target.value)} />
              </Field>
            </div>
          </div>

          <Button type="submit" data-testid="submit-button" disabled={submitting} className="w-full bg-orange-600 py-6 text-base font-semibold text-white hover:bg-orange-700 active:scale-95">
            {submitting ? "Submitting..." : kind === "job" ? "Submit Job Requirement" : "Submit Tender"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
