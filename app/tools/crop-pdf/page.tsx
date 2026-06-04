"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";

interface CropMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export default function CropPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [margins, setMargins] = useState<CropMargins>({ top: 0, right: 0, bottom: 0, left: 0 });
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleFilesChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setThumbnails([]);
    setResult(null);
    setError(null);
    if (!newFiles[0]) return;
    setLoading(true);
    try {
      const buffer = await newFiles[0].arrayBuffer();
      const count = await getPDFPageCount(buffer);
      const thumbs: string[] = [];
      for (let i = 0; i < Math.min(count, 6); i++) {
        const t = await renderPageThumbnail(buffer, i, 200);
        thumbs.push(t);
      }
      setThumbnails(thumbs);
    } catch {
      setError("Failed to load PDF preview.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const buffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(buffer);
      setProgress(40);

      const pages = pdf.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        const l = margins.left;
        const b = margins.bottom;
        const w = Math.max(1, width - margins.left - margins.right);
        const h = Math.max(1, height - margins.top - margins.bottom);
        page.setCropBox(l, b, w, h);
      }

      setProgress(80);
      const saved = await pdf.save();
      setResult(saved);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}-cropped.pdf`);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to crop PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setThumbnails([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setMargins({ top: 0, right: 0, bottom: 0, left: 0 });
  };

  const marginKeys: (keyof CropMargins)[] = ["top", "right", "bottom", "left"];

  return (
    <ToolLayout title="Crop PDF" description="Remove margins and crop PDF pages to your specification.">
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
          <div className="text-sm text-center text-[var(--muted-foreground)] py-4">Loading preview…</div>
        )}

        {thumbnails.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-[var(--foreground)]">Preview (first {thumbnails.length} pages)</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {thumbnails.map((thumb, i) => (
                <div key={i} className="relative shrink-0" style={{ width: 120 }}>
                  <img src={thumb} alt={`Page ${i + 1}`} className="rounded-lg border border-[var(--border)] w-full" />
                  <div
                    className="absolute inset-0 border-2 border-dashed border-[#E8372C] rounded-lg pointer-events-none"
                    style={{
                      top: `${(margins.top / 400) * 100}%`,
                      right: `${(margins.right / 300) * 100}%`,
                      bottom: `${(margins.bottom / 400) * 100}%`,
                      left: `${(margins.left / 300) * 100}%`,
                    }}
                  />
                  <div className="absolute bottom-1 left-0 right-0 text-center text-xs text-white bg-black/50 rounded-b-lg">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-[var(--foreground)]">Crop Margins (px)</p>
            <div className="grid grid-cols-2 gap-4">
              {marginKeys.map((key) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <label className="capitalize text-[var(--muted-foreground)]">{key}</label>
                    <span className="font-medium text-[var(--foreground)]">{margins[key]}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={margins[key]}
                    onChange={(e) => setMargins((m) => ({ ...m, [key]: Number(e.target.value) }))}
                    className="w-full accent-[#E8372C]"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && !result && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Cropping…" : "Apply Crop"}
          </button>
        )}

        {processing && <ProgressBar progress={progress} label="Applying crop to all pages…" />}

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
            label="Download Cropped PDF"
          />
        )}
      </div>
    </ToolLayout>
  );
}
