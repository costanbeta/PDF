"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";

export default function ExcelToPDFPage() {
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

      const XLSX = await import("xlsx");
      const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
      setProgress(40);

      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

      const pageWidth = 841.89;
      const pageHeight = 595.28;
      const margin = 40;
      const rowHeight = 20;
      const headerHeight = 24;
      const fontSize = 9;

      const usableWidth = pageWidth - margin * 2;
      const maxCols = data[0]?.length || 0;
      const colWidth = maxCols > 0 ? usableWidth / maxCols : usableWidth;

      let page = pdf.addPage([pageWidth, pageHeight]);
      let y = pageHeight - margin;
      let rowIndex = 0;

      const drawRow = (row: string[], isHeader: boolean) => {
        const rh = isHeader ? headerHeight : rowHeight;
        if (y - rh < margin) {
          page = pdf.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }

        if (isHeader) {
          page.drawRectangle({
            x: margin,
            y: y - rh,
            width: usableWidth,
            height: rh,
            color: rgb(0.9, 0.9, 0.9),
          });
        } else if (rowIndex % 2 === 0) {
          page.drawRectangle({
            x: margin,
            y: y - rh,
            width: usableWidth,
            height: rh,
            color: rgb(0.97, 0.97, 0.97),
          });
        }

        for (let c = 0; c < maxCols; c++) {
          const cellX = margin + c * colWidth;
          const cellText = String(row[c] ?? "").slice(0, 30);

          page.drawLine({
            start: { x: cellX, y: y },
            end: { x: cellX, y: y - rh },
            color: rgb(0.8, 0.8, 0.8),
            thickness: 0.5,
          });

          page.drawText(cellText, {
            x: cellX + 4,
            y: y - rh + (rh - fontSize) / 2,
            size: fontSize,
            font: isHeader ? boldFont : font,
            color: rgb(0, 0, 0),
            maxWidth: colWidth - 8,
          });
        }

        page.drawLine({
          start: { x: margin, y: y - rh },
          end: { x: margin + usableWidth, y: y - rh },
          color: rgb(0.8, 0.8, 0.8),
          thickness: 0.5,
        });

        y -= rh;
        rowIndex++;
      };

      page.drawLine({
        start: { x: margin, y },
        end: { x: margin + usableWidth, y },
        color: rgb(0.8, 0.8, 0.8),
        thickness: 0.5,
      });

      for (let r = 0; r < data.length; r++) {
        setProgress(40 + Math.round((r / data.length) * 50));
        drawRow(data[r] as string[], r === 0);
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
  };

  return (
    <ToolLayout title="Excel to PDF" description="Convert Excel spreadsheets and CSV files to PDF.">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "text/csv": [".csv"],
          }}
          multiple={false}
          label="Drag & drop your Excel or CSV file here"
          sublabel="or click to browse — .xlsx and .csv supported"
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

        {processing && <ProgressBar progress={progress} label="Building table PDF…" />}

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
