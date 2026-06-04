"use client";

import { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { FileMinus, Loader2, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RemovePagesPage() {
  const [files, setFiles]           = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selected, setSelected]     = useState<Set<number>>(new Set());
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [result, setResult]         = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [error, setError]           = useState<string | null>(null);

  const file = files[0] ?? null;

  useEffect(() => {
    if (!file) { setThumbnails([]); setSelected(new Set()); return; }
    let cancelled = false;
    setLoadingThumbs(true);
    setThumbnails([]);
    setSelected(new Set());

    (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const count = await getPDFPageCount(bytes);
        const thumbs: string[] = [];
        for (let i = 0; i < count; i++) {
          if (cancelled) return;
          const thumb = await renderPageThumbnail(bytes, i, 150);
          thumbs.push(thumb);
          if (!cancelled) setThumbnails([...thumbs]);
        }
        if (!cancelled) setLoadingThumbs(false);
      } catch (e) {
        if (!cancelled) {
          setLoadingThumbs(false);
          setError(e instanceof Error ? e.message : "Failed to load PDF pages.");
        }
      }
    })();

    return () => { cancelled = true; };
  }, [file]);

  const togglePage = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(thumbnails.map((_, i) => i)));
  const clearAll  = () => setSelected(new Set());

  const handleRemove = async () => {
    if (!file || selected.size === 0) return;
    setProcessing(true); setProgress(20); setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf);
      setProgress(50);

      const keepIndices = Array.from({ length: thumbnails.length }, (_, i) => i)
        .filter((i) => !selected.has(i));

      if (keepIndices.length === 0) throw new Error("You cannot remove all pages.");

      const newDoc = await PDFDocument.create();
      const pages  = await newDoc.copyPages(src, keepIndices);
      pages.forEach((p) => newDoc.addPage(p));

      setProgress(90);
      const bytes = await newDoc.save();
      setProgress(100);
      setResult(bytes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove pages.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]); setThumbnails([]); setSelected(new Set());
    setResult(null); setProgress(0); setError(null);
  };

  const pageCount = thumbnails.length;

  return (
    <ToolLayout
      title="Remove Pages"
      description="Select the pages you want to delete, then save the cleaned PDF."
    >
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your PDF here"
        sublabel="Upload one PDF to remove pages from"
      />

      {file && !result && (
        <>
          {loadingThumbs && thumbnails.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8 text-[var(--muted-foreground)]">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading page previews…</span>
            </div>
          )}

          {error && thumbnails.length === 0 && (
            <p className="text-sm text-red-500 p-3 rounded-xl bg-red-50 dark:bg-red-950/30">
              {error} — make sure the PDF is not password-protected or corrupted.
            </p>
          )}

          {thumbnails.length > 0 && (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted-foreground)]">
                  <span className="font-semibold text-[var(--foreground)]">{pageCount}</span> pages ·{" "}
                  <span className="font-semibold text-[#E8372C]">{selected.size}</span> selected to remove
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[#E8372C] hover:text-[#E8372C] transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5" /> Select all
                  </button>
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)] transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" /> Clear
                  </button>
                </div>
              </div>

              {/* Page grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {thumbnails.map((thumb, i) => {
                  const isSelected = selected.has(i);
                  return (
                    <button
                      key={i}
                      onClick={() => togglePage(i)}
                      className={cn(
                        "relative rounded-xl border-2 overflow-hidden transition-all group text-left",
                        isSelected
                          ? "border-red-500 ring-2 ring-red-500/30 scale-[0.97]"
                          : "border-[var(--border)] hover:border-[var(--muted-foreground)]/60 hover:scale-[1.02]"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-[3/4] bg-white">
                        <img
                          src={thumb}
                          alt={`Page ${i + 1}`}
                          className={cn(
                            "w-full h-full object-contain transition-opacity",
                            isSelected && "opacity-40"
                          )}
                          draggable={false}
                        />
                      </div>

                      {/* Deleted overlay */}
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                            <FileMinus className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}

                      {/* Checkbox top-right */}
                      <div className={cn(
                        "absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-red-500 border-red-500"
                          : "bg-white/80 border-gray-300 group-hover:border-[#E8372C]"
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                            <path d="M2.5 6.5L5 9l4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      {/* Page number */}
                      <div className={cn(
                        "py-1.5 text-center text-[11px] font-bold transition-colors",
                        isSelected
                          ? "bg-red-500 text-white"
                          : "bg-[var(--card)] text-[var(--muted-foreground)] border-t border-[var(--border)]"
                      )}>
                        {i + 1}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {processing && <ProgressBar progress={progress} label="Removing pages…" />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-xl bg-red-50 dark:bg-red-950/30">{error}</p>
          )}

          <button
            onClick={handleRemove}
            disabled={processing || selected.size === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <FileMinus className="w-5 h-5" />
            {processing
              ? "Removing…"
              : selected.size === 0
              ? "Select pages to remove"
              : `Remove ${selected.size} Page${selected.size > 1 ? "s" : ""}`}
          </button>
        </>
      )}

      {result && (
        <DownloadButton
          data={result}
          filename={`removed_pages_${file?.name ?? "output.pdf"}`}
          fileSize={result.length}
          onReset={handleReset}
          label="Download PDF"
        />
      )}
    </ToolLayout>
  );
}
