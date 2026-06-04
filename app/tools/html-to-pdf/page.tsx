"use client";

import { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { cn } from "@/lib/utils";

type Mode = "html" | "url";

export default function HTMLToPDFPage() {
  const [mode, setMode] = useState<Mode>("html");
  const [htmlInput, setHtmlInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hiddenDivRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleProcess = async () => {
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      let element: HTMLElement | null = null;

      if (mode === "html") {
        if (!htmlInput.trim()) throw new Error("Please enter some HTML content.");
        const div = hiddenDivRef.current;
        if (!div) throw new Error("Render container not found.");
        div.innerHTML = htmlInput;
        div.style.display = "block";
        element = div;
        await new Promise((r) => setTimeout(r, 200));
      } else {
        if (!urlInput.trim()) throw new Error("Please enter a URL.");
        throw new Error("URL mode is blocked by browser CORS restrictions. Please use the HTML paste mode instead.");
      }

      setProgress(30);

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      setProgress(60);

      if (mode === "html" && hiddenDivRef.current) {
        hiddenDivRef.current.style.display = "none";
        hiddenDivRef.current.innerHTML = "";
      }

      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const imgBytes = await fetch(imgData).then((r) => r.arrayBuffer());

      const pdf = await PDFDocument.create();
      const img = await pdf.embedJpg(imgBytes);
      const { width, height } = img.scale(1);
      const page = pdf.addPage([width / 2, height / 2]);
      page.drawImage(img, { x: 0, y: 0, width: width / 2, height: height / 2 });

      setProgress(90);
      const saved = await pdf.save();
      setResult(saved);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
      if (hiddenDivRef.current) {
        hiddenDivRef.current.style.display = "none";
        hiddenDivRef.current.innerHTML = "";
      }
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
  };

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Convert any web page or HTML content to PDF."
    >
      <div
        ref={hiddenDivRef}
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          width: "1024px",
          background: "white",
          color: "black",
          zIndex: -1,
          overflow: "hidden",
        }}
      />
      <iframe ref={iframeRef} style={{ display: "none" }} />

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <div className="flex rounded-xl overflow-hidden border border-[var(--border)]">
          {(["html", "url"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                mode === m
                  ? "bg-[#E8372C] text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {m === "html" ? "Paste HTML" : "URL (CORS limited)"}
            </button>
          ))}
        </div>

        {mode === "html" ? (
          <textarea
            value={htmlInput}
            onChange={(e) => setHtmlInput(e.target.value)}
            placeholder="<h1>Hello World</h1><p>Your HTML content here...</p>"
            rows={10}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 text-sm font-mono text-[var(--foreground)] resize-y focus:outline-none focus:border-[#E8372C]"
          />
        ) : (
          <div className="space-y-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[#E8372C]"
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Note: Most URLs are blocked by CORS restrictions in the browser. Use the HTML paste mode for reliable results.
            </p>
          </div>
        )}

        {!result && (
          <button
            onClick={handleProcess}
            disabled={processing || (mode === "html" ? !htmlInput.trim() : !urlInput.trim())}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Converting…" : "Convert to PDF"}
          </button>
        )}

        {processing && <ProgressBar progress={progress} label="Rendering and converting…" />}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {result && (
          <DownloadButton
            data={result}
            filename="converted.pdf"
            fileSize={result.length}
            onReset={handleReset}
            label="Download PDF"
          />
        )}
      </div>
    </ToolLayout>
  );
}
