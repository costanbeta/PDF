"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { cn } from "@/lib/utils";
import {
  Globe,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
  Loader2,
  Settings,
  Info
} from "lucide-react";

type Mode = "html" | "url";
type ScreenSize = 375 | 768 | 1280 | 1728;
type PageSize = "A4" | "A3" | "Letter" | "Legal";
type Margin = "none" | "small" | "big";

const PAGE_SIZES = {
  A4: { width: 595, height: 842 },
  A3: { width: 842, height: 1191 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 }
};

const MARGINS = {
  none: 0,
  small: 20,
  big: 40
};

export default function HTMLToPDFPage() {
  const [mode, setMode] = useState<Mode>("url");
  const [htmlInput, setHtmlInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // UI settings
  const [screenWidth, setScreenWidth] = useState<ScreenSize>(1280);
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margin, setMargin] = useState<Margin>("none");
  const [oneLongPage, setOneLongPage] = useState(true);

  // States
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [containerWidth, setContainerWidth] = useState(600);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ResizeObserver to calculate scale of the preview iframe dynamically
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        // Adjust for container padding
        setContainerWidth(entries[0].contentRect.width - 32);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update pasted HTML preview in iframe
  useEffect(() => {
    if (mode === "html" && iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(
          htmlInput.trim() ||
            `<html>
              <body style="margin:0; padding:40px; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color:#ffffff; color:#333; text-align:center;">
                <div style="margin-top:100px;">
                  <h2 style="color:#E8372C; font-weight:700;">HTML Live Preview</h2>
                  <p style="color:#666; max-width:400px; margin:10px auto;">Type or paste your HTML markup in the editor on the right to see it rendered here in real-time.</p>
                </div>
              </body>
            </html>`
        );
        doc.close();
      }
    }
  }, [htmlInput, mode, screenWidth]);

  // Revoke object URL when component unmounts or previewUrl changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFetchUrl = useCallback(async (customWidth?: number) => {
    if (!urlInput.trim()) return;

    let formattedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
      setUrlInput(formattedUrl);
    }

    setLoadingPreview(true);
    setError(null);
    setResult(null);

    const widthToUse = customWidth || screenWidth;

    try {
      const res = await fetch(
        `/api/url-preview?url=${encodeURIComponent(formattedUrl)}&width=${widthToUse}`
      );
      
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = `Failed to load preview (${res.status})`;
        try {
          const json = JSON.parse(text);
          if (json.error) errorMsg = json.error;
        } catch {}
        throw new Error(errorMsg);
      }

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev && prev.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return objUrl;
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to load website preview.";
      setError(errMsg);
    } finally {
      setLoadingPreview(false);
    }
  }, [urlInput, screenWidth]);

  // Auto-reload preview in URL mode when screen size changes
  useEffect(() => {
    if (mode === "url" && urlInput.trim() && previewUrl) {
      const timer = setTimeout(() => {
        handleFetchUrl();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenWidth]);

  const scrollToBottom = async (doc: Document) => {
    const scrollHeight = doc.documentElement.scrollHeight || doc.body.scrollHeight;
    const step = 250;
    for (let y = 0; y < scrollHeight; y += step) {
      doc.defaultView?.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    doc.defaultView?.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 200));
  };

  const handleProcess = async () => {
    setProcessing(true);
    setProgress(5);
    setError(null);
    setResult(null);

    try {
      if (mode === "url") {
        setProgress(20);
        const params = new URLSearchParams({
          url: urlInput,
          width: screenWidth.toString(),
          pageSize,
          orientation,
          margin,
          oneLongPage: oneLongPage.toString(),
        });

        const res = await fetch(`/api/url-pdf?${params.toString()}`);
        if (!res.ok) {
          const text = await res.text();
          let errorMsg = `Failed to convert URL to PDF (${res.status})`;
          try {
            const json = JSON.parse(text);
            if (json.error) errorMsg = json.error;
          } catch {}
          throw new Error(errorMsg);
        }

        setProgress(75);
        const arrayBuffer = await res.arrayBuffer();
        setResult(new Uint8Array(arrayBuffer));
        setProgress(100);
      } else {
        const iframe = iframeRef.current;
        if (!iframe) throw new Error("Preview container iframe is not ready.");
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) throw new Error("Could not access iframe render context.");

        setProgress(15);
        // Let lazy loaded resources start triggering
        await scrollToBottom(doc);
        setProgress(40);

        const originalHeight = iframe.style.height;
        const scrollHeight = doc.documentElement.scrollHeight || doc.body.scrollHeight;

        // Expand iframe height to prevent vertical cutoff
        iframe.style.height = `${scrollHeight}px`;
        // Allow minor delay for repaint/reflow
        await new Promise((r) => setTimeout(r, 500));
        setProgress(55);

        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(doc.body, {
          scale: 2,
          useCORS: true,
          logging: false,
          proxy: "/api/proxy",
          backgroundColor: "#ffffff",
        });

        // Restore height back to css responsive control
        iframe.style.height = originalHeight;
        setProgress(70);

        const pdf = await PDFDocument.create();
        const marginPoints = MARGINS[margin];

        const pageSizeVal = PAGE_SIZES[pageSize];
        const targetPageWidth = orientation === "landscape" ? pageSizeVal.height : pageSizeVal.width;
        const targetPageHeight = orientation === "landscape" ? pageSizeVal.width : pageSizeVal.height;

        const contentWidth = targetPageWidth - 2 * marginPoints;
        const contentHeight = targetPageHeight - 2 * marginPoints;

        if (oneLongPage) {
          // Single long page mode
          const scale = contentWidth / canvas.width;
          const scaledHeight = canvas.height * scale;

          const pdfPageHeight = scaledHeight + 2 * marginPoints;
          const page = pdf.addPage([targetPageWidth, pdfPageHeight]);

          const imgData = canvas.toDataURL("image/jpeg", 0.92);
          const imgBytes = await fetch(imgData).then((r) => r.arrayBuffer());
          const img = await pdf.embedJpg(imgBytes);

          page.drawImage(img, {
            x: marginPoints,
            y: marginPoints,
            width: contentWidth,
            height: scaledHeight,
          });
        } else {
          // Multi-page mode: slice vertically
          const scale = contentWidth / canvas.width;
          const sliceHeightSource = contentHeight / scale;
          const numPages = Math.ceil(canvas.height / sliceHeightSource);

          for (let i = 0; i < numPages; i++) {
            setProgress(70 + Math.round((i / numPages) * 20));
            const sourceY = i * sliceHeightSource;
            const currentSliceHeightSource = Math.min(sliceHeightSource, canvas.height - sourceY);

            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = currentSliceHeightSource;

            const ctx = sliceCanvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
              ctx.drawImage(
                canvas,
                0,
                sourceY,
                canvas.width,
                currentSliceHeightSource,
                0,
                0,
                canvas.width,
                currentSliceHeightSource
              );
            }

            const imgData = sliceCanvas.toDataURL("image/jpeg", 0.9);
            const imgBytes = await fetch(imgData).then((r) => r.arrayBuffer());
            const img = await pdf.embedJpg(imgBytes);

            const page = pdf.addPage([targetPageWidth, targetPageHeight]);
            const currentScaledHeight = currentSliceHeightSource * scale;

            page.drawImage(img, {
              x: marginPoints,
              y: targetPageHeight - marginPoints - currentScaledHeight,
              width: contentWidth,
              height: currentScaledHeight,
            });
          }
        }

        setProgress(95);
        const saved = await pdf.save();
        setResult(saved);
        setProgress(100);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Conversion failed.";
      setError(errMsg);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setProgress(0);
    setHtmlInput("");
    setUrlInput("");
    setPreviewUrl(null);
  };

  // Safe division to prevent dividing by 0 or NaN
  const scale = screenWidth > 0 ? containerWidth / screenWidth : 0.5;

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Convert any web page or HTML code snippet to high-fidelity PDF documents."
      wide={true}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Live interactive preview */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div
            ref={containerRef}
            className="w-full bg-[var(--muted)] rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col shadow-sm"
            style={{ height: "650px" }}
          >
            {/* Mock Browser Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-3.5 h-3.5 rounded-full bg-red-400/80" />
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-400/80" />
                <div className="w-3.5 h-3.5 rounded-full bg-green-400/80" />
              </div>
              <div className="flex-1 bg-[var(--muted)] rounded-lg px-4 py-1.5 text-xs text-[var(--muted-foreground)] flex items-center gap-2 truncate border border-[var(--border)]">
                <Globe className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                <span className="truncate">
                  {mode === "url" ? (urlInput || "https://...") : "live-render.html"}
                </span>
              </div>
              {loadingPreview && <Loader2 className="w-4 h-4 animate-spin text-[#E8372C]" />}
            </div>

            {/* Viewport Container */}
            <div className="flex-1 overflow-auto bg-zinc-900/90 dark:bg-black/40 flex justify-center items-start p-4">
              {mode === "url" ? (
                previewUrl ? (
                  <div
                    style={{
                      width: `${screenWidth}px`,
                      maxWidth: "100%",
                      height: "auto",
                    }}
                    className="relative shadow-2xl rounded-lg overflow-hidden bg-white"
                  >
                    <img
                      src={previewUrl}
                      alt="Website Preview"
                      className="w-full h-auto block bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full w-full text-center p-8 space-y-3 my-auto">
                    <Globe className="w-16 h-16 text-[var(--muted-foreground)] opacity-30 animate-pulse" />
                    <div>
                      <h3 className="font-semibold text-lg text-[var(--foreground)]">No URL Loaded</h3>
                      <p className="text-sm text-[var(--muted-foreground)] max-w-sm mt-1">
                        Enter a website URL on the right and click the fetch button to load the live preview.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div
                  style={{
                    width: `${screenWidth}px`,
                    height: `${Math.round(560 / scale)}px`,
                    transform: `scale(${scale})`,
                    transformOrigin: "top center",
                  }}
                  className="relative shadow-2xl rounded-lg overflow-hidden bg-white origin-top"
                >
                  <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0 bg-white"
                    title="Render preview frame"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 text-xs text-[var(--muted-foreground)] bg-[var(--muted)]/50 p-3 rounded-xl border border-[var(--border)]">
            <Info className="w-4 h-4 text-[#E8372C] shrink-0 mt-0.5" />
            <p>
              The browser mockup displays a responsive representation of the page layout. Converting to PDF runs same-origin script processes to compile and preserve CSS rules.
            </p>
          </div>
        </div>

        {/* Right column: Controls & Configuration */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6 shadow-sm">
            {/* Tabs Selector */}
            <div className="flex rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--muted)] p-1">
              {(["url", "html"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setResult(null);
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 py-2 text-xs font-semibold rounded-lg transition-all capitalize",
                    mode === m
                      ? "bg-[#E8372C] text-white shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  {m === "url" ? "Website URL" : "Paste HTML"}
                </button>
              ))}
            </div>

            {/* Inputs based on selected mode */}
            {mode === "url" ? (
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Website URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFetchUrl();
                      }}
                      placeholder="https://example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[#E8372C] transition-all"
                    />
                  </div>
                  <button
                    onClick={() => handleFetchUrl()}
                    disabled={!urlInput.trim() || loadingPreview}
                    className="p-3 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white rounded-xl transition-all shrink-0 flex items-center justify-center shadow-sm cursor-pointer"
                    title="Load & Preview"
                  >
                    <RefreshCw className={cn("w-5 h-5", loadingPreview && "animate-spin")} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  HTML Source Code
                </label>
                <textarea
                  value={htmlInput}
                  onChange={(e) => setHtmlInput(e.target.value)}
                  placeholder="<h1 style='color: red'>Hello World</h1><p>Type your markup here...</p>"
                  rows={8}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 text-xs font-mono text-[var(--foreground)] resize-y focus:outline-none focus:border-[#E8372C] transition-all"
                />
              </div>
            )}

            {/* Layout Settings Section */}
            <div className="pt-4 border-t border-[var(--border)] space-y-5">
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                <Settings className="w-4 h-4 text-[#E8372C]" />
                <span>Layout & Page Options</span>
              </div>

              {/* Screen Width (Active viewport) */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Render Screen Width
                </label>
                <div className="relative">
                  <select
                    value={screenWidth}
                    onChange={(e) => setScreenWidth(Number(e.target.value) as ScreenSize)}
                    className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--muted)] pl-4 pr-10 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[#E8372C] transition-colors cursor-pointer"
                  >
                    <option value={1728}>Your Screen (1728px)</option>
                    <option value={1280}>Desktop (1280px)</option>
                    <option value={768}>Tablet (768px)</option>
                    <option value={375}>Mobile (375px)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground)]">
                    {screenWidth === 1728 && <Monitor className="w-4 h-4" />}
                    {screenWidth === 1280 && <Monitor className="w-4 h-4" />}
                    {screenWidth === 768 && <Tablet className="w-4 h-4" />}
                    {screenWidth === 375 && <Smartphone className="w-4 h-4" />}
                  </div>
                </div>
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
                        Generates a single continuous PDF page fitting the entire content height, preventing page break cuts.
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

            {/* Convert Button */}
            {!result && (
              <button
                onClick={handleProcess}
                disabled={processing || (mode === "html" ? !htmlInput.trim() : !previewUrl)}
                className="w-full py-4 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                {processing ? "Converting webpage…" : "Convert to PDF"}
              </button>
            )}

            {processing && <ProgressBar progress={progress} label="Capturing and building layout slices…" />}

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {result && (
              <DownloadButton
                data={result}
                filename={mode === "url" ? "webpage.pdf" : "document.pdf"}
                fileSize={result.length}
                onReset={handleReset}
                label="Download PDF"
              />
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
