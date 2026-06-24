"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { downloadBlob } from "@/lib/utils";
import { QrCode, Download, FileImage, FilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Format = "png" | "svg";
type ECC = "L" | "M" | "Q" | "H";
type ActiveTab = "generate" | "embed";

const SIZE_PRESETS = [
  { label: "XS", value: 100, desc: "100×100" },
  { label: "SM", value: 200, desc: "200×200" },
  { label: "MD", value: 300, desc: "300×300" },
  { label: "LG", value: 400, desc: "400×400" },
  { label: "XL", value: 500, desc: "500×500" },
  { label: "HD", value: 1000, desc: "1000×1000" },
];

const ECC_OPTIONS: { value: ECC; label: string; desc: string }[] = [
  { value: "L", label: "L", desc: "~7% recovery" },
  { value: "M", label: "M", desc: "~15% recovery" },
  { value: "Q", label: "Q", desc: "~25% recovery" },
  { value: "H", label: "H", desc: "~30% recovery" },
];

const EMBED_POSITIONS = [
  { id: "bottom-right", label: "Bottom Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "top-right", label: "Top Right" },
  { id: "top-left", label: "Top Left" },
  { id: "center", label: "Center" },
] as const;

type EmbedPosition = typeof EMBED_POSITIONS[number]["id"];

async function generateQrDataUrl(
  data: string,
  size: number,
  format: Format,
  fgColor: string,
  bgColor: string,
  ecc: ECC,
  margin: number
): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  if (format === "svg") {
    const svg = await QRCode.toString(data, {
      type: "svg",
      errorCorrectionLevel: ecc,
      width: size,
      margin,
      color: { dark: fgColor, light: bgColor },
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: ecc,
    width: size,
    margin,
    color: { dark: fgColor, light: bgColor },
  });
}

export default function QRCodePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("generate");

  const [qrData, setQrData] = useState("https://pdfcraft.qzz.io");
  const [format, setFormat] = useState<Format>("png");
  const [size, setSize] = useState(300);
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [ecc, setEcc] = useState<ECC>("M");
  const [margin, setMargin] = useState(4);

  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [embedPosition, setEmbedPosition] = useState<EmbedPosition>("bottom-right");
  const [embedSize, setEmbedSize] = useState(80);
  const [embedResult, setEmbedResult] = useState<Uint8Array | null>(null);
  const [embedProcessing, setEmbedProcessing] = useState(false);
  const [embedProgress, setEmbedProgress] = useState(0);
  const [embedError, setEmbedError] = useState<string | null>(null);

  const generatePreview = useCallback(async () => {
    if (!qrData.trim()) return;
    setPreviewLoading(true);
    setPreviewError(false);
    try {
      const url = await generateQrDataUrl(qrData, Math.min(size, 400), format, fgColor, bgColor, ecc, margin);
      setPreviewUrl(url);
    } catch {
      setPreviewError(true);
    } finally {
      setPreviewLoading(false);
    }
  }, [qrData, size, format, fgColor, bgColor, ecc, margin]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(generatePreview, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [generatePreview]);

  const handleDownload = async () => {
    if (!qrData.trim()) return;
    try {
      const dataUrl = await generateQrDataUrl(qrData, size, format, fgColor, bgColor, ecc, margin);
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      const ext = format === "svg" ? "svg" : "png";
      downloadBlob(blob, `qrcode_${size}x${size}.${ext}`);
    } catch {
      setPreviewError(true);
    }
  };

  const handleEmbedInPDF = async () => {
    const file = pdfFiles[0];
    if (!file || !qrData.trim()) return;
    setEmbedProcessing(true);
    setEmbedProgress(10);
    setEmbedError(null);
    try {
      // Generate QR as PNG data URL then convert to ArrayBuffer
      const QRCode = (await import("qrcode")).default;
      const dataUrl: string = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: ecc,
        width: embedSize * 2,
        margin: 1,
        color: { dark: fgColor, light: bgColor },
      });
      const resp = await fetch(dataUrl);
      const qrArrayBuffer = await resp.arrayBuffer();
      setEmbedProgress(35);

      const { PDFDocument } = await import("pdf-lib");
      const pdfBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(pdfBuffer);
      setEmbedProgress(55);

      const qrImage = await pdf.embedPng(qrArrayBuffer);
      const pages = pdf.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        const sz = embedSize;
        const pad = 12;
        let x = 0, y = 0;
        switch (embedPosition) {
          case "bottom-right": x = width - sz - pad; y = pad; break;
          case "bottom-left":  x = pad; y = pad; break;
          case "top-right":    x = width - sz - pad; y = height - sz - pad; break;
          case "top-left":     x = pad; y = height - sz - pad; break;
          case "center":       x = (width - sz) / 2; y = (height - sz) / 2; break;
        }
        page.drawImage(qrImage, { x, y, width: sz, height: sz });
      }

      setEmbedProgress(90);
      const result = await pdf.save();
      setEmbedProgress(100);
      setEmbedResult(result);
    } catch (e) {
      setEmbedError(e instanceof Error ? e.message : "Failed to embed QR code.");
    } finally {
      setEmbedProcessing(false);
    }
  };

  const handleEmbedReset = () => {
    setPdfFiles([]);
    setEmbedResult(null);
    setEmbedProgress(0);
    setEmbedError(null);
  };

  const pdfFile = pdfFiles[0] ?? null;

  return (
    <ToolLayout
      toolId="qr-code"
      title="QR Code Generator"
      description="Generate high-quality QR codes in PNG or SVG format, then optionally embed them into any PDF."
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
        {([
          { id: "generate" as ActiveTab, label: "Generate QR Code", icon: QrCode },
          { id: "embed" as ActiveTab, label: "Embed into PDF", icon: FilePlus },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all",
              activeTab === id
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Settings */}
        <div className="space-y-5">
          {/* Data input */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-5">
            <h3 className="font-semibold text-[var(--foreground)]">QR Code Content</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Text / URL</label>
              <textarea
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="https://example.com or any text..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C] resize-none transition-colors"
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                {qrData.length} characters · Supports URL, text, email, phone, vCard
              </p>
            </div>
          </div>

          {/* Format & Size */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-5">
            <h3 className="font-semibold text-[var(--foreground)]">Format & Size</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Format</label>
              <div className="grid grid-cols-2 gap-2">
                {(["png", "svg"] as Format[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-all",
                      format === f
                        ? "bg-[#E8372C] text-white border-[#E8372C]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                    )}
                  >
                    <FileImage className="w-4 h-4" />
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                {format === "svg"
                  ? "SVG is infinitely scalable — perfect for print"
                  : "PNG is widely supported — best for web and sharing"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Size (Fixed Ratio 1:1)</label>
              <div className="grid grid-cols-3 gap-2">
                {SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => setSize(preset.value)}
                    className={cn(
                      "flex flex-col items-center py-2 rounded-lg text-sm border transition-all",
                      size === preset.value
                        ? "bg-[#E8372C]/10 border-[#E8372C] text-[#E8372C]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                    )}
                  >
                    <span className="font-bold">{preset.label}</span>
                    <span className="text-[10px] mt-0.5 opacity-70">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Styling */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-5">
            <h3 className="font-semibold text-[var(--foreground)]">Styling</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">QR Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer p-0.5 bg-[var(--background)]"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="flex-1 px-2 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C] font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer p-0.5 bg-[var(--background)]"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 px-2 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C] font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Error Correction Level</label>
              <div className="grid grid-cols-4 gap-2">
                {ECC_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEcc(opt.value)}
                    className={cn(
                      "flex flex-col items-center py-2 rounded-lg border text-sm transition-all",
                      ecc === opt.value
                        ? "bg-[#E8372C]/10 border-[#E8372C] text-[#E8372C]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                    )}
                  >
                    <span className="font-bold">{opt.label}</span>
                    <span className="text-[10px] mt-0.5 opacity-70 text-center">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Margin: {margin}px
              </label>
              <input
                type="range"
                min={0}
                max={10}
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full accent-[#E8372C]"
              />
            </div>
          </div>
        </div>

        {/* Right: Preview + download */}
        <div className="space-y-5">
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--foreground)]">Live Preview</h3>
              <span className="text-xs text-[var(--muted-foreground)] font-mono">
                {size}×{size} · {format.toUpperCase()}
              </span>
            </div>

            <div
              className="rounded-xl border border-[var(--border)] flex items-center justify-center overflow-hidden"
              style={{ minHeight: 260, backgroundColor: bgColor }}
            >
              {previewLoading && !previewUrl ? (
                <div className="flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
                  <QrCode className="w-12 h-12 opacity-30 animate-pulse" />
                  <p className="text-sm">Generating...</p>
                </div>
              ) : previewError ? (
                <div className="flex flex-col items-center gap-2 text-red-500">
                  <QrCode className="w-12 h-12 opacity-50" />
                  <p className="text-sm">Failed to generate</p>
                </div>
              ) : previewUrl ? (
                <img
                  key={previewUrl}
                  src={previewUrl}
                  alt="QR Code preview"
                  className="max-w-full max-h-72 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[var(--muted-foreground)]">
                  <QrCode className="w-12 h-12 opacity-30" />
                  <p className="text-sm">Enter content to preview</p>
                </div>
              )}
            </div>

            <button
              onClick={handleDownload}
              disabled={!qrData.trim() || previewLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
            >
              <Download className="w-5 h-5" />
              Download {format.toUpperCase()} · {size}×{size}
            </button>
          </div>

          {/* Embed in PDF panel */}
          {activeTab === "embed" && (
            <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-5">
              <h3 className="font-semibold text-[var(--foreground)]">Embed into PDF</h3>

              {!embedResult ? (
                <>
                  <FileUploader
                    files={pdfFiles}
                    onFilesChange={setPdfFiles}
                    label="Upload PDF to embed QR into"
                    sublabel="The QR will be stamped on every page"
                  />

                  {pdfFile && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--foreground)]">QR Position on Page</label>
                        <div className="grid grid-cols-3 gap-2">
                          {EMBED_POSITIONS.map((pos) => (
                            <button
                              key={pos.id}
                              onClick={() => setEmbedPosition(pos.id)}
                              className={cn(
                                "py-2 text-xs font-medium rounded-lg border transition-all",
                                embedPosition === pos.id
                                  ? "bg-[#E8372C] text-white border-[#E8372C]"
                                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                              )}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--foreground)]">
                          QR Size on page: {embedSize}pt
                        </label>
                        <input
                          type="range"
                          min={40}
                          max={200}
                          value={embedSize}
                          onChange={(e) => setEmbedSize(Number(e.target.value))}
                          className="w-full accent-[#E8372C]"
                        />
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Approximately {Math.round(embedSize / 72 * 25.4)}mm on page
                        </p>
                      </div>

                      {embedProcessing && (
                        <ProgressBar progress={embedProgress} label="Embedding QR code..." />
                      )}

                      {embedError && (
                        <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                          {embedError}
                        </p>
                      )}

                      <button
                        onClick={handleEmbedInPDF}
                        disabled={embedProcessing || !qrData.trim()}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
                      >
                        <FilePlus className="w-5 h-5" />
                        {embedProcessing ? "Embedding..." : "Embed QR into PDF"}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <QrCode className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      QR code embedded on every page!
                    </p>
                  </div>
                  <DownloadButton
                    data={embedResult}
                    filename={`qr_embedded_${pdfFile?.name ?? "output.pdf"}`}
                    fileSize={embedResult.length}
                    onReset={handleEmbedReset}
                    label="Download PDF with QR"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
