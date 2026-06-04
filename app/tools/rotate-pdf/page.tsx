"use client";

import { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { rotatePDF } from "@/lib/pdf/rotate";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { RotateCw, RotateCcw } from "lucide-react";

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

    file.arrayBuffer().then(async (buf) => {
      try {
        const count = await getPDFPageCount(buf);
        const thumbs: string[] = [];
        for (let i = 0; i < count; i++) {
          if (cancelled) return;
          const thumb = await renderPageThumbnail(buf, i, 120);
          thumbs.push(thumb);
        }
        if (!cancelled) setThumbnails(thumbs);
      } finally {
        if (!cancelled) setLoadingThumbs(false);
      }
    });

    return () => { cancelled = true; };
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
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your PDF here"
        sublabel="Upload one PDF to rotate pages"
      />

      {file && !result && (
        <>
          {loadingThumbs && (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
              Loading page thumbnails...
            </p>
          )}

          {thumbnails.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--foreground)]">
                  Pages ({thumbnails.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => rotateAll(-90)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> All Left
                  </button>
                  <button
                    onClick={() => rotateAll(90)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> All Right
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {thumbnails.map((thumb, index) => {
                  const angle = rotations[index] ?? 0;
                  return (
                    <div key={index} className="flex flex-col items-center gap-2">
                      <div className="w-full aspect-[3/4] rounded-lg border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center overflow-hidden p-1">
                        <img
                          src={thumb}
                          alt={`Page ${index + 1}`}
                          className="max-w-full max-h-full object-contain transition-transform duration-300"
                          style={{ transform: `rotate(${angle}deg)` }}
                        />
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">Page {index + 1}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => rotate(index, -90)}
                          className="p-1.5 rounded border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                          title="Rotate left 90°"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => rotate(index, 90)}
                          className="p-1.5 rounded border border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                          title="Rotate right 90°"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                      </div>
                      {angle !== 0 && (
                        <span className="text-xs font-medium text-[#E8372C]">{angle}°</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} label="Applying rotations..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleProcess}
            disabled={processing || thumbnails.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <RotateCw className="w-5 h-5" />
            {processing ? "Processing..." : "Apply Rotations & Download"}
          </button>
        </>
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
