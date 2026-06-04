"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function stripHtmlToParagraphs(html: string): string[] {
  const div = document.createElement("div");
  div.innerHTML = html;
  const paragraphs: string[] = [];
  const blockTags = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "div", "tr"];
  blockTags.forEach((tag) => {
    div.querySelectorAll(tag).forEach((el) => {
      const text = el.textContent?.trim();
      if (text) paragraphs.push(text);
    });
  });
  if (paragraphs.length === 0) {
    return (div.textContent || "").split("\n").map((l) => l.trim()).filter(Boolean);
  }
  return paragraphs;
}

export default function WordToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const buffer = await files[0].arrayBuffer();
      setProgress(20);

      const mammoth = await import("mammoth");
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });
      setProgress(40);

      const paragraphs = stripHtmlToParagraphs(html);
      setProgress(55);

      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontSize = 11;
      const lineHeight = fontSize * 1.4;
      const margin = 60;
      const pageWidth = 595;
      const pageHeight = 842;
      const maxChars = 90;

      let page = pdf.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;

      for (const para of paragraphs) {
        if (!para.trim()) {
          y -= lineHeight;
          if (y < margin) {
            page = pdf.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          continue;
        }
        const wrapped = wrapText(para, maxChars);
        for (const line of wrapped) {
          if (y < margin) {
            page = pdf.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
        }
        y -= lineHeight * 0.5;
      }

      setProgress(85);
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
  };

  return (
    <ToolLayout title="Word to PDF" description="Convert Word documents to PDF format.">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <div className="flex items-start gap-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 text-sm text-yellow-800 dark:text-yellow-300">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
          <span>Layout conversion is best-effort. Complex formatting, images, and tables may not render exactly as in the original document.</span>
        </div>

        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] }}
          multiple={false}
          label="Drag & drop your Word document here"
          sublabel="or click to browse — .docx files only"
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

        {processing && <ProgressBar progress={progress} label="Converting Word to PDF…" />}

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
            label="Download PDF"
          />
        )}
      </div>
    </ToolLayout>
  );
}
