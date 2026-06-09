"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { ChevronLeft, ChevronRight, RotateCcw, Info, Scissors } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CropRect {
  x: number; // 0–1 relative to preview image
  y: number;
  w: number;
  h: number;
}

type Handle =
  | "tl" | "tc" | "tr"
  | "ml" | "mr"
  | "bl" | "bc" | "br"
  | "move";

const HANDLE_SIZE = 10; // px, half-size of hit area

// ─── Component ────────────────────────────────────────────────────────────────
export default function CropPDFPage() {
  /* ── file / page state ── */
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed
  const [pageImages, setPageImages] = useState<Record<number, string>>({}); // cache
  const [loadingPage, setLoadingPage] = useState(false);
  const [pdfBuffer, setPdfBuffer] = useState<Uint8Array | null>(null);

  /* ── crop state ── */
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [applyToAll, setApplyToAll] = useState(true);

  /* ── drag state ── */
  const dragging = useRef<{ handle: Handle; startX: number; startY: number; initRect: CropRect } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  /* ── output state ── */
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── Load page image ────────────────────────────────────────────────────────
  // Accepts Uint8Array — renderPageThumbnail calls .slice() internally so the
  // underlying buffer is never transferred/detached.
  const loadPage = useCallback(async (buf: Uint8Array, idx: number) => {
    if (pageImages[idx]) return;
    setLoadingPage(true);
    try {
      const img = await renderPageThumbnail(buf, idx, 900);
      setPageImages((prev) => ({ ...prev, [idx]: img }));
    } catch {
      setError("Failed to render page.");
    } finally {
      setLoadingPage(false);
    }
  }, [pageImages]);

  // ── File change ────────────────────────────────────────────────────────────
  const handleFilesChange = async (newFiles: File[]) => {
    const f = newFiles[0];
    if (!f) { setFile(null); return; }
    setFile(f);
    setResult(null);
    setError(null);
    setPageImages({});
    setCurrentPage(0);
    setCropRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
    try {
      // Copy to Uint8Array immediately — pdfjs transfers ArrayBuffers on load
      // which would detach the buffer and break subsequent calls.
      const rawBuf = await f.arrayBuffer();
      const uint8 = new Uint8Array(rawBuf);
      setPdfBuffer(uint8);
      const count = await getPDFPageCount(uint8);
      setPageCount(count);
      await loadPage(uint8, 0);
    } catch {
      setError("Failed to load PDF.");
    }
  };

  // ── Page navigation ────────────────────────────────────────────────────────
  const goToPage = async (idx: number) => {
    if (!pdfBuffer) return;
    setError(null);
    setCurrentPage(idx);
    if (!pageImages[idx]) await loadPage(pdfBuffer, idx);
  };

  // ── Pointer helpers ────────────────────────────────────────────────────────
  const getRelPos = (e: React.PointerEvent | PointerEvent) => {
    const el = previewRef.current;
    if (!el) return { rx: 0, ry: 0 };
    const rect = el.getBoundingClientRect();
    return {
      rx: (e.clientX - rect.left) / rect.width,
      ry: (e.clientY - rect.top) / rect.height,
    };
  };

  const hitHandle = (rx: number, ry: number, cr: CropRect): Handle | null => {
    const el = previewRef.current;
    if (!el) return null;
    const W = el.clientWidth;
    const H = el.clientHeight;
    const px = rx * W;
    const py = ry * H;
    const hs = HANDLE_SIZE;

    const handles: { h: Handle; cx: number; cy: number }[] = [
      { h: "tl", cx: cr.x * W, cy: cr.y * H },
      { h: "tc", cx: (cr.x + cr.w / 2) * W, cy: cr.y * H },
      { h: "tr", cx: (cr.x + cr.w) * W, cy: cr.y * H },
      { h: "ml", cx: cr.x * W, cy: (cr.y + cr.h / 2) * H },
      { h: "mr", cx: (cr.x + cr.w) * W, cy: (cr.y + cr.h / 2) * H },
      { h: "bl", cx: cr.x * W, cy: (cr.y + cr.h) * H },
      { h: "bc", cx: (cr.x + cr.w / 2) * W, cy: (cr.y + cr.h) * H },
      { h: "br", cx: (cr.x + cr.w) * W, cy: (cr.y + cr.h) * H },
    ];

    for (const { h, cx, cy } of handles) {
      if (Math.abs(px - cx) <= hs && Math.abs(py - cy) <= hs) return h;
    }

    // Inside box → move
    if (rx >= cr.x && rx <= cr.x + cr.w && ry >= cr.y && ry <= cr.y + cr.h) return "move";
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { rx, ry } = getRelPos(e);
    const handle = hitHandle(rx, ry, cropRect);
    if (!handle) {
      // Start new crop selection
      setCropRect({ x: rx, y: ry, w: 0, h: 0 });
      dragging.current = { handle: "br", startX: rx, startY: ry, initRect: { x: rx, y: ry, w: 0, h: 0 } };
    } else {
      dragging.current = { handle, startX: rx, startY: ry, initRect: { ...cropRect } };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const { rx, ry } = getRelPos(e);
    const { handle, startX, startY, initRect } = dragging.current;
    const dx = rx - startX;
    const dy = ry - startY;

    setCropRect((prev) => {
      let { x, y, w, h } = initRect;
      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      const MIN = 0.02;

      switch (handle) {
        case "tl": x = clamp(x + dx); y = clamp(y + dy); w = clamp(initRect.w - dx); h = clamp(initRect.h - dy); break;
        case "tc": y = clamp(y + dy); h = clamp(initRect.h - dy); break;
        case "tr": w = clamp(initRect.w + dx); y = clamp(y + dy); h = clamp(initRect.h - dy); break;
        case "ml": x = clamp(x + dx); w = clamp(initRect.w - dx); break;
        case "mr": w = clamp(initRect.w + dx); break;
        case "bl": x = clamp(x + dx); w = clamp(initRect.w - dx); h = clamp(initRect.h + dy); break;
        case "bc": h = clamp(initRect.h + dy); break;
        case "br": w = clamp(initRect.w + dx); h = clamp(initRect.h + dy); break;
        case "move":
          x = clamp(x + dx);
          y = clamp(y + dy);
          // keep within bounds
          if (x + w > 1) x = 1 - w;
          if (y + h > 1) y = 1 - h;
          break;
      }
      if (w < MIN) w = MIN;
      if (h < MIN) h = MIN;
      return { x, y, w, h };
    });
  }, []);

  const onPointerUp = useCallback(() => { dragging.current = null; }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  // cursor style
  const getCursor = useCallback((e: React.PointerEvent) => {
    if (dragging.current) return;
    const { rx, ry } = getRelPos(e);
    const h = hitHandle(rx, ry, cropRect);
    const cursors: Record<Handle, string> = {
      tl: "nwse-resize", tc: "ns-resize", tr: "nesw-resize",
      ml: "ew-resize", mr: "ew-resize",
      bl: "nesw-resize", bc: "ns-resize", br: "nwse-resize",
      move: "move",
    };
    if (previewRef.current) {
      previewRef.current.style.cursor = h ? cursors[h] : "crosshair";
    }
  }, [cropRect]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFile(null);
    setPageImages({});
    setResult(null);
    setError(null);
    setProgress(0);
    setPageCount(0);
    setCurrentPage(0);
    setPdfBuffer(null);
    setCropRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  };

  // ── Process ────────────────────────────────────────────────────────────────
  const handleProcess = async () => {
    if (!file || !pdfBuffer) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const pdf = await PDFDocument.load(pdfBuffer.slice());
      setProgress(40);

      const pagesToCrop = applyToAll
        ? pdf.getPages()
        : [pdf.getPages()[currentPage]];

      for (const page of pagesToCrop) {
        const { width, height } = page.getSize();
        const l = cropRect.x * width;
        const b = (1 - cropRect.y - cropRect.h) * height;
        const w = Math.max(1, cropRect.w * width);
        const h = Math.max(1, cropRect.h * height);
        page.setCropBox(l, b, w, h);
      }

      setProgress(80);
      const saved = await pdf.save();
      setResult(saved);
      setOutputName(`${getFileNameWithoutExtension(file.name)}-cropped.pdf`);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to crop PDF.");
    } finally {
      setProcessing(false);
    }
  };

  // ── Handle positions for rendering ────────────────────────────────────────
  const handles: { id: Handle; xPct: number; yPct: number }[] = [
    { id: "tl", xPct: cropRect.x, yPct: cropRect.y },
    { id: "tc", xPct: cropRect.x + cropRect.w / 2, yPct: cropRect.y },
    { id: "tr", xPct: cropRect.x + cropRect.w, yPct: cropRect.y },
    { id: "ml", xPct: cropRect.x, yPct: cropRect.y + cropRect.h / 2 },
    { id: "mr", xPct: cropRect.x + cropRect.w, yPct: cropRect.y + cropRect.h / 2 },
    { id: "bl", xPct: cropRect.x, yPct: cropRect.y + cropRect.h },
    { id: "bc", xPct: cropRect.x + cropRect.w / 2, yPct: cropRect.y + cropRect.h },
    { id: "br", xPct: cropRect.x + cropRect.w, yPct: cropRect.y + cropRect.h },
  ];

  const currentImage = pageImages[currentPage];

  // ── Render ─────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <ToolLayout
      toolId="crop-pdf" title="Crop PDF" description="Remove margins and crop PDF pages to your specification.">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
          <DownloadButton
            data={result}
            filename={outputName}
            fileSize={result.length}
            onReset={handleReset}
            label="Download Cropped PDF"
          />
        </div>
      </ToolLayout>
    );
  }

  if (!file) {
    return (
      <ToolLayout title="Crop PDF" description="Remove margins and crop PDF pages to your specification.">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <FileUploader
            files={[]}
            onFilesChange={handleFilesChange}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            label="Drag & drop your PDF here"
            sublabel="or click to browse"
          />
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </ToolLayout>
    );
  }

  // ── Full interactive crop UI ───────────────────────────────────────────────
  return (
    <ToolLayout title="Crop PDF" description="Remove margins and crop PDF pages to your specification." wide>
      <div className="flex gap-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden" style={{ minHeight: 580 }}>

        {/* ── Left: PDF preview + crop overlay ── */}
        <div className="flex-1 flex flex-col bg-[#3a3a3a] dark:bg-[#1e1e1e]">
          {/* Preview area */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
            {loadingPage || !currentImage ? (
              <div className="flex flex-col items-center gap-3 text-white/50">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <span className="text-sm">Loading page…</span>
              </div>
            ) : (
              <div className="relative select-none" style={{ maxWidth: "100%", maxHeight: "calc(100vh - 260px)" }}>
                {/* The actual PDF image */}
                <img
                  src={currentImage}
                  alt={`Page ${currentPage + 1}`}
                  className="block shadow-2xl"
                  style={{ maxWidth: "100%", maxHeight: "calc(100vh - 260px)", objectFit: "contain" }}
                  draggable={false}
                />

                {/* Overlay container — absolutely positioned over the image */}
                <div
                  ref={previewRef}
                  className="absolute inset-0"
                  onPointerDown={onPointerDown}
                  onPointerMove={getCursor}
                  style={{ cursor: "crosshair" }}
                >
                  {/* Dark mask outside the crop rect */}
                  {/* Top */}
                  <div className="absolute bg-black/50 pointer-events-none" style={{ top: 0, left: 0, right: 0, height: `${cropRect.y * 100}%` }} />
                  {/* Bottom */}
                  <div className="absolute bg-black/50 pointer-events-none" style={{ bottom: 0, left: 0, right: 0, top: `${(cropRect.y + cropRect.h) * 100}%` }} />
                  {/* Left */}
                  <div className="absolute bg-black/50 pointer-events-none" style={{ top: `${cropRect.y * 100}%`, bottom: `${(1 - cropRect.y - cropRect.h) * 100}%`, left: 0, width: `${cropRect.x * 100}%` }} />
                  {/* Right */}
                  <div className="absolute bg-black/50 pointer-events-none" style={{ top: `${cropRect.y * 100}%`, bottom: `${(1 - cropRect.y - cropRect.h) * 100}%`, right: 0, left: `${(cropRect.x + cropRect.w) * 100}%` }} />

                  {/* Crop border */}
                  <div
                    className="absolute border-2 border-white pointer-events-none"
                    style={{
                      left: `${cropRect.x * 100}%`,
                      top: `${cropRect.y * 100}%`,
                      width: `${cropRect.w * 100}%`,
                      height: `${cropRect.h * 100}%`,
                    }}
                  />

                  {/* Rule-of-thirds grid lines */}
                  <div className="absolute pointer-events-none"
                    style={{
                      left: `${cropRect.x * 100}%`,
                      top: `${cropRect.y * 100}%`,
                      width: `${cropRect.w * 100}%`,
                      height: `${cropRect.h * 100}%`,
                    }}>
                    <div className="absolute inset-0">
                      <div className="absolute top-1/3 left-0 right-0 border-t border-white/20" />
                      <div className="absolute top-2/3 left-0 right-0 border-t border-white/20" />
                      <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/20" />
                      <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/20" />
                    </div>
                  </div>

                  {/* Handles */}
                  {handles.map(({ id, xPct, yPct }) => (
                    <div
                      key={id}
                      className="absolute"
                      style={{
                        left: `${xPct * 100}%`,
                        top: `${yPct * 100}%`,
                        transform: "translate(-50%, -50%)",
                        width: 12,
                        height: 12,
                        background: "#2196f3",
                        border: "2px solid white",
                        borderRadius: 2,
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Page navigation bar ── */}
          {pageCount > 0 && (
            <div className="flex items-center justify-center gap-3 py-3 border-t border-white/10 bg-black/30">
              <button
                onClick={() => currentPage > 0 && goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-white/70 text-sm tabular-nums">
                <span className="text-white font-medium">{currentPage + 1}</span>
                <span className="mx-1">/</span>
                {pageCount}
              </span>

              <button
                onClick={() => currentPage < pageCount - 1 && goToPage(currentPage + 1)}
                disabled={currentPage === pageCount - 1}
                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-72 shrink-0 flex flex-col border-l border-[var(--border)] bg-[var(--card)]">
          <div className="flex-1 p-5 space-y-5 overflow-y-auto">

            {/* Hint */}
            <div className="flex gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3.5 text-sm text-blue-700 dark:text-blue-300">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Click and drag to select the area you want to keep. Resize if needed.</p>
            </div>

            {/* Reset */}
            <div className="flex justify-end">
              <button
                onClick={() => setCropRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })}
                className="flex items-center gap-1.5 text-sm font-medium text-[#E8372C] hover:text-[#c42d22] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset all
              </button>
            </div>

            {/* Crop coordinates readout */}
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Crop Area</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(["x", "y", "w", "h"] as const).map((k) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-[var(--muted-foreground)] capitalize">
                      {k === "x" ? "Left" : k === "y" ? "Top" : k === "w" ? "Width" : "Height"}
                    </span>
                    <span className="font-medium text-[var(--foreground)]">{Math.round(cropRect[k] * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pages scope */}
            <div className="space-y-2.5">
              <p className="text-sm font-semibold text-[var(--foreground)]">Pages:</p>
              <div className="flex gap-4">
                {[
                  { label: "All pages", value: true },
                  { label: "Current page", value: false },
                ].map(({ label, value }) => (
                  <label key={label} className="flex items-center gap-2 cursor-pointer">
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        applyToAll === value
                          ? "border-[#E8372C] bg-[#E8372C]"
                          : "border-[var(--border)]"
                      }`}
                      onClick={() => setApplyToAll(value)}
                    >
                      {applyToAll === value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span
                      className="text-sm text-[var(--foreground)] cursor-pointer"
                      onClick={() => setApplyToAll(value)}
                    >
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {processing && <ProgressBar progress={progress} label="Applying crop…" />}

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* ── CTA ── */}
          <div className="p-5 border-t border-[var(--border)]">
            <button
              onClick={handleProcess}
              disabled={processing}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-bold text-base transition-all hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.98]"
            >
              <Scissors className="w-5 h-5" />
              {processing ? "Cropping…" : "Crop PDF"}
            </button>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
