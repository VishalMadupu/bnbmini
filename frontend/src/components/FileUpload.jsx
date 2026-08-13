"use client";

import { useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

export const FileUpload = ({ value, onChange, label = "Attachment", testid = "file-upload" }) => {
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data);
      toast.success("File uploaded");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {value ? (
        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
          <span className="flex items-center gap-2 truncate text-sm text-slate-700">
            <FileText className="h-4 w-4 text-brand-600" />
            {value.filename}
          </span>
          <button
            type="button"
            data-testid={`${testid}-remove`}
            onClick={() => onChange(null)}
            className="text-slate-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          data-testid={testid}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-4 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-600"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? "Uploading..." : "Choose file (PDF, image, doc)"}
          <input type="file" className="hidden" onChange={handle} disabled={loading} />
        </label>
      )}
    </div>
  );
};

export default FileUpload;
