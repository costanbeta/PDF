"use client";

import { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { addPageNumbers, type PageNumberPosition } from "@/lib/pdf/page-numbers";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { Hash } from "lucide-react";

const GRID_CELLS: { id: PageNumberPosition; label: string }[] = [
  { id: "top-left", label: "Top Left" },
  { id: "top-center", label: "Top Center" },
  { id: "top-right", label: "Top Right" },
  { id: "middle-left", label: "Middle Left" },
  { id: "middle-center", label: "Middle Center" },
  { id: "middle-right", label: "Middle Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "bottom-center", label: "Bottom Center" },
  { id: "bottom-right", label: "Bottom Right" },
];

function getDotPosition(pos: PageNumberPosition, pageIndex: number, pageMode: "single" | "facing"): string {
  const parts = pos.split("-");
  const v = parts[0];
  let h = parts[1];
  
  // Mirror horizontal position on even pages in facing pages mode
  const isEvenPage = (pageIndex + 1) % 2 === 0;
  if (pageMode === "facing" && isEvenPage) {
    if (h === "left") h = "right";
    else if (h === "right") h = "left";
  }

  let verticalClass = "";
  if (v === "top") verticalClass = "top-3";
  else if (v === "bottom") verticalClass = "bottom-3";
  else verticalClass = "top-1/2 -translate-y-1/2";

  let horizontalClass = "";
  if (h === "left") horizontalClass = "left-3";
  else if (h === "right") horizontalClass = "right-3";
  else horizontalClass = "left-1/2 -translate-x-1/2";

  return `${verticalClass} ${horizontalClass}`;
}

export default function PageNumbersPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center");
  const [pageMode, setPageMode] = useState<"single" | "facing">("single");
  const [marginType, setMarginType] = useState<"recommended" | "small" | "large">("recommended");
  
  const [fontSize, setFontSize] = useState(12);
  const [startNumber, setStartNumber] = useState(1);
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  
  const [textFormatPreset, setTextFormatPreset] = useState("{n}");
  const [customTextFormat, setCustomTextFormat] = useState("Page {n} of {m}");
  const [fontFamily, setFontFamily] = useState<"Helvetica" | "Times-Roman" | "Courier">("Helvetica");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [color, setColor] = useState("#333333");

  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingThumbs, setLoadingThumbs] = useState(false);

  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const file = files[0] ?? null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!file) {
        await Promise.resolve(); // yield to satisfy react-hooks/set-state-in-effect
        if (cancelled) return;
        setThumbnails([]);
        setTotalPages(1);
        setFromPage(1);
        setToPage(1);
        return;
      }

      await Promise.resolve(); // yield before first setState
      if (cancelled) return;
      setLoadingThumbs(true);
      setThumbnails([]);

      try {
        // Read once just for page count (pdfjs will detach this buffer)
        const countBuf = await file.arrayBuffer();
        const count = await getPDFPageCount(countBuf);
        if (cancelled) return;
        setTotalPages(count);
        setFromPage(1);
        setToPage(count);

        const thumbs: string[] = [];
        const displayLimit = Math.min(count, 12);
        for (let i = 0; i < displayLimit; i++) {
          if (cancelled) return;
          // Re-read the file for each thumbnail — pdfjs transfers (detaches) the ArrayBuffer
          const thumbBuf = await file.arrayBuffer();
          const thumb = await renderPageThumbnail(thumbBuf, i, 150);
          thumbs.push(thumb);
          // Show thumbnails progressively as they load
          if (!cancelled) setThumbnails([...thumbs]);
        }
      } catch (err) {
        console.error("Failed to load PDF preview:", err);
      } finally {
        if (!cancelled) setLoadingThumbs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(30);
    setError(null);
    try {
      const textFormat = textFormatPreset === "custom" ? customTextFormat : textFormatPreset;
      const numbered = await addPageNumbers(file, {
        position,
        fontSize,
        startNumber,
        pageMode,
        marginType,
        fromPage,
        toPage,
        textFormat,
        fontFamily,
        bold,
        italic,
        underline,
        color,
      });
      setProgress(100);
      setResult(numbered);
    } catch (err) {
      console.error(err);
      setError("Failed to add page numbers. Please ensure the file is a valid PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setProgress(0);
    setError(null);
  };

  return (
    <ToolLayout
      title="Add Page Numbers"
      description="Add page numbers to your PDF in any position with custom styling."
      wide
    >
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your PDF here"
        sublabel="Upload one PDF to add page numbers"
      />

      {file && !result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
          {/* Left Column: Interactive Previews */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--foreground)]">
                Page Previews {totalPages > 12 && <span className="text-xs font-normal text-[var(--muted-foreground)]">(Showing first 12 pages)</span>}
              </h3>
              <button
                onClick={handleReset}
                className="text-xs text-[#E8372C] hover:underline"
              >
                Clear File
              </button>
            </div>

            {loadingThumbs && (
              <div className="p-12 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--card)]">
                <p className="text-sm text-[var(--muted-foreground)]">Loading page previews...</p>
              </div>
            )}

            {!loadingThumbs && thumbnails.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto p-3 border border-[var(--border)] rounded-xl bg-[var(--card)] scrollbar-thin">
                {thumbnails.map((thumb, index) => {
                  const dotPosClass = getDotPosition(position, index, pageMode);
                  const pageNumOneBased = index + 1;
                  const isInRange = pageNumOneBased >= fromPage && pageNumOneBased <= toPage;
                  const thumbPageNum = startNumber + (pageNumOneBased - fromPage);

                  return (
                    <div
                      key={index}
                      className="group relative flex flex-col items-center gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--background)] transition-all hover:border-[var(--foreground)]"
                    >
                      <div className="relative w-full aspect-[3/4] rounded border border-[var(--border)] bg-[var(--muted)] flex items-center justify-center overflow-hidden p-1 select-none">
                        <img
                          src={thumb}
                          alt={`Page ${pageNumOneBased}`}
                          className="max-w-full max-h-full object-contain"
                        />
                        {/* Interactive Dot Overlay */}
                        {isInRange && (
                          <div
                            className={`absolute flex items-center justify-center ${dotPosClass} transition-all duration-300`}
                          >
                            <span className="relative flex h-5 w-5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-5 w-5 bg-[#E8372C] items-center justify-center text-[8.5px] font-bold text-white shadow-md">
                                {thumbPageNum}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        Page {pageNumOneBased}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Settings Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-6">
              <h3 className="font-semibold text-[var(--foreground)] border-b border-[var(--border)] pb-3">
                Page Number Options
              </h3>

              {/* Page Mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Page mode</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer select-none">
                    <input
                      type="radio"
                      name="pageMode"
                      checked={pageMode === "single"}
                      onChange={() => setPageMode("single")}
                      className="accent-[#E8372C] w-4 h-4"
                    />
                    Single page
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer select-none">
                    <input
                      type="radio"
                      name="pageMode"
                      checked={pageMode === "facing"}
                      onChange={() => setPageMode("facing")}
                      className="accent-[#E8372C] w-4 h-4"
                    />
                    Facing pages
                  </label>
                </div>
              </div>

              {/* Position and Margin Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* 3x3 Position Grid */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--foreground)]">Position</label>
                  <div className="grid grid-cols-3 gap-1.5 w-32 h-32 border border-[var(--border)] rounded-lg p-2 bg-[var(--background)]">
                    {GRID_CELLS.map((cell) => (
                      <button
                        key={cell.id}
                        onClick={() => setPosition(cell.id)}
                        type="button"
                        title={cell.label}
                        className={`relative rounded flex items-center justify-center border transition-all hover:bg-[var(--muted)] ${
                          position === cell.id
                            ? "border-[#E8372C] bg-red-500/10"
                            : "border-transparent"
                        }`}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            position === cell.id ? "bg-[#E8372C] scale-125" : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Margin & First Number */}
                <div className="flex flex-col justify-between py-1">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)]">Margin</label>
                    <select
                      value={marginType}
                      onChange={(e) => setMarginType(e.target.value as "recommended" | "small" | "large")}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                    >
                      <option value="recommended">Recommended</option>
                      <option value="small">Small</option>
                      <option value="large">Big</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)]">First number</label>
                    <input
                      type="number"
                      min={0}
                      value={startNumber}
                      onChange={(e) => setStartNumber(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                    />
                  </div>
                </div>
              </div>

              {/* Which pages to number */}
              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Which pages do you want to number?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">from page</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={fromPage}
                      onChange={(e) => setFromPage(Math.max(1, Math.min(totalPages, Number(e.target.value))))}
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">to</span>
                    <input
                      type="number"
                      min={fromPage}
                      max={totalPages}
                      value={toPage}
                      onChange={(e) => setToPage(Math.max(fromPage, Math.min(totalPages, Number(e.target.value))))}
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                    />
                  </div>
                </div>
              </div>

              {/* Text formatting details */}
              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--foreground)]">Text template</label>
                  <select
                    value={textFormatPreset}
                    onChange={(e) => setTextFormatPreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                  >
                    <option value="{n}">Insert only page number (recommended)</option>
                    <option value="Page {n}">Page {"{n}"}</option>
                    <option value="Page {n} of {m}">Page {"{n}"} of {"{m}"}</option>
                    <option value="custom">Custom format...</option>
                  </select>
                </div>

                {textFormatPreset === "custom" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)]">
                      Custom pattern (use {"{n}"} for page, {"{m}"} for total)
                    </label>
                    <input
                      type="text"
                      value={customTextFormat}
                      onChange={(e) => setCustomTextFormat(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)]">Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as "Helvetica" | "Times-Roman" | "Courier")}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                    >
                      <option value="Helvetica">Arial (Helvetica)</option>
                      <option value="Times-Roman">Times New Roman</option>
                      <option value="Courier">Courier</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)]">Font Size</label>
                    <input
                      type="number"
                      min={6}
                      max={72}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBold(!bold)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-bold transition-all ${
                        bold
                          ? "bg-[#E8372C] border-[#E8372C] text-white"
                          : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                      }`}
                      title="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => setItalic(!italic)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm italic transition-all ${
                        italic
                          ? "bg-[#E8372C] border-[#E8372C] text-white"
                          : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                      }`}
                      title="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnderline(!underline)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm underline transition-all ${
                        underline
                          ? "bg-[#E8372C] border-[#E8372C] text-white"
                          : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                      }`}
                      title="Underline"
                    >
                      U
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-[var(--foreground)] mr-1">Color</label>
                    <div className="flex items-center gap-1 bg-[var(--muted)] p-1 rounded-lg border border-[var(--border)]">
                      {["#000000", "#666666", "#E8372C", "#1E40AF", "#15803D"].map((presetColor) => (
                        <button
                          key={presetColor}
                          type="button"
                          onClick={() => setColor(presetColor)}
                          className={`w-5 h-5 rounded-full border transition-all ${
                            color === presetColor
                              ? "border-[var(--foreground)] scale-110"
                              : "border-transparent"
                          }`}
                          style={{ backgroundColor: presetColor }}
                          title={presetColor}
                        />
                      ))}
                      <div className="relative w-5 h-5 rounded-full overflow-hidden border border-gray-300 cursor-pointer">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="absolute inset-0 w-8 h-8 -translate-x-1.5 -translate-y-1.5 cursor-pointer p-0 border-0"
                          title="Custom Color"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {processing && <ProgressBar progress={progress} label="Adding page numbers..." />}

            {error && (
              <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                {error}
              </p>
            )}

            <button
              onClick={handleProcess}
              disabled={processing || loadingThumbs}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
            >
              <Hash className="w-5 h-5" />
              {processing ? "Adding Numbers..." : "Add Page Numbers"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <DownloadButton
          data={result}
          filename={`numbered_${file?.name ?? "output.pdf"}`}
          fileSize={result.length}
          onReset={handleReset}
          label="Download PDF"
        />
      )}
    </ToolLayout>
  );
}
