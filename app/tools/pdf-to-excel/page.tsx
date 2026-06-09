"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import JSZip from "jszip";

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
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(5);
    setError(null);
    setResult(null);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const XLSX = await import("xlsx");
      const zip = files.length > 1 ? new JSZip() : null;

      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        const buffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        const numPages = pdfDoc.numPages;

        const allRows: string[][] = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          const fileProgressStart = 10 + (fileIdx / files.length) * 75;
          const fileProgressEnd = 10 + ((fileIdx + 1) / files.length) * 75;
          const pageProgress = fileProgressStart + (pageNum / numPages) * (fileProgressEnd - fileProgressStart);
          setProgress(Math.round(pageProgress));

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

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(allRows);
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

        const excelBlob = new Blob([out], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const baseName = getFileNameWithoutExtension(file.name);
        if (zip) {
          zip.file(`${baseName}.xlsx`, out);
        } else {
          setResult(excelBlob);
          setOutputName(`${baseName}.xlsx`);
        }
      }

      if (zip) {
        setProgress(90);
        const zipBlob = await zip.generateAsync({ type: "blob" });
        setResult(zipBlob);
        setOutputName("converted_spreadsheets.zip");
      }
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
      toolId="pdf-to-excel"
      title="PDF to Excel"
      description="Extract table data from PDFs into an Excel spreadsheet."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={true}
          label="Drag & drop your PDFs here"
          sublabel="or click to browse — best results with text-based PDFs"
        />

        {files.length > 0 && !result && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Extracting…" : `Extract ${files.length > 1 ? `${files.length} PDFs` : "to Excel"}`}
          </button>
        )}

        {processing && <ProgressBar progress={progress} label="Extracting text and building spreadsheets…" />}

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
            label={outputName.endsWith(".zip") ? "Download ZIP" : "Download Excel"}
          />
        )}

        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
          Text-based PDFs yield the best table extraction. Scanned PDFs may produce irregular results.
        </div>
      </div>
    </ToolLayout>
  );
}
