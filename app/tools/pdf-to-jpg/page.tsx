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
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});

  const handleFileChange = async (newFiles: File[]) => {
    setFiles(newFiles);
    const counts = { ...pageCounts };
    for (const f of newFiles) {
      if (counts[f.name] === undefined) {
        try {
          const buf = await f.arrayBuffer();
          const count = await getPDFPageCount(buf);
          counts[f.name] = count;
        } catch (e) {
          console.error("Failed to read page count for", f.name, e);
        }
      }
    }
    setPageCounts(counts);
  };

  const totalPages = files.reduce((acc, f) => acc + (pageCounts[f.name] || 0), 0);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(5);
    setError(null);
    try {
      const zip = new JSZip();
      let pagesProcessed = 0;

      for (const file of files) {
        const buf = await file.arrayBuffer();
        const count = pageCounts[file.name] || (await getPDFPageCount(buf));
        const baseName = file.name.replace(/\.pdf$/i, "");
        
        const folderName = files.length > 1 ? `${baseName}_images` : "";
        const zipTarget = folderName ? zip.folder(folderName) || zip : zip;

        for (let i = 0; i < count; i++) {
          const blob = await pdfPageToJpeg(buf, i, dpi);
          const arrayBuf = await blob.arrayBuffer();
          zipTarget.file(`${baseName}_page_${i + 1}.jpg`, arrayBuf);
          pagesProcessed++;
          setProgress(5 + (pagesProcessed / totalPages) * 90);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const outputZipName = files.length > 1 ? "converted_images.zip" : `${files[0].name.replace(/\.pdf$/i, "")}_images.zip`;
      downloadBlob(zipBlob, outputZipName);
      setProgress(100);
      setDone(true);
    } catch {
      setError("Failed to convert PDF to images. Please ensure the files are valid PDFs.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setDone(false);
    setProgress(0);
    setError(null);
    setPageCounts({});
  };

  return (
    <ToolLayout
      title="PDF to JPG"
      description="Convert each PDF page to a high-quality JPEG image. Download all images as a ZIP."
    >
      <FileUploader
        files={files}
        onFilesChange={handleFileChange}
        multiple={true}
        label="Drag & drop your PDFs here"
        sublabel="Each page will be converted to a JPEG image"
      />

      {files.length > 0 && !done && (
        <>
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--foreground)]">Settings</h3>
              <span className="text-sm text-[var(--muted-foreground)]">
                {files.length} {files.length === 1 ? "file" : "files"} ({totalPages} pages total) detected
              </span>
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
            {processing ? "Converting..." : `Convert ${files.length > 1 ? `${files.length} PDFs` : "to JPG"}`}
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
            Convert more PDFs
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
