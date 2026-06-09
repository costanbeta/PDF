"use client";

import { useState, useEffect, useRef } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { addWatermark, type WatermarkOptions, type WatermarkPosition, type WatermarkLayer } from "@/lib/pdf/watermark";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { Stamp, Type, ImageIcon, ImagePlus, Layers } from "lucide-react";

const GRID_CELLS: { id: WatermarkPosition; label: string }[] = [
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

const TRANSPARENCY_OPTIONS = [
  { value: 100, label: "No transparency" },
  { value: 75, label: "25% transparent" },
  { value: 50, label: "50% transparent" },
  { value: 25, label: "75% transparent" },
  { value: 10, label: "90% transparent" },
];

const ROTATION_OPTIONS = [
  { value: 0, label: "Do not rotate" },
  { value: 45, label: "45° clockwise" },
  { value: -45, label: "45° counter-clockwise" },
  { value: 90, label: "90° clockwise" },
  { value: -90, label: "90° counter-clockwise" },
];

function getPreviewPosition(pos: WatermarkPosition): React.CSSProperties {
  const [v, h] = pos.split("-");
  const style: React.CSSProperties = { position: "absolute" };
  if (v === "top") style.top = "8%";
  else if (v === "bottom") style.bottom = "8%";
  else { style.top = "50%"; style.transform = "translateY(-50%)"; }

  if (h === "left") style.left = "5%";
  else if (h === "right") style.right = "5%";
  else { style.left = "50%"; style.transform = (style.transform ?? "") + " translateX(-50%)"; }

  return style;
}

export default function WatermarkPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"text" | "image">("text");

  // Text options
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState<"Helvetica" | "Times-Roman" | "Courier">("Helvetica");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [color, setColor] = useState("#E8372C");

  // Image options
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Shared options
  const [opacity, setOpacity] = useState(75);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState<WatermarkPosition>("middle-center");
  const [mosaic, setMosaic] = useState(false);
  const [layer, setLayer] = useState<WatermarkLayer>("over");
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Thumbnails
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(false);

  // Processing
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const file = files[0] ?? null;

  // Load thumbnails when file changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!file) {
        if (!cancelled) { setThumbnails([]); setTotalPages(1); setFromPage(1); setToPage(1); }
        return;
      }
      if (!cancelled) setLoadingThumbs(true);
      setThumbnails([]);
      try {
        const countBuf = await file.arrayBuffer();
        const count = await getPDFPageCount(countBuf);
        if (cancelled) return;
        setTotalPages(count);
        setFromPage(1);
        setToPage(count);

        const thumbs: string[] = [];
        const limit = Math.min(count, 6);
        for (let i = 0; i < limit; i++) {
          if (cancelled) return;
          const buf = await file.arrayBuffer();
          const thumb = await renderPageThumbnail(buf, i, 160);
          thumbs.push(thumb);
          if (!cancelled) setThumbnails([...thumbs]);
        }
      } catch (e) {
        console.error("Thumbnail error:", e);
      } finally {
        if (!cancelled) setLoadingThumbs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageFile(f);
      const url = URL.createObjectURL(f);
      setImagePreviewUrl(url);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    if (mode === "text" && !text.trim()) return;
    if (mode === "image" && !imageFile) return;

    setProcessing(true);
    setProgress(20);
    setError(null);
    try {
      const opts: WatermarkOptions = {
        mode,
        text,
        fontSize,
        fontFamily,
        bold,
        italic,
        color,
        imageFile: imageFile ?? undefined,
        opacity,
        rotation,
        position,
        mosaic,
        layer,
        fromPage,
        toPage,
      };
      setProgress(50);
      const watermarked = await addWatermark(file, opts);
      setProgress(100);
      setResult(watermarked);
    } catch {
      setError("Failed to add watermark. Please ensure the file is a valid PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setProgress(0);
    setError(null);
    setImageFile(null);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const isReady = file && (mode === "text" ? !!text.trim() : !!imageFile);

  return (
    <ToolLayout
      toolId="watermark"
      title="Add Watermark"
      description="Stamp a text or image watermark on every page of your PDF."
      wide
    >
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your PDF here"
        sublabel="Upload one PDF to watermark"
      />

      {file && !result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">

          {/* ── Left: Page Previews ── */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--foreground)]">
                Preview {totalPages > 6 && <span className="text-xs font-normal text-[var(--muted-foreground)]">(First 6 pages)</span>}
              </h3>
              <button onClick={handleReset} className="text-xs text-[#E8372C] hover:underline">Clear File</button>
            </div>

            {loadingThumbs && (
              <div className="p-12 text-center border border-dashed border-[var(--border)] rounded-xl bg-[var(--card)]">
                <p className="text-sm text-[var(--muted-foreground)]">Loading previews…</p>
              </div>
            )}

            {!loadingThumbs && thumbnails.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-3 border border-[var(--border)] rounded-xl bg-[var(--card)]">
                {thumbnails.map((thumb, index) => {
                  const pageNum = index + 1;
                  const inRange = pageNum >= fromPage && pageNum <= toPage;
                  const previewStyle = getPreviewPosition(position);
                  const rotStyle: React.CSSProperties = {
                    transform: `rotate(${rotation}deg) ${previewStyle.transform ?? ""}`,
                    transformOrigin: "center",
                    opacity: opacity / 100,
                  };
                  // Merge transform carefully
                  const overlayStyle: React.CSSProperties = {
                    ...previewStyle,
                    transform: undefined,
                  };

                  return (
                    <div
                      key={index}
                      className="relative flex flex-col items-center gap-1 p-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)]"
                    >
                      <div className="relative w-full aspect-[3/4] rounded overflow-hidden border border-[var(--border)] bg-[var(--muted)]">
                        <img src={thumb} alt={`Page ${pageNum}`} className="w-full h-full object-contain" />

                        {inRange && (
                          <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
                            <div style={overlayStyle}>
                              {mode === "text" ? (
                                <span
                                  style={{
                                    display: "inline-block",
                                    fontSize: Math.min(14, fontSize / 4),
                                    fontWeight: bold ? "bold" : "normal",
                                    fontStyle: italic ? "italic" : "normal",
                                    color,
                                    opacity: opacity / 100,
                                    transform: `rotate(${rotation}deg)`,
                                    transformOrigin: "center",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {mosaic ? (
                                    <span className="flex flex-wrap gap-1">
                                      {[0, 1, 2].map((i) => (
                                        <span key={i} style={{ margin: "2px 4px", display: "block" }}>{text}</span>
                                      ))}
                                    </span>
                                  ) : text}
                                </span>
                              ) : imagePreviewUrl ? (
                                <img
                                  src={imagePreviewUrl}
                                  alt="watermark"
                                  style={{
                                    maxWidth: 32,
                                    maxHeight: 32,
                                    opacity: opacity / 100,
                                    transform: `rotate(${rotation}deg)`,
                                  }}
                                />
                              ) : null}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">Page {pageNum}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right: Settings Sidebar ── */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-5">
              <h3 className="font-semibold text-[var(--foreground)] border-b border-[var(--border)] pb-3">
                Watermark Options
              </h3>

              {/* Mode Tabs */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode("text")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    mode === "text"
                      ? "bg-[#E8372C] text-white border-[#E8372C]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                  }`}
                >
                  <Type className="w-4 h-4" />
                  Place text
                </button>
                <button
                  onClick={() => setMode("image")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    mode === "image"
                      ? "bg-[#E8372C] text-white border-[#E8372C]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Place image
                </button>
              </div>

              {/* ── TEXT mode ── */}
              {mode === "text" && (
                <div className="space-y-4">
                  {/* Text input */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--foreground)]">Text</label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="e.g. CONFIDENTIAL, DRAFT"
                      className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                    />
                  </div>

                  {/* Text format row */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--foreground)]">Text format</label>
                    <div className="flex items-center gap-2">
                      {/* Font family */}
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as "Helvetica" | "Times-Roman" | "Courier")}
                        className="flex-1 px-2 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                      >
                        <option value="Helvetica">Arial</option>
                        <option value="Times-Roman">Times</option>
                        <option value="Courier">Courier</option>
                      </select>
                      {/* Font size */}
                      <input
                        type="number"
                        min={8}
                        max={120}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-16 px-2 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                      />
                      {/* B I U */}
                      {(["B", "I"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => f === "B" ? setBold(!bold) : setItalic(!italic)}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg border text-sm font-bold transition-all ${
                            (f === "B" ? bold : italic)
                              ? "bg-[#E8372C] border-[#E8372C] text-white"
                              : "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                          } ${f === "I" ? "italic" : ""}`}
                        >
                          {f}
                        </button>
                      ))}
                      {/* Color picker */}
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-[var(--border)] cursor-pointer flex-shrink-0">
                        <div
                          className="absolute inset-0"
                          style={{ backgroundColor: color }}
                        />
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── IMAGE mode ── */}
              {mode === "image" && (
                <div className="space-y-3">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleImagePick}
                  />
                  {imagePreviewUrl ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                      <img src={imagePreviewUrl} alt="Watermark" className="h-12 w-12 object-contain rounded border border-[var(--border)]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{imageFile?.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{((imageFile?.size ?? 0) / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        onClick={() => {
                          setImageFile(null);
                          setImagePreviewUrl((prev) => {
                            if (prev) URL.revokeObjectURL(prev);
                            return null;
                          });
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                        className="text-xs text-red-500 hover:underline flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:border-[#E8372C] hover:text-[#E8372C] transition-all"
                    >
                      <ImagePlus className="w-4 h-4" />
                      Add Image (PNG / JPG)
                    </button>
                  )}
                </div>
              )}

              {/* ── Position Grid + Mosaic ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--foreground)]">Position</label>
                  <label className="flex items-center gap-1.5 text-sm text-[var(--foreground)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mosaic}
                      onChange={(e) => setMosaic(e.target.checked)}
                      className="accent-[#E8372C] w-3.5 h-3.5"
                    />
                    Mosaic
                  </label>
                </div>
                <div
                  className={`grid grid-cols-3 gap-1.5 w-28 h-28 border border-[var(--border)] rounded-lg p-2 bg-[var(--background)] ${mosaic ? "opacity-40 pointer-events-none" : ""}`}
                >
                  {GRID_CELLS.map((cell) => (
                    <button
                      key={cell.id}
                      onClick={() => setPosition(cell.id)}
                      type="button"
                      title={cell.label}
                      disabled={mosaic}
                      className={`rounded flex items-center justify-center border transition-all hover:bg-[var(--muted)] ${
                        position === cell.id
                          ? "border-[#E8372C] bg-red-500/10"
                          : "border-transparent"
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full transition-all ${position === cell.id ? "bg-[#E8372C] scale-125" : "bg-gray-300 dark:bg-gray-600"}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Transparency + Rotation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Transparency</label>
                  <select
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full px-2 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                  >
                    {TRANSPARENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Rotation</label>
                  <select
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full px-2 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                  >
                    {ROTATION_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pages */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Pages</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">from page</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={fromPage}
                    onChange={(e) => setFromPage(Math.max(1, Math.min(totalPages, Number(e.target.value))))}
                    className="w-16 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                  />
                  <span className="text-xs text-[var(--muted-foreground)]">to</span>
                  <input
                    type="number"
                    min={fromPage}
                    max={totalPages}
                    value={toPage}
                    onChange={(e) => setToPage(Math.max(fromPage, Math.min(totalPages, Number(e.target.value))))}
                    className="w-16 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                  />
                  <span className="text-xs text-[var(--muted-foreground)]">of {totalPages}</span>
                </div>
              </div>

              {/* Layer */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Layer
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["over", "below"] as WatermarkLayer[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLayer(l)}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        layer === l
                          ? "bg-[#E8372C] text-white border-[#E8372C]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                      }`}
                    >
                      {l === "over" ? "Over the PDF" : "Below the PDF"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress */}
            {processing && <ProgressBar progress={progress} label="Adding watermark…" />}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleProcess}
              disabled={processing || !isReady}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
            >
              <Stamp className="w-5 h-5" />
              {processing ? "Adding Watermark…" : "Add Watermark"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <DownloadButton
          data={result}
          filename={`watermarked_${file?.name ?? "output.pdf"}`}
          fileSize={result.length}
          onReset={handleReset}
          label="Download Watermarked PDF"
        />
      )}
    </ToolLayout>
  );
}
