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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { api } from "@/lib/api";
import { INDIAN_STATES, SERVICE_CATEGORIES } from "@/lib/constants";
import { isEmail } from "@/lib/validate";
import { toast } from "sonner";

const empty = {
  company_name: "", contact_person: "", email: "", phone: "", website: "",
  reg_state: "", reg_city: "", serviceable_locations: [], service_categories: [],
  service_categories_other: "", services_description: "", brochure: null,
};

export default function VendorRegister() {
  const [form, setForm] = useState(empty);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleArr = (key, val) => setForm((f) => {
    const arr = f[key];
    return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!agree) { toast.error("Please accept the declaration to continue"); return; }
    if (form.email && !isEmail(form.email)) { toast.error("Please enter a valid email"); return; }
    setSubmitting(true);
    try {
      await api.post("/vendors", { ...form, company_name: form.company_name || null, contact_person: form.contact_person || null, email: form.email || null, phone: form.phone || null, website: form.website || null, reg_state: form.reg_state || null, reg_city: form.reg_city || null, service_categories_other: form.service_categories_other || null, services_description: form.services_description || null, declaration: true });
      setDone(true); window.scrollTo(0, 0);
    } catch (err) { toast.error(err.response?.data?.detail || "Registration failed"); } finally { setSubmitting(false); }
  };

  if (done) return (
    <Layout><div className="mx-auto max-w-xl px-4 py-24 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-green-600" /><h1 className="mt-4 font-display text-2xl font-bold text-brand-900">Thank you for registering.</h1><p className="mt-2 text-slate-600" data-testid="vendor-success">Your details have been submitted successfully and will be reviewed by our team.</p></div></Layout>
  );

  return (
    <Layout>
      <Seo title="Vendor Registration | BitsNdBricks" description="Register your construction company, services or supplies with BitsNdBricks." />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-brand-900">Vendor Registration</h1>
        <p className="mt-2 text-slate-600">Register your company, services or supplies with BitsNdBricks. Your details will not be publicly displayed.</p>
        <form onSubmit={submit} className="mt-8 space-y-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-brand-900">Basic Information</h2>
            <Field label="Vendor / Company Name"><Input data-testid="vendor-company" placeholder="e.g. ABC Constructions Pvt. Ltd." value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
            <Field label="Contact Person"><Input data-testid="vendor-person" placeholder="e.g. Rajesh Kumar" value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email"><Input data-testid="vendor-email" placeholder="e.g. contact@company.com" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Contact Number"><Input data-testid="vendor-phone" placeholder="e.g. +91 98765 43210" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            </div>
            <Field label="Website"><Input data-testid="vendor-website" placeholder="e.g. https://www.example.com" value={form.website} onChange={(e) => set("website", e.target.value)} /></Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-brand-900">Location</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Registered State"><Select value={form.reg_state} onValueChange={(v) => set("reg_state", v)}><SelectTrigger data-testid="vendor-regstate"><SelectValue placeholder="Select state / UT" /></SelectTrigger><SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Registered City"><Input data-testid="vendor-regcity" placeholder="e.g. Hyderabad" value={form.reg_city} onChange={(e) => set("reg_city", e.target.value)} /></Field>
            </div>
            <Field label="Serviceable Locations" hint="Select all states/UTs where you provide your products or services.">
              <div data-testid="vendor-serviceable" className="max-h-48 overflow-y-auto rounded-md border border-slate-200 p-3">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {INDIAN_STATES.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm text-slate-600">
                      <Checkbox checked={form.serviceable_locations.includes(s)} onCheckedChange={() => toggleArr("serviceable_locations", s)} />{s}
                    </label>
                  ))}
                </div>
              </div>
            </Field>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-display text-lg font-semibold text-brand-900">Service Categories</h2>
            <Accordion type="multiple" className="w-full">
              {Object.entries(SERVICE_CATEGORIES).map(([group, items]) => {
                const count = items.filter((i) => form.service_categories.includes(i)).length;
                return (
                  <AccordionItem key={group} value={group}>
                    <AccordionTrigger className="text-sm hover:no-underline">
                      <span className="flex w-full items-center justify-between pr-2"><span className="text-left font-medium text-slate-800">{group}</span><span className="ml-2 text-xs font-semibold text-brand-600">{count}/{items.length}</span></span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {items.map((i) => (
                          <label key={i} className="flex items-center gap-2 text-sm text-slate-600">
                            <Checkbox checked={form.service_categories.includes(i)} onCheckedChange={() => toggleArr("service_categories", i)} />{i}
                          </label>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
            {form.service_categories.includes("Other") && (
              <Field label="Please specify"><Input data-testid="vendor-other" value={form.service_categories_other} onChange={(e) => set("service_categories_other", e.target.value)} /></Field>
            )}
            <Field label="Description of Services Offered"><Textarea data-testid="vendor-services" rows={3} placeholder="Briefly describe the products, services or expertise you provide." value={form.services_description} onChange={(e) => set("services_description", e.target.value)} /></Field>
            <FileUpload label="Brochure / Company Profile" value={form.brochure} onChange={(v) => set("brochure", v)} testid="vendor-brochure" />
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <Checkbox data-testid="vendor-declaration" checked={agree} onCheckedChange={setAgree} className="mt-0.5" />
            <span>I confirm that the information provided by me is accurate and authorize BitsNdBricks to review these details for relevant construction-related opportunities.</span>
          </label>
          <Button type="submit" data-testid="vendor-submit-button" disabled={submitting} className="w-full bg-brand-600 py-6 text-base font-semibold text-white hover:bg-brand-700">{submitting ? "Registering..." : "Register with BitsNdBricks"}</Button>
        </form>
      </div>
    </Layout>
  );
}
