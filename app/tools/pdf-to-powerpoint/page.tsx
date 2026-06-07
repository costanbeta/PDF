"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { pdfPageToJpeg, getPDFPageCount } from "@/lib/pdf/to-jpg";
import JSZip from "jszip";

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
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(5);
    setError(null);
    setResult(null);

    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const zip = files.length > 1 ? new JSZip() : null;

      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        const buffer = await file.arrayBuffer();
        const pageCount = await getPDFPageCount(buffer);

        const pptx = new PptxGenJS();
        pptx.layout = "LAYOUT_16x9";

        for (let i = 0; i < pageCount; i++) {
          const fileProgressStart = 10 + (fileIdx / files.length) * 80;
          const fileProgressEnd = 10 + ((fileIdx + 1) / files.length) * 80;
          const pageProgress = fileProgressStart + (i / pageCount) * (fileProgressEnd - fileProgressStart);
          setProgress(Math.round(pageProgress));

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

        const pptxBlob = await pptx.write({ outputType: "blob" }) as Blob;
        const baseName = getFileNameWithoutExtension(file.name);
        if (zip) {
          const arrayBuf = await pptxBlob.arrayBuffer();
          zip.file(`${baseName}.pptx`, arrayBuf);
        } else {
          setResult(pptxBlob);
          setOutputName(`${baseName}.pptx`);
        }
      }

      if (zip) {
        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: "blob" });
        setResult(zipBlob);
        setOutputName("converted_presentations.zip");
      }
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
          multiple={true}
          label="Drag & drop your PDFs here"
          sublabel="or click to browse — each page becomes a slide"
        />

        {files.length > 0 && !result && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Converting…" : `Convert ${files.length > 1 ? `${files.length} PDFs` : "to PowerPoint"}`}
          </button>
        )}

        {processing && <ProgressBar progress={progress} label="Rendering pages and building presentations…" />}

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
            label={outputName.endsWith(".zip") ? "Download ZIP" : "Download PPTX"}
          />
        )}
      </div>
    </ToolLayout>
  );
}
