"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { splitPDFAllPages, splitPDFByRanges, parseRanges } from "@/lib/pdf/split";
import { downloadBlob, formatBytes } from "@/lib/utils";
import { Scissors, Download } from "lucide-react";
import JSZip from "jszip";

type SplitMode = "all" | "range";

export default function SplitPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<SplitMode>("range");
  const [rangeInput, setRangeInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const file = files[0] ?? null;

  const handleSplit = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(20);
    setError(null);
    try {
      let results: { name: string; data: Uint8Array }[];

      if (mode === "all") {
        results = await splitPDFAllPages(file);
      } else {
        const { PDFDocument } = await import("pdf-lib");
        const buf = await file.arrayBuffer();
        const pdf = await PDFDocument.load(buf);
        const totalPages = pdf.getPageCount();
        const ranges = parseRanges(rangeInput, totalPages);
        if (ranges.length === 0) throw new Error("No valid page ranges provided");
        const baseName = file.name.replace(/\.pdf$/i, "");
        const labeledRanges = ranges.map((r) => ({
          ...r,
          label: `${baseName}_${r.label}`,
        }));
        results = await splitPDFByRanges(file, labeledRanges);
      }

      setProgress(80);

      if (results.length === 1) {
        downloadBlob(new Blob([results[0].data as BlobPart], { type: "application/pdf" }), results[0].name);
      } else {
        const zip = new JSZip();
        results.forEach(({ name, data }) => zip.file(name, data));
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, "split_pages.zip");
      }

      setProgress(100);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to split PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setDone(false);
    setProgress(0);
    setError(null);
  };

  return (
    <ToolLayout
      title="Split PDF"
      description="Split a PDF into multiple files by page ranges or extract every page individually."
    >
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your PDF here"
        sublabel="Upload one PDF to split"
      />

      {file && !done && (
        <>
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Split Options</h3>

            <div className="flex gap-3">
              {(["range", "all"] as SplitMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border transition-all ${
                    mode === m
                      ? "bg-[#E8372C] text-white border-[#E8372C]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                  }`}
                >
                  {m === "all" ? "Split All Pages" : "By Range"}
                </button>
              ))}
            </div>

            {mode === "range" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Page Ranges
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5, 7-10"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C] transition-colors"
                />
                <p className="text-xs text-[var(--muted-foreground)]">
                  Separate ranges with commas. Each range becomes a separate PDF.
                </p>
              </div>
            )}
          </div>

          {processing && <ProgressBar progress={progress} label="Splitting PDF..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleSplit}
            disabled={processing || (mode === "range" && !rangeInput.trim())}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <Scissors className="w-5 h-5" />
            {processing ? "Splitting..." : "Split PDF"}
          </button>
        </>
      )}

      {done && (
        <div className="p-5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 space-y-3">
          <p className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
            <Download className="w-5 h-5" /> Download started!
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Your split PDF files have been downloaded as a ZIP archive.
          </p>
          <button
            onClick={handleReset}
            className="text-sm font-medium text-green-700 dark:text-green-300 underline"
          >
            Process another file
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
