"use client";

import { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { rotatePDF } from "@/lib/pdf/rotate";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { RotateCw, RotateCcw, Loader2, FileText, AlertCircle, Shield } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";

export default function RotatePDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const file = files[0] ?? null;

  useEffect(() => {
    if (!file) {
      setThumbnails([]);
      setRotations({});
      return;
    }

    let cancelled = false;
    setLoadingThumbs(true);
    setThumbnails([]);
    setError(null);

    file.arrayBuffer().then(async (buf) => {
      try {
        const bytes = new Uint8Array(buf);
        const count = await getPDFPageCount(bytes);
        const thumbs: string[] = [];
        for (let i = 0; i < count; i++) {
          if (cancelled) return;
          const thumb = await renderPageThumbnail(bytes, i, 150);
          thumbs.push(thumb);
        }
        if (!cancelled) setThumbnails(thumbs);
      } catch (err) {
        console.error("Failed to load PDF page thumbnails:", err);
        if (!cancelled) {
          setError("Failed to load PDF pages. The file might be corrupted or password-protected.");
        }
      } finally {
        if (!cancelled) setLoadingThumbs(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const rotate = (index: number, delta: number) => {
    setRotations((prev) => ({
      ...prev,
      [index]: ((prev[index] ?? 0) + delta + 360) % 360,
    }));
  };

  const rotateAll = (delta: number) => {
    const r: Record<number, number> = {};
    thumbnails.forEach((_, i) => {
      r[i] = ((rotations[i] ?? 0) + delta + 360) % 360;
    });
    setRotations(r);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(30);
    setError(null);
    try {
      const rotated = await rotatePDF(file, rotations);
      setProgress(100);
      setResult(rotated);
    } catch {
      setError("Failed to rotate PDF. Please ensure the file is a valid PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setRotations({});
    setProgress(0);
    setError(null);
  };

  return (
    <ToolLayout
      title="Rotate PDF"
      description="Rotate individual pages or all pages at once. Click the rotation buttons on each page."
    >
      {!file && (
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          label="Drag & drop your PDF here"
          sublabel="Upload one PDF to rotate pages"
        />
      )}

      {file && !result && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-6">
          {/* Left Area: Page Previews */}
          <div className="space-y-4">
            {loadingThumbs ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 border border-[var(--border)] rounded-2xl bg-[var(--muted)]/20">
                <Loader2 className="w-10 h-10 text-[#E8372C] animate-spin" />
                <p className="text-sm text-[var(--muted-foreground)] animate-pulse">
                  Loading PDF pages and generating previews...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <h3 className="font-semibold text-[var(--foreground)] text-lg">
                    Pages ({thumbnails.length})
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Click a page or use hover buttons to rotate it
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {thumbnails.map((thumb, index) => {
                    const angle = rotations[index] ?? 0;
                    return (
                      <div
                        key={index}
                        onClick={() => rotate(index, 90)}
                        className={cn(
                          "group relative flex flex-col items-center rounded-xl border bg-[var(--muted)]/30 overflow-hidden cursor-pointer select-none transition-all duration-300",
                          angle !== 0
                            ? "border-[#E8372C] ring-2 ring-[#E8372C]/20 shadow-md"
                            : "border-[var(--border)] hover:border-[var(--muted-foreground)]/50 hover:shadow-sm"
                        )}
                      >
                        {/* Page thumbnail container */}
                        <div className="w-full aspect-[3/4] flex items-center justify-center p-2.5 relative overflow-hidden bg-white dark:bg-zinc-950">
                          <img
                            src={thumb}
                            alt={`Page ${index + 1}`}
                            className="max-w-full max-h-full object-contain transition-transform duration-300 ease-in-out"
                            style={{ transform: `rotate(${angle}deg)` }}
                          />

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotate(index, -90);
                              }}
                              className="w-10 h-10 rounded-full bg-white text-zinc-900 hover:bg-[#E8372C] hover:text-white flex items-center justify-center shadow transition-all duration-150 transform hover:scale-110"
                              title="Rotate left 90°"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotate(index, 90);
                              }}
                              className="w-10 h-10 rounded-full bg-white text-zinc-900 hover:bg-[#E8372C] hover:text-white flex items-center justify-center shadow transition-all duration-150 transform hover:scale-110"
                              title="Rotate right 90°"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Top Right angle badge */}
                          {angle !== 0 && (
                            <div className="absolute top-2 right-2 bg-[#E8372C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                              {angle}°
                            </div>
                          )}
                        </div>

                        {/* Page label footer */}
                        <div className="w-full py-2 border-t border-[var(--border)] bg-[var(--muted)]/50 flex items-center justify-center text-xs font-semibold text-[var(--foreground)]">
                          Page {index + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Area: Sticky Sidebar Options */}
          <div className="space-y-6">
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-6 lg:sticky lg:top-6">
              <div>
                <h3 className="font-bold text-[var(--foreground)] text-lg border-b border-[var(--border)] pb-2 mb-4">
                  Rotate Options
                </h3>

                {/* File info */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                  <div className="w-10 h-10 rounded-lg bg-[#E8372C]/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-[#E8372C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {formatBytes(file.size)} &nbsp;·&nbsp; {thumbnails.length || "..."} pages
                    </p>
                  </div>
                </div>
              </div>

              {/* Rotations Controls */}
              {thumbnails.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                      Global Rotation
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button
                        onClick={() => rotateAll(-90)}
                        className="flex flex-col items-center justify-center gap-2 p-3.5 border border-[var(--border)] rounded-xl hover:border-[#E8372C] hover:bg-[#E8372C]/5 text-[var(--foreground)] hover:text-[#E8372C] transition-all cursor-pointer font-medium text-sm group"
                      >
                        <RotateCcw className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[#E8372C] transition-colors" />
                        <span>All Left</span>
                      </button>
                      <button
                        onClick={() => rotateAll(90)}
                        className="flex flex-col items-center justify-center gap-2 p-3.5 border border-[var(--border)] rounded-xl hover:border-[#E8372C] hover:bg-[#E8372C]/5 text-[var(--foreground)] hover:text-[#E8372C] transition-all cursor-pointer font-medium text-sm group"
                      >
                        <RotateCw className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[#E8372C] transition-colors" />
                        <span>All Right</span>
                      </button>
                    </div>
                  </div>

                  {Object.values(rotations).some((r) => r !== 0) && (
                    <button
                      onClick={() => setRotations({})}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#E8372C] hover:bg-[#E8372C]/10 rounded-lg transition-colors"
                    >
                      Reset all rotations
                    </button>
                  )}
                </div>
              )}

              {processing && (
                <div className="pt-2">
                  <ProgressBar progress={progress} label="Applying rotations..." />
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleProcess}
                  disabled={processing || thumbnails.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#E8372C]/20"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RotateCw className="w-5 h-5" />
                  )}
                  {processing ? "Processing..." : "Apply & Download"}
                </button>

                <button
                  onClick={handleReset}
                  disabled={processing}
                  className="w-full py-2.5 border border-[var(--border)] hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm font-medium rounded-xl transition-colors"
                >
                  Upload a different file
                </button>
              </div>

              {/* Security info */}
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Local processing: files never leave device</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {result && (
        <DownloadButton
          data={result}
          filename={`rotated_${file?.name ?? "output.pdf"}`}
          fileSize={result.length}
          onReset={handleReset}
          label="Download Rotated PDF"
        />
      )}
    </ToolLayout>
  );
}
