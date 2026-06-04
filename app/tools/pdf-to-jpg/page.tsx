"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { pdfPageToJpeg, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { downloadBlob } from "@/lib/utils";
import { Image, Download } from "lucide-react";
import JSZip from "jszip";

const DPI_OPTIONS = [72, 150, 300];

export default function PDFToJPGPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dpi, setDpi] = useState(150);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);

  const file = files[0] ?? null;

  const handleFileChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    setPageCount(null);
    if (newFiles[0]) {
      const buf = await newFiles[0].arrayBuffer();
      const count = await getPDFPageCount(buf);
      setPageCount(count);
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(5);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const count = await getPDFPageCount(buf);
      const zip = new JSZip();
      const baseName = file.name.replace(/\.pdf$/i, "");

      for (let i = 0; i < count; i++) {
        const blob = await pdfPageToJpeg(buf, i, dpi);
        const arrayBuf = await blob.arrayBuffer();
        zip.file(`${baseName}_page_${i + 1}.jpg`, arrayBuf);
        setProgress(5 + ((i + 1) / count) * 90);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${baseName}_images.zip`);
      setProgress(100);
      setDone(true);
    } catch {
      setError("Failed to convert PDF to images. Please ensure the file is a valid PDF.");
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
  };

  return (
    <ToolLayout
      title="PDF to JPG"
      description="Convert each PDF page to a high-quality JPEG image. Download all images as a ZIP."
    >
      <FileUploader
        files={files}
        onFilesChange={handleFileChange}
        label="Drag & drop your PDF here"
        sublabel="Each page will be converted to a JPEG image"
      />

      {file && !done && (
        <>
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--foreground)]">Settings</h3>
              {pageCount !== null && (
                <span className="text-sm text-[var(--muted-foreground)]">
                  {pageCount} pages detected
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Image Quality (DPI)</label>
              <div className="flex gap-3">
                {DPI_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDpi(d)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      dpi === d
                        ? "bg-[#E8372C] text-white border-[#E8372C]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                    }`}
                  >
                    {d} DPI
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                72 DPI = screen quality · 150 DPI = standard · 300 DPI = print quality
              </p>
            </div>
          </div>

          {processing && <ProgressBar progress={progress} label="Converting pages..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleConvert}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <Image className="w-5 h-5" />
            {processing ? "Converting..." : "Convert to JPG"}
          </button>
        </>
      )}

      {done && (
        <div className="p-5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 space-y-3">
          <p className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
            <Download className="w-5 h-5" /> Download started!
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Your JPEG images have been downloaded as a ZIP archive.
          </p>
          <button
            onClick={handleReset}
            className="text-sm font-medium text-green-700 dark:text-green-300 underline"
          >
            Convert another PDF
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
