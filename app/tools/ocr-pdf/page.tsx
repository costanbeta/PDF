"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { pdfPageToJpeg, getPDFPageCount } from "@/lib/pdf/to-jpg";

export default function OCRPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      // Store as Uint8Array — each pdfjs call gets its own .slice() copy internally
      const fileBytes = new Uint8Array(await files[0].arrayBuffer());
      const pageCount = await getPDFPageCount(fileBytes);
      const allText: string[] = [];

      for (let i = 0; i < pageCount; i++) {
        setProgressLabel(`Processing page ${i + 1} of ${pageCount}…`);
        setProgress(Math.round((i / pageCount) * 90));

        const blob = await pdfPageToJpeg(fileBytes, i, 150);
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const { data: { text } } = await worker.recognize(blob);
        await worker.terminate();

        allText.push(`--- Page ${i + 1} ---\n${text.trim()}`);
      }

      setProgress(95);
      setProgressLabel("Finalizing…");

      const combined = allText.join("\n\n");
      const txtBlob = new Blob([combined], { type: "text/plain" });
      setResult(txtBlob);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}-ocr.txt`);
      setProgress(100);
      setProgressLabel("Done!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setProgressLabel("");
  };

  return (
    <ToolLayout
      toolId="ocr-pdf"
      title="OCR PDF"
      description="Extract text from scanned PDFs using optical character recognition."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Drag & drop your scanned PDF here"
          sublabel="or click to browse — best for image-based PDFs"
        />

        {files.length > 0 && !result && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Running OCR…" : "Extract Text with OCR"}
          </button>
        )}

        {processing && (
          <ProgressBar progress={progress} label={progressLabel} />
        )}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {result && (
          <DownloadButton
            data={result}
            filename={outputName}
            onReset={handleReset}
            label="Download Text File"
          />
        )}

        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
          OCR accuracy depends on scan quality. Higher resolution scans yield better results. Processing may take a minute per page.
        </div>
      </div>
    </ToolLayout>
  );
}
