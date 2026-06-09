"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { splitPDFAllPages, splitPDFByRanges } from "@/lib/pdf/split";
import { downloadBlob } from "@/lib/utils";
import { Scissors, Download, Plus, X, ChevronsUpDown } from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";

type SplitMode = "all" | "range";

interface Range {
  id: number;
  from: number;
  to: number;
}

let _id = 1;

export default function SplitPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<SplitMode>("range");
  const [ranges, setRanges] = useState<Range[]>([{ id: _id++, from: 1, to: 2 }]);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const file = files[0] ?? null;

  // Load page count when file changes
  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setDone(false);
    setError(null);
    if (newFiles[0]) {
      try {
        const { PDFDocument } = await import("pdf-lib");
        const buf = await newFiles[0].arrayBuffer();
        const pdf = await PDFDocument.load(buf);
        const count = pdf.getPageCount();
        setPageCount(count);
        setRanges([{ id: _id++, from: 1, to: Math.min(count, 2) }]);
      } catch {
        setPageCount(null);
      }
    } else {
      setPageCount(null);
    }
  };

  const addRange = () => {
    const last = ranges[ranges.length - 1];
    const nextFrom = last ? Math.min(last.to + 1, pageCount ?? 999) : 1;
    const nextTo = Math.min(nextFrom + 1, pageCount ?? 999);
    setRanges((prev) => [...prev, { id: _id++, from: nextFrom, to: nextTo }]);
  };

  const removeRange = (id: number) => {
    setRanges((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRange = (id: number, field: "from" | "to", value: number) => {
    setRanges((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const max = pageCount ?? 9999;
        const clamped = Math.max(1, Math.min(value, max));
        if (field === "from") return { ...r, from: clamped, to: Math.max(clamped, r.to) };
        return { ...r, to: Math.max(clamped, r.from) };
      })
    );
  };

  const handleSplit = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(20);
    setError(null);
    try {
      let results: { name: string; data: Uint8Array }[];
      const baseName = file.name.replace(/\.pdf$/i, "");

      if (mode === "all") {
        results = await splitPDFAllPages(file);
      } else {
        if (ranges.length === 0) throw new Error("Add at least one range");
        const labeledRanges = ranges.map((r) => ({
          start: r.from,
          end: r.to,
          label: `${baseName}_p${r.from}-${r.to}`,
        }));
        results = await splitPDFByRanges(file, labeledRanges);
      }

      setProgress(80);

      if (results.length === 1) {
        downloadBlob(
          new Blob([results[0].data as BlobPart], { type: "application/pdf" }),
          results[0].name
        );
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
    setPageCount(null);
    setRanges([{ id: _id++, from: 1, to: 2 }]);
  };

  const canSplit = mode === "all" || ranges.length > 0;

  return (
    <ToolLayout
      toolId="split-pdf"
      title="Split PDF"
      description="Split a PDF into multiple files by page ranges or extract every page individually."
    >
      <FileUploader
        files={files}
        onFilesChange={handleFilesChange}
        label="Drag & drop your PDF here"
        sublabel="Upload one PDF to split"
      />

      {file && !done && (
        <>
          {/* Mode toggle */}
          <div className="flex gap-3">
            {(["range", "all"] as SplitMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all",
                  mode === m
                    ? "bg-[#E8372C] text-white border-[#E8372C]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                )}
              >
                {m === "all" ? "Split All Pages" : "By Range"}
              </button>
            ))}
          </div>

          {/* Range builder */}
          {mode === "range" && (
            <div className="space-y-3">
              {ranges.map((range, idx) => (
                <div
                  key={range.id}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 overflow-hidden"
                >
                  {/* Range header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                      <ChevronsUpDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                      Range {idx + 1}
                    </div>
                    {ranges.length > 1 && (
                      <button
                        onClick={() => removeRange(range.id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--muted-foreground)] hover:text-red-500 hover:border-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* From / To inputs */}
                  <div className="flex items-stretch">
                    {/* From */}
                    <div className="flex flex-1 items-center border-r border-[var(--border)]">
                      <span className="px-4 py-3 text-sm text-[var(--muted-foreground)] font-medium border-r border-[var(--border)] whitespace-nowrap bg-[var(--muted)]/60">
                        from page
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={pageCount ?? 9999}
                        value={range.from}
                        onChange={(e) => updateRange(range.id, "from", Number(e.target.value))}
                        className="flex-1 px-3 py-3 text-sm font-semibold text-right bg-transparent text-[var(--foreground)] focus:outline-none focus:bg-[var(--muted)]/30 transition-colors"
                      />
                    </div>

                    {/* To */}
                    <div className="flex flex-1 items-center">
                      <span className="px-4 py-3 text-sm text-[var(--muted-foreground)] font-medium border-r border-[var(--border)] bg-[var(--muted)]/60">
                        to
                      </span>
                      <input
                        type="number"
                        min={range.from}
                        max={pageCount ?? 9999}
                        value={range.to}
                        onChange={(e) => updateRange(range.id, "to", Number(e.target.value))}
                        className="flex-1 px-3 py-3 text-sm font-semibold text-right bg-transparent text-[var(--foreground)] focus:outline-none focus:bg-[var(--muted)]/30 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Range button */}
              <div className="flex justify-center pt-1">
                <button
                  onClick={addRange}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 border-[#E8372C] text-[#E8372C] text-sm font-bold hover:bg-[#E8372C]/5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Range
                </button>
              </div>

              {pageCount && (
                <p className="text-xs text-[var(--muted-foreground)] text-center">
                  PDF has <span className="font-semibold">{pageCount}</span> pages · each range becomes a separate PDF
                </p>
              )}
            </div>
          )}

          {mode === "all" && (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-2">
              Every page will be extracted as an individual PDF, bundled in a ZIP.
            </p>
          )}

          {processing && <ProgressBar progress={progress} label="Splitting PDF..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleSplit}
            disabled={processing || !canSplit}
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
            Your split PDF files have been downloaded.
          </p>
          <button onClick={handleReset} className="text-sm font-medium text-green-700 dark:text-green-300 underline">
            Split another file
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
