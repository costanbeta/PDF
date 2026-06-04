"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";

interface TextItem {
  str: string;
  transform: number[];
}

interface TextContent {
  items: TextItem[];
}

export default function PDFToExcelPage() {
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
      setProgress(10);

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const numPages = pdfDoc.numPages;

      const allRows: string[][] = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setProgress(10 + Math.round((pageNum / numPages) * 70));
        const page = await pdfDoc.getPage(pageNum);
        const content = await page.getTextContent() as TextContent;

        const byY = new Map<number, string[]>();
        for (const item of content.items) {
          const y = Math.round(item.transform[5]);
          if (!byY.has(y)) byY.set(y, []);
          byY.get(y)!.push(item.str);
        }

        const sortedYs = Array.from(byY.keys()).sort((a, b) => b - a);
        for (const y of sortedYs) {
          const cells = byY.get(y)!.join("	").split(/\s{2,}|	/);
          allRows.push(cells.map((c) => c.trim()).filter((c) => c.length > 0));
        }

        if (pageNum < numPages) {
          allRows.push([`--- Page ${pageNum + 1} ---`]);
        }
      }

      setProgress(85);

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(allRows);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      setResult(blob);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}.xlsx`);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed.");
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
      title="PDF to Excel"
      description="Extract table data from PDFs into an Excel spreadsheet."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Drag & drop your PDF here"
          sublabel="or click to browse — best results with text-based PDFs"
        />

        {files.length > 0 && !result && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Extracting…" : "Extract to Excel"}
          </button>
        )}

        {processing && <ProgressBar progress={progress} label="Extracting text and building spreadsheet…" />}

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
            label="Download Excel"
          />
        )}

        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
          Text-based PDFs yield the best table extraction. Scanned PDFs may produce irregular results.
        </div>
      </div>
    </ToolLayout>
  );
}
