import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import Seo from "@/components/Seo";
import { Field } from "@/components/FormField";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { isEmail } from "@/lib/validate";
import { toast } from "sonner";

const empty = { full_name: "", email: "", phone: "", location: "", preferred_role: "", experience: "", resume: null, linkedin: "", other_info: "" };

export default function ResumeSubmit() {
  const [form, setForm] = useState(empty);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!agree) { toast.error("Please accept the declaration to continue"); return; }
    if (form.email && !isEmail(form.email)) { toast.error("Please enter a valid email"); return; }
    setSubmitting(true);
    try {
      await api.post("/resumes", { ...form, full_name: form.full_name || null, email: form.email || null, phone: form.phone || null, location: form.location || null, preferred_role: form.preferred_role || null, experience: form.experience || null, linkedin: form.linkedin || null, other_info: form.other_info || null, declaration: true });
      setDone(true); window.scrollTo(0, 0);
    } catch (err) { toast.error(err.response?.data?.detail || "Submission failed"); } finally { setSubmitting(false); }
  };

  if (done) return (
    <Layout><div className="mx-auto max-w-xl px-4 py-24 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-green-600" /><h1 className="mt-4 font-display text-2xl font-bold text-brand-900">Thank you.</h1><p className="mt-2 text-slate-600" data-testid="resume-success">Your resume has been submitted successfully. Your resume will remain private and may be reviewed for relevant construction-related opportunities.</p><Button onClick={() => { setForm(empty); setAgree(false); setDone(false); }} className="mt-6 bg-brand-600 text-white hover:bg-brand-700">Submit another</Button></div></Layout>
  );

  return (
    <Layout>
      <Seo title="Submit Your Resume | BitsNdBricks" description="Submit your resume privately to BitsNdBricks for relevant construction opportunities." />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900">Submit Your Resume</h1>
        <p className="mt-2 text-slate-600">Share your details for potential construction opportunities. Your resume will not be publicly displayed.</p>
        <form onSubmit={submit} className="mt-8 space-y-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <Field label="Full Name"><Input data-testid="resume-name" placeholder="e.g. Rahul Kumar" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email"><Input data-testid="resume-email" placeholder="e.g. rahul@email.com" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Contact Number"><Input data-testid="resume-phone" placeholder="e.g. +91 98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Current Location"><Input data-testid="resume-location" placeholder="e.g. Hyderabad, Telangana" value={form.location} onChange={(e) => set("location", e.target.value)} /></Field>
              <Field label="Experience"><Input data-testid="resume-experience" placeholder="e.g. 5 years" value={form.experience} onChange={(e) => set("experience", e.target.value)} /></Field>
            </div>
            <Field label="Preferred Job Role"><Input data-testid="resume-role" placeholder="e.g. Site Engineer, Quantity Surveyor, Planning Engineer" value={form.preferred_role} onChange={(e) => set("preferred_role", e.target.value)} /></Field>
            <FileUpload label="Resume / CV" value={form.resume} onChange={(v) => set("resume", v)} testid="resume-file" />
            <Field label="LinkedIn Profile"><Input data-testid="resume-linkedin" placeholder="e.g. https://linkedin.com/in/yourname" value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} /></Field>
            <Field label="Other Information"><Textarea data-testid="resume-other" rows={3} placeholder="Anything else you would like us to know." value={form.other_info} onChange={(e) => set("other_info", e.target.value)} /></Field>
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <Checkbox data-testid="resume-declaration" checked={agree} onCheckedChange={setAgree} className="mt-0.5" />
            <span>I confirm that the information and resume submitted by me is accurate. I authorize BitsNdBricks to review and share my resume/contact details with relevant recruiters or employers for suitable construction-related opportunities. <span className="mt-1 block text-xs text-slate-400">Your resume will not be publicly displayed.</span></span>
          </label>
          <Button type="submit" data-testid="resume-submit-button" disabled={submitting} className="w-full bg-brand-600 py-6 text-base font-semibold text-white hover:bg-brand-700">{submitting ? "Submitting..." : "Submit Resume"}</Button>
        </form>
      </div>
    </Layout>
  );
}
