"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { pdfPageToJpeg, getPDFPageCount } from "@/lib/pdf/to-jpg";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(blob);
  });
}

export default function PDFToPowerPointPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(5);
    setError(null);
    setResult(null);

    try {
      const buffer = await files[0].arrayBuffer();
      const pageCount = await getPDFPageCount(buffer);
      setProgress(10);

      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";

      for (let i = 0; i < pageCount; i++) {
        setProgress(10 + Math.round((i / pageCount) * 80));
        const blob = await pdfPageToJpeg(buffer, i, 150);
        const base64 = await blobToBase64(blob);

        const slide = pptx.addSlide();
        slide.addImage({
          data: `data:image/jpeg;base64,${base64}`,
          x: 0,
          y: 0,
          w: "100%",
          h: "100%",
        });
      }

      setProgress(92);
      const blob = await pptx.write({ outputType: "blob" }) as Blob;
      setResult(blob);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}.pptx`);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  return (
    <ToolLayout
      title="PDF to PowerPoint"
      description="Convert PDF pages into a PowerPoint presentation."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Drag & drop your PDF here"
          sublabel="or click to browse — each page becomes a slide"
        />

        {files.length > 0 && !result && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Converting…" : "Convert to PowerPoint"}
          </button>
        )}

        {processing && <ProgressBar progress={progress} label="Rendering pages and building presentation…" />}

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
            label="Download PPTX"
          />
        )}
      </div>
    </ToolLayout>
  );
}
