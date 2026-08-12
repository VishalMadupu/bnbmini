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
import { INDIAN_STATES, COLLAR_TYPES, AUTHORITY_TYPES } from "@/lib/constants";
import { toast } from "sonner";

const Field = ({ label, hint, children }) => (
  <div>
    <Label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</Label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
  </div>
);

const empty = {
  title: "", organization: "", state: "", city: "", description: "",
  collar_type: "Not Specified", trade: "", authority_type: "",
  last_date: "", applicant_contact: "", applicant_url: "",
  estimated_value: "", original_reference: "", official_url: "", contact_clarifications: "",
  attachment: null,
  submitter_name: "", submitter_contact: "", submitter_notes: "",
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
        title: form.title || null,
        organization: form.organization || null,
        state: form.state || null,
        city: form.city || null,
        description: form.description || null,
        last_date: form.last_date || null,
        collar_type: form.collar_type || "Not Specified",
        trade: form.trade || null,
        authority_type: form.authority_type || null,
        applicant_phone: form.applicant_contact || null,
        applicant_url: form.applicant_url || null,
        estimated_value: form.estimated_value || null,
        original_reference: form.original_reference || null,
        official_url: form.official_url || null,
        contact_clarifications: form.contact_clarifications || null,
        attachment: form.attachment,
        submitter_name: form.submitter_name || null,
        submitter_email: form.submitter_contact || null,
        submitter_notes: form.submitter_notes || null,
      });
      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
          <h1 className="mt-4 font-display text-2xl font-bold text-brand-900">Thank you.</h1>
          <p className="mt-2 text-slate-600" data-testid="submit-success">
            Your requirement has been submitted to BitsNdBricks for review.
          </p>
          <Button onClick={() => { setForm(empty); setDone(false); }} className="mt-6 bg-brand-600 text-white hover:bg-brand-700">
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
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900">Submit a Construction Opportunity</h1>
        <p className="mt-2 text-slate-600">
          Have a construction job requirement or tender? Share it with BitsNdBricks. Our team will
          review the information before publishing. All fields are optional — share whatever you have.
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
                  kind === k ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-brand-900">
              {kind === "job" ? "Job Information" : "Tender Information"}
            </h2>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={kind === "job" ? "Job Title" : "Tender Title"}>
                  <Input data-testid="field-title" placeholder={kind === "job" ? "e.g. Site Electrician, 5 needed" : "e.g. Construction of Road from X to Y"} value={form.title} onChange={(e) => set("title", e.target.value)} />
                </Field>
                <Field label={kind === "job" ? "Company" : "Issuing Authority"}>
                  <Input data-testid="field-organization" placeholder={kind === "job" ? "e.g. Sri Sai Constructions" : "e.g. GHMC / South Central Railway / PWD"} value={form.organization} onChange={(e) => set("organization", e.target.value)} />
                </Field>
              </div>

              {kind === "job" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Collar Type">
                    <Select value={form.collar_type} onValueChange={(v) => set("collar_type", v)}>
                      <SelectTrigger data-testid="field-collar"><SelectValue /></SelectTrigger>
                      <SelectContent>{COLLAR_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Trade">
                    <Input data-testid="field-trade" placeholder="e.g. Civil Engineer, Electrician, Mason" value={form.trade} onChange={(e) => set("trade", e.target.value)} />
                  </Field>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Authority Type">
                    <Select value={form.authority_type} onValueChange={(v) => set("authority_type", v)}>
                      <SelectTrigger data-testid="field-authority"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{AUTHORITY_TYPES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Estimated Value">
                    <Input data-testid="field-value" placeholder="e.g. ₹42 lakh" value={form.estimated_value} onChange={(e) => set("estimated_value", e.target.value)} />
                  </Field>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="State">
                  <Select value={form.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger data-testid="field-state"><SelectValue placeholder="Select state / UT" /></SelectTrigger>
                    <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="City">
                  <Input data-testid="field-city" placeholder="e.g. Hyderabad" value={form.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
              </div>

              <Field label={kind === "job" ? "Job Description" : "Tender Description"}>
                <Textarea data-testid="field-description" rows={5} placeholder={kind === "job" ? "Describe the work, requirements, experience, salary/pay if applicable, number of people required, etc." : "Describe the scope of work, requirements and important conditions"} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </Field>

              {kind === "tender" && (
                <Field label="Original Tender Reference Number" hint="Reference number shown on the issuing authority portal">
                  <Input data-testid="field-reference" placeholder="e.g. EE/PH/2026/145" value={form.original_reference} onChange={(e) => set("original_reference", e.target.value)} />
                </Field>
              )}

              {kind === "job" ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Last Date to Apply">
                      <Input data-testid="field-lastdate" type="date" value={form.last_date} onChange={(e) => set("last_date", e.target.value)} />
                    </Field>
                    <Field label="Contact for Applicant" hint="Who should applicants contact or send their details to?">
                      <Input data-testid="field-applicant-contact" placeholder="Phone, email, WhatsApp or other contact for applicants" value={form.applicant_contact} onChange={(e) => set("applicant_contact", e.target.value)} />
                    </Field>
                  </div>
                  <Field label="Applicant URL">
                    <Input data-testid="field-applicant-url" placeholder="https://example.com/apply" value={form.applicant_url} onChange={(e) => set("applicant_url", e.target.value)} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Last Date to Apply / Submit">
                    <Input data-testid="field-lastdate" type="date" value={form.last_date} onChange={(e) => set("last_date", e.target.value)} />
                  </Field>
                  <Field label="Official Tender / Apply URL">
                    <Input data-testid="field-official-url" placeholder="https://example.gov.in/tender/..." value={form.official_url} onChange={(e) => set("official_url", e.target.value)} />
                  </Field>
                  <Field label="Contact for Clarifications">
                    <Input data-testid="field-contact" placeholder="Phone, email or contact details for tender clarifications" value={form.contact_clarifications} onChange={(e) => set("contact_clarifications", e.target.value)} />
                  </Field>
                </>
              )}

              <FileUpload label="Attachment" value={form.attachment} onChange={(v) => set("attachment", v)} testid="field-attachment" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-brand-900">Submitter Information</h2>
            <p className="mt-1 text-xs text-slate-400">Kept for our reference only, not shown publicly.</p>
            <div className="mt-4 space-y-4">
              <Field label="Your Name">
                <Input data-testid="field-submitter-name" placeholder="e.g. Rajesh Kumar" value={form.submitter_name} onChange={(e) => set("submitter_name", e.target.value)} />
              </Field>
              <Field label="Your Email / Phone">
                <Input data-testid="field-submitter-contact" placeholder="e.g. rajesh@email.com / 98765 43210" value={form.submitter_contact} onChange={(e) => set("submitter_contact", e.target.value)} />
              </Field>
              <Field label="Other Notes">
                <Textarea data-testid="field-submitter-notes" rows={3} placeholder={kind === "job" ? "Anything else we should know about this requirement" : "Anything else we should know about this tender"} value={form.submitter_notes} onChange={(e) => set("submitter_notes", e.target.value)} />
              </Field>
            </div>
          </div>

          <Button type="submit" data-testid="submit-button" disabled={submitting} className="w-full bg-brand-600 py-6 text-base font-semibold text-white hover:bg-brand-700 active:scale-95">
            {submitting ? "Submitting..." : kind === "job" ? "Submit Job Requirement" : "Submit Tender"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
