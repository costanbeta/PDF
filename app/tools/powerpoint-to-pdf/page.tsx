"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export default function PowerPointToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mediaCount, setMediaCount] = useState(0);

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const buffer = await files[0].arrayBuffer();
      setProgress(20);

      const zip = await JSZip.loadAsync(buffer);
      const mediaFiles = Object.keys(zip.files).filter(
        (f) =>
          f.startsWith("ppt/media/") &&
          (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg"))
      );

      setMediaCount(mediaFiles.length);

      const pdf = await PDFDocument.create();

      if (mediaFiles.length === 0) {
        const page = pdf.addPage([792, 612]);
        page.drawText("No embeddable media found in this presentation.", {
          x: 50,
          y: 300,
          size: 14,
        });
      } else {
        for (let i = 0; i < mediaFiles.length; i++) {
          setProgress(20 + Math.round((i / mediaFiles.length) * 70));
          const fileData = await zip.files[mediaFiles[i]].async("arraybuffer");
          const uint8 = new Uint8Array(fileData);
          const lower = mediaFiles[i].toLowerCase();

          let embeddedImage;
          if (lower.endsWith(".png")) {
            embeddedImage = await pdf.embedPng(uint8);
          } else {
            embeddedImage = await pdf.embedJpg(uint8);
          }

          const { width, height } = embeddedImage.scale(1);
          const page = pdf.addPage([width, height]);
          page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
        }
      }

      setProgress(95);
      const saved = await pdf.save();
      setResult(saved);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}.pdf`);
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
    setMediaCount(0);
  };

  return (
    <ToolLayout
      title="PowerPoint to PDF"
      description="Convert PowerPoint presentations to PDF format."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <div className="flex items-start gap-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
          <span>
            Best-effort conversion. Only embedded media images from the presentation are included.
            Slide text and shapes will not be rendered. For full fidelity, use desktop software.
          </span>
        </div>

        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"] }}
          multiple={false}
          label="Drag & drop your PowerPoint file here"
          sublabel="or click to browse — .pptx files only"
        />

        {files.length > 0 && !result && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Converting…" : "Convert to PDF"}
          </button>
        )}

        {processing && <ProgressBar progress={progress} label="Extracting media and building PDF…" />}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
              Found {mediaCount} media image{mediaCount !== 1 ? "s" : ""} in the presentation.
            </div>
            <DownloadButton
              data={result}
              filename={outputName}
              fileSize={result.length}
              onReset={handleReset}
              label="Download PDF"
            />
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
