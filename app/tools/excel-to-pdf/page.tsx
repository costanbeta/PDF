"use client";

import { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension, cn } from "@/lib/utils";
import { Info, Settings } from "lucide-react";

type PageSize = "A4" | "A3" | "Letter" | "Legal";
type Margin = "none" | "small" | "big";

const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  A3: { width: 841.89, height: 1190.55 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 }
};

const MARGINS = {
  none: 0,
  small: 20,
  big: 50
};

export default function ExcelToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [margin, setMargin] = useState<Margin>("small");
  const [oneLongPage, setOneLongPage] = useState(false);

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

      const pageSizeVal = PAGE_SIZES[pageSize];
      const targetPageWidth = orientation === "landscape" ? pageSizeVal.height : pageSizeVal.width;
      const targetPageHeight = orientation === "landscape" ? pageSizeVal.width : pageSizeVal.height;
      const marginPoints = MARGINS[margin];

      const rowHeight = 20;
      const headerHeight = 24;
      const fontSize = 9;

      const usableWidth = targetPageWidth - marginPoints * 2;
      const maxCols = data[0]?.length || 0;
      const colWidth = maxCols > 0 ? usableWidth / maxCols : usableWidth;

      let page: any;
      let y: number;

      if (oneLongPage) {
        const totalHeight = marginPoints * 2 + headerHeight + Math.max(0, data.length - 1) * rowHeight;
        page = pdf.addPage([targetPageWidth, totalHeight]);
        y = totalHeight - marginPoints;
      } else {
        page = pdf.addPage([targetPageWidth, targetPageHeight]);
        y = targetPageHeight - marginPoints;
      }

      let rowIndex = 0;

      const drawRow = (row: string[], isHeader: boolean) => {
        const rh = isHeader ? headerHeight : rowHeight;
        if (!oneLongPage && y - rh < marginPoints) {
          page = pdf.addPage([targetPageWidth, targetPageHeight]);
          y = targetPageHeight - marginPoints;

          // Draw top border for the new page
          page.drawLine({
            start: { x: marginPoints, y },
            end: { x: marginPoints + usableWidth, y },
            color: rgb(0.8, 0.8, 0.8),
            thickness: 0.5,
          });
        }

        if (isHeader) {
          page.drawRectangle({
            x: marginPoints,
            y: y - rh,
            width: usableWidth,
            height: rh,
            color: rgb(0.9, 0.9, 0.9),
          });
        } else if (rowIndex % 2 === 0) {
          page.drawRectangle({
            x: marginPoints,
            y: y - rh,
            width: usableWidth,
            height: rh,
            color: rgb(0.97, 0.97, 0.97),
          });
        }

        for (let c = 0; c < maxCols; c++) {
          const cellX = marginPoints + c * colWidth;
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

        // Draw final rightmost vertical border
        page.drawLine({
          start: { x: marginPoints + usableWidth, y: y },
          end: { x: marginPoints + usableWidth, y: y - rh },
          color: rgb(0.8, 0.8, 0.8),
          thickness: 0.5,
        });

        page.drawLine({
          start: { x: marginPoints, y: y - rh },
          end: { x: marginPoints + usableWidth, y: y - rh },
          color: rgb(0.8, 0.8, 0.8),
          thickness: 0.5,
        });

        y -= rh;
        rowIndex++;
      };

      page.drawLine({
        start: { x: marginPoints, y },
        end: { x: marginPoints + usableWidth, y },
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

  const hasFile = files.length > 0;

  return (
    <ToolLayout title="Excel to PDF" description="Convert Excel spreadsheets and CSV files to PDF.">
      <div className={cn("gap-6", hasFile ? "grid grid-cols-1 lg:grid-cols-[1fr_320px]" : "")}>
        {/* Left column */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
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
          </div>
        </div>

        {/* Right column: Options */}
        {hasFile && (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-3">
                <Settings className="w-4 h-4 text-[#E8372C]" />
                <span>Excel to PDF options</span>
              </div>

              {/* Page size */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--foreground)]">Page size</label>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as PageSize)}
                    className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--muted)] pl-4 pr-10 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[#E8372C] transition-colors cursor-pointer"
                  >
                    <option value="A4">A4 ({orientation === "landscape" ? "297x210 mm" : "210x297 mm"})</option>
                    <option value="A3">A3 ({orientation === "landscape" ? "420x297 mm" : "297x420 mm"})</option>
                    <option value="Letter">Letter ({orientation === "landscape" ? "279x216 mm" : "216x279 mm"})</option>
                    <option value="Legal">Legal ({orientation === "landscape" ? "356x216 mm" : "216x356 mm"})</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground)]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Checkbox: One Long Page */}
              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer py-1 select-none group">
                  <div
                    onClick={() => setOneLongPage(!oneLongPage)}
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all",
                      oneLongPage ? "bg-emerald-500 border-emerald-500" : "border-[var(--border)] group-hover:border-emerald-500"
                    )}
                  >
                    {oneLongPage && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--foreground)]">One long page</span>
                    <div className="relative group/tooltip">
                      <Info className="w-4 h-4 text-[#E8372C] shrink-0" />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2.5 bg-zinc-900 text-white text-[11px] font-normal rounded-lg shadow-xl z-50 text-center leading-normal">
                        Generates a single continuous PDF page fitting all rows vertically, preventing pagination split.
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Orientation */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--foreground)]">Orientation</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setOrientation("portrait")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer bg-[var(--card)]",
                      orientation === "portrait"
                        ? "border-[#E8372C] text-[#E8372C]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/40"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-10 rounded border-2 flex items-center justify-center",
                      orientation === "portrait" ? "border-[#E8372C]" : "border-[var(--muted-foreground)]"
                    )}>
                      <div className={cn("w-3 h-4 rounded-sm", orientation === "portrait" ? "bg-[#E8372C]" : "bg-[var(--muted-foreground)]")} />
                    </div>
                    <span className="text-xs font-semibold">Portrait</span>
                  </button>

                  <button
                    onClick={() => setOrientation("landscape")}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer bg-[var(--card)]",
                      orientation === "landscape"
                        ? "border-[#E8372C] text-[#E8372C]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/40"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-8 rounded border-2 flex items-center justify-center",
                      orientation === "landscape" ? "border-[#E8372C]" : "border-[var(--muted-foreground)]"
                    )}>
                      <div className={cn("w-4 h-3 rounded-sm", orientation === "landscape" ? "bg-[#E8372C]" : "bg-[var(--muted-foreground)]")} />
                    </div>
                    <span className="text-xs font-semibold">Landscape</span>
                  </button>
                </div>
              </div>

              {/* Page margin */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--foreground)]">Page margin</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["none", "small", "big"] as Margin[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMargin(m)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer bg-[var(--card)]",
                        margin === m
                          ? "border-[#E8372C] text-[#E8372C]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/40"
                      )}
                    >
                      {m === "none" && (
                        <div className={cn(
                          "w-10 h-10 rounded border flex items-center justify-center relative overflow-hidden bg-white dark:bg-zinc-900",
                          margin === "none" ? "border-[#E8372C]" : "border-[var(--border)]"
                        )}>
                          <svg className={cn("w-full h-full p-1", margin === "none" ? "text-[#E8372C]" : "text-[var(--muted-foreground)]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="22 16 16 10 5 21"/>
                          </svg>
                        </div>
                      )}
                      {m === "small" && (
                        <div className={cn(
                          "w-10 h-10 rounded border flex items-center justify-center relative bg-white dark:bg-zinc-900",
                          margin === "small" ? "border-[#E8372C]" : "border-[var(--border)]"
                        )}>
                          <div className="absolute inset-1 border border-dashed border-[var(--muted-foreground)]/50 rounded flex items-center justify-center">
                            <svg className={cn("w-full h-full p-1", margin === "small" ? "text-[#E8372C]" : "text-[var(--muted-foreground)]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="22 16 16 10 5 21"/>
                            </svg>
                          </div>
                        </div>
                      )}
                      {m === "big" && (
                        <div className={cn(
                          "w-10 h-10 rounded border flex items-center justify-center relative bg-white dark:bg-zinc-900",
                          margin === "big" ? "border-[#E8372C]" : "border-[var(--border)]"
                        )}>
                          <div className="absolute inset-2 border border-dashed border-[var(--muted-foreground)]/50 rounded flex items-center justify-center">
                            <svg className={cn("w-full h-full p-0.5", margin === "big" ? "text-[#E8372C]" : "text-[var(--muted-foreground)]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="22 16 16 10 5 21"/>
                            </svg>
                          </div>
                        </div>
                      )}
                      <span className="text-[11px] font-semibold capitalize">
                        {m === "none" ? "No margin" : m}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!result && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
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
        )}
      </div>
    </ToolLayout>
  );
}
