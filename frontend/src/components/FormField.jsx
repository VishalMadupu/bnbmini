import { Label } from "@/components/ui/label";

export const Field = ({ label, hint, required, children }) => (
  <div>
    <Label className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-brand-600"> *</span>}
    </Label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
  </div>
);

export default Field;
