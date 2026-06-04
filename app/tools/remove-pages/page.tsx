"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { Check } from "lucide-react";

export default function RemovePagesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setThumbnails([]);
    setSelected(new Set());
    setResult(null);
    setError(null);
    setPageCount(0);
    if (!newFiles[0]) return;
    setLoading(true);
    try {
      const buffer = await newFiles[0].arrayBuffer();
      const count = await getPDFPageCount(buffer);
      setPageCount(count);
      const thumbs: string[] = [];
      for (let i = 0; i < count; i++) {
        setProgress(Math.round((i / count) * 90));
        const t = await renderPageThumbnail(buffer, i, 160);
        thumbs.push(t);
      }
      setThumbnails(thumbs);
      setProgress(0);
    } catch {
      setError("Failed to load PDF pages.");
    } finally {
      setLoading(false);
    }
  };

  const togglePage = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleProcess = async () => {
    if (!files[0] || selected.size === 0) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const buffer = await files[0].arrayBuffer();
      const srcPdf = await PDFDocument.load(buffer);
      const newPdf = await PDFDocument.create();
      setProgress(30);

      const keepIndices: number[] = [];
      for (let i = 0; i < pageCount; i++) {
        if (!selected.has(i)) keepIndices.push(i);
      }

      if (keepIndices.length === 0) {
        throw new Error("Cannot remove all pages. At least one page must remain.");
      }

      const copiedPages = await newPdf.copyPages(srcPdf, keepIndices);
      setProgress(60);

      for (const p of copiedPages) {
        newPdf.addPage(p);
      }

      setProgress(85);
      const saved = await newPdf.save();
      setResult(saved);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}-pages-removed.pdf`);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove pages.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setThumbnails([]);
    setSelected(new Set());
    setResult(null);
    setError(null);
    setProgress(0);
    setPageCount(0);
  };

  return (
    <ToolLayout
      title="Remove Pages"
      description="Delete specific pages from your PDF document."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={handleFilesChange}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Drag & drop your PDF here"
          sublabel="or click to browse"
        />

        {loading && (
          <div className="space-y-2">
            <ProgressBar progress={progress} label="Loading pages…" />
          </div>
        )}

        {thumbnails.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--foreground)]">
                Select pages to remove ({selected.size} selected)
              </p>
              <div className="flex gap-3 text-sm">
                <button
                  onClick={() => setSelected(new Set(thumbnails.map((_, i) => i)))}
                  className="text-[#E8372C] hover:underline"
                >
                  Select all
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[var(--muted-foreground)] hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {thumbnails.map((thumb, i) => (
                <button
                  key={i}
                  onClick={() => togglePage(i)}
                  className="relative group rounded-xl overflow-hidden border-2 transition-all"
                  style={{
                    borderColor: selected.has(i) ? "#E8372C" : "var(--border)",
                  }}
                >
                  <img src={thumb} alt={`Page ${i + 1}`} className="w-full" />
                  {selected.has(i) && (
                    <div className="absolute inset-0 bg-[#E8372C]/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-[#E8372C] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-0 right-0 text-center">
                    <span className="text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {i + 1}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {!result && (
              <button
                onClick={handleProcess}
                disabled={processing || selected.size === 0}
                className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {processing
                  ? "Removing pages…"
                  : selected.size === 0
                  ? "Select pages to remove"
                  : `Remove ${selected.size} page${selected.size !== 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        )}

        {processing && <ProgressBar progress={progress} label="Removing selected pages…" />}

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
            label="Download PDF"
          />
        )}
      </div>
    </ToolLayout>
  );
}
