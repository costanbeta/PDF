"use client";

import { useState } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { Plus, X } from "lucide-react";

interface RedactionRegion {
  id: string;
  topPercent: number;
  heightPercent: number;
  pages: "all" | "first" | "last";
}

export default function RedactPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [regions, setRegions] = useState<RedactionRegion[]>([
    { id: "1", topPercent: 0, heightPercent: 10, pages: "all" },
  ]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addRegion = () => {
    setRegions((r) => [
      ...r,
      { id: Date.now().toString(), topPercent: 10, heightPercent: 10, pages: "all" },
    ]);
  };

  const removeRegion = (id: string) => {
    setRegions((r) => r.filter((reg) => reg.id !== id));
  };

  const updateRegion = (id: string, field: keyof RedactionRegion, value: string | number) => {
    setRegions((r) => r.map((reg) => (reg.id === id ? { ...reg, [field]: value } : reg)));
  };

  const handleProcess = async () => {
    if (!files[0] || regions.length === 0) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const buffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(buffer);
      setProgress(30);

      const pages = pdf.getPages();

      for (let i = 0; i < pages.length; i++) {
        setProgress(30 + Math.round((i / pages.length) * 60));
        const page = pages[i];
        const { width, height } = page.getSize();

        for (const region of regions) {
          const apply =
            region.pages === "all" ||
            (region.pages === "first" && i === 0) ||
            (region.pages === "last" && i === pages.length - 1);

          if (!apply) continue;

          const y = height - (region.topPercent / 100) * height - (region.heightPercent / 100) * height;
          const rh = (region.heightPercent / 100) * height;

          page.drawRectangle({
            x: 0,
            y,
            width,
            height: rh,
            color: rgb(0, 0, 0),
            opacity: 1,
          });
        }
      }

      setProgress(95);
      const saved = await pdf.save();
      setResult(saved);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}-redacted.pdf`);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redaction failed.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setRegions([{ id: "1", topPercent: 0, heightPercent: 10, pages: "all" }]);
  };

  return (
    <ToolLayout
      title="Redact PDF"
      description="Permanently remove sensitive content from your PDF."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Drag & drop your PDF here"
          sublabel="or click to browse"
        />

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--foreground)]">Redaction Regions</p>
              <button
                onClick={addRegion}
                className="flex items-center gap-1.5 text-sm text-[#E8372C] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Region
              </button>
            </div>

            <div className="space-y-4">
              {regions.map((region, idx) => (
                <div
                  key={region.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--foreground)]">Region {idx + 1}</span>
                    {regions.length > 1 && (
                      <button
                        onClick={() => removeRegion(region.id)}
                        className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>Top offset</span>
                        <span>{region.topPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={region.topPercent}
                        onChange={(e) => updateRegion(region.id, "topPercent", Number(e.target.value))}
                        className="w-full accent-[#E8372C]"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                        <span>Height</span>
                        <span>{region.heightPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={region.heightPercent}
                        onChange={(e) => updateRegion(region.id, "heightPercent", Number(e.target.value))}
                        className="w-full accent-[#E8372C]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {(["all", "first", "last"] as const).map((p) => (
                      <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`pages-${region.id}`}
                          value={p}
                          checked={region.pages === p}
                          onChange={() => updateRegion(region.id, "pages", p)}
                          className="accent-[#E8372C]"
                        />
                        <span className="text-xs text-[var(--foreground)] capitalize">
                          {p === "all" ? "All pages" : p === "first" ? "First page" : "Last page"}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div
                    className="rounded-lg border border-[var(--border)] bg-white overflow-hidden"
                    style={{ height: 60, position: "relative" }}
                  >
                    <div className="absolute inset-0 bg-gray-100" />
                    <div
                      className="absolute left-0 right-0 bg-black"
                      style={{
                        top: `${region.topPercent}%`,
                        height: `${region.heightPercent}%`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-gray-400">Page preview</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!result && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {processing ? "Redacting…" : "Apply Redactions"}
              </button>
            )}
          </div>
        )}

        {processing && <ProgressBar progress={progress} label="Applying redactions…" />}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {result && (
          <DownloadButton
            data={result}
            filename={outputName}
            fileSize={result.length}
            onReset={handleReset}
            label="Download Redacted PDF"
          />
        )}
      </div>
    </ToolLayout>
  );
}
