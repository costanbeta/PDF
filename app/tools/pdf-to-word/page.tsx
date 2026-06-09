"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { downloadBlob } from "@/lib/utils";
import { FileText, Download, AlertTriangle } from "lucide-react";
import JSZip from "jszip";

export default function PDFToWordPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(5);
    setError(null);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import("docx");
      const zip = files.length > 1 ? new JSZip() : null;

      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        const totalPages = pdf.numPages;

        const paragraphs: string[] = [];

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .trim();

          if (pageText) paragraphs.push(pageText);
          paragraphs.push(`\n--- Page ${i} ---\n`);
          
          const fileProgressStart = 5 + (fileIdx / files.length) * 85;
          const fileProgressEnd = 5 + ((fileIdx + 1) / files.length) * 85;
          const pageProgress = fileProgressStart + (i / totalPages) * (fileProgressEnd - fileProgressStart);
          setProgress(Math.round(pageProgress));
        }

        const children = [];
        const baseName = file.name.replace(/\.pdf$/i, "");

        children.push(
          new Paragraph({
            text: baseName,
            heading: HeadingLevel.TITLE,
          })
        );

        for (const text of paragraphs) {
          if (text.startsWith("\n---")) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: text.replace(/\n/g, "").trim(), color: "888888", size: 18 })],
              })
            );
          } else if (text.trim()) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text })],
              })
            );
          }
        }

        const doc = new Document({
          sections: [{ properties: {}, children }],
        });

        const docBlob = await Packer.toBlob(doc);
        if (zip) {
          const arrayBuf = await docBlob.arrayBuffer();
          zip.file(`${baseName}.docx`, arrayBuf);
        } else {
          downloadBlob(docBlob, `${baseName}.docx`);
        }
      }

      if (zip) {
        setProgress(95);
        const zipBlob = await zip.generateAsync({ type: "blob" });
        downloadBlob(zipBlob, "converted_documents.zip");
      }

      setProgress(100);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to convert PDFs to Word.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setDone(false);
    setProgress(0);
    setError(null);
  };

  return (
    <ToolLayout
      toolId="pdf-to-word"
      title="PDF to Word"
      description="Extract text from your PDF and export it as a .docx Word document."
    >
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700 dark:text-amber-300">
          <p className="font-semibold mb-1">Note about conversion quality</p>
          <p>
            This tool extracts text content from PDFs. Complex layouts, tables, images, and
            special formatting will not be preserved — only plain text is extracted.
          </p>
        </div>
      </div>

      <FileUploader
        files={files}
        onFilesChange={setFiles}
        multiple={true}
        label="Drag & drop your PDFs here"
        sublabel="Text will be extracted and saved as .docx"
      />

      {files.length > 0 && !done && (
        <>
          {processing && <ProgressBar progress={progress} label="Extracting text..." />}

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
            <FileText className="w-5 h-5" />
            {processing ? "Converting..." : `Convert ${files.length > 1 ? `${files.length} PDFs` : "to Word (.docx)"}`}
          </button>
        </>
      )}

      {done && (
        <div className="p-5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 space-y-3">
          <p className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
            <Download className="w-5 h-5" /> Conversion complete!
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            {files.length > 1
              ? "Your Word documents have been downloaded as a ZIP archive."
              : "Your Word document has been downloaded."}
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
