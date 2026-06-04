"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension, cn } from "@/lib/utils";

type SignMode = "type" | "draw";
type Position = "bottom-left" | "bottom-center" | "bottom-right";
type PageTarget = "first" | "last" | "all";

export default function SignPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [signMode, setSignMode] = useState<SignMode>("type");
  const [typedSig, setTypedSig] = useState("");
  const [position, setPosition] = useState<Position>("bottom-right");
  const [pageTarget, setPageTarget] = useState<PageTarget>("last");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, [signMode]);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      lastPosRef.current = getPos(e, canvas);
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing || !lastPosRef.current) return;
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPosRef.current = pos;
    };

    const onEnd = () => {
      setIsDrawing(false);
      lastPosRef.current = null;
    };

    canvas.addEventListener("mousedown", onStart);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onEnd);
    canvas.addEventListener("mouseleave", onEnd);
    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);

    return () => {
      canvas.removeEventListener("mousedown", onStart);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseup", onEnd);
      canvas.removeEventListener("mouseleave", onEnd);
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [isDrawing]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleProcess = async () => {
    if (!files[0]) return;
    if (signMode === "type" && !typedSig.trim()) {
      setError("Please enter your signature text.");
      return;
    }
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const buffer = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(buffer);
      setProgress(30);

      const pages = pdf.getPages();
      const targetPages =
        pageTarget === "first" ? [pages[0]] :
        pageTarget === "last" ? [pages[pages.length - 1]] :
        pages;

      for (const page of targetPages) {
        const { width, height } = page.getSize();

        if (signMode === "type") {
          const font = await pdf.embedFont(StandardFonts.HelveticaOblique);
          const fontSize = 28;
          const textWidth = font.widthOfTextAtSize(typedSig, fontSize);
          const padding = 20;

          let x: number;
          if (position === "bottom-left") x = padding;
          else if (position === "bottom-center") x = (width - textWidth) / 2;
          else x = width - textWidth - padding;

          page.drawText(typedSig, {
            x,
            y: padding + 10,
            size: fontSize,
            font,
            color: rgb(0.1, 0.1, 0.5),
          });
        } else {
          const canvas = canvasRef.current;
          if (!canvas) continue;
          const dataUrl = canvas.toDataURL("image/png");
          const base64 = dataUrl.split(",")[1];
          const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
          const img = await pdf.embedPng(imgBytes);

          const sigWidth = 160;
          const sigHeight = 60;
          const padding = 20;

          let x: number;
          if (position === "bottom-left") x = padding;
          else if (position === "bottom-center") x = (width - sigWidth) / 2;
          else x = width - sigWidth - padding;

          page.drawImage(img, {
            x,
            y: padding,
            width: sigWidth,
            height: sigHeight,
          });
        }
      }

      setProgress(80);
      const saved = await pdf.save();
      setResult(saved);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}-signed.pdf`);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
    setTypedSig("");
  };

  return (
    <ToolLayout title="Sign PDF" description="Add your signature to PDF documents.">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Drag & drop your PDF here"
          sublabel="or click to browse"
        />

        {files.length > 0 && (
          <>
            <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
              {(["type", "draw"] as SignMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setSignMode(m)}
                  className={cn(
                    "flex-1 py-2.5 text-sm font-medium transition-colors",
                    signMode === m
                      ? "bg-[#E8372C] text-white"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  {m === "type" ? "Type Signature" : "Draw Signature"}
                </button>
              ))}
            </div>

            {signMode === "type" ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={typedSig}
                  onChange={(e) => setTypedSig(e.target.value)}
                  placeholder="Your name or signature"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 text-lg italic text-[var(--foreground)] focus:outline-none focus:border-[#E8372C]"
                  style={{ fontFamily: "Georgia, serif" }}
                />
                {typedSig && (
                  <div className="rounded-xl bg-white border border-[var(--border)] p-4 text-center">
                    <span
                      style={{ fontFamily: "Georgia, serif", fontSize: 32, color: "#1a1a5e" }}
                    >
                      {typedSig}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--muted-foreground)]">Draw your signature below</p>
                  <button
                    onClick={clearCanvas}
                    className="text-xs text-[#E8372C] hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={120}
                  className="w-full rounded-xl border border-[var(--border)] bg-white cursor-crosshair touch-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--foreground)]">Position</p>
                <div className="space-y-1">
                  {(["bottom-left", "bottom-center", "bottom-right"] as Position[]).map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="position"
                        value={p}
                        checked={position === p}
                        onChange={() => setPosition(p)}
                        className="accent-[#E8372C]"
                      />
                      <span className="text-sm text-[var(--foreground)] capitalize">{p.replace(/-/g, " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--foreground)]">Apply to</p>
                <div className="space-y-1">
                  {(["first", "last", "all"] as PageTarget[]).map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pageTarget"
                        value={t}
                        checked={pageTarget === t}
                        onChange={() => setPageTarget(t)}
                        className="accent-[#E8372C]"
                      />
                      <span className="text-sm text-[var(--foreground)] capitalize">
                        {t === "first" ? "First page" : t === "last" ? "Last page" : "All pages"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {!result && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
              >
                {processing ? "Signing…" : "Sign PDF"}
              </button>
            )}
          </>
        )}

        {processing && <ProgressBar progress={progress} label="Adding signature…" />}

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
            label="Download Signed PDF"
          />
        )}
      </div>
    </ToolLayout>
  );
}
