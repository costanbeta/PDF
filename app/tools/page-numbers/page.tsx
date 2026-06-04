"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { addPageNumbers, type PageNumberPosition } from "@/lib/pdf/page-numbers";
import { Hash } from "lucide-react";

const POSITIONS: { id: PageNumberPosition; label: string }[] = [
  { id: "bottom-left", label: "Bottom Left" },
  { id: "bottom-center", label: "Bottom Center" },
  { id: "bottom-right", label: "Bottom Right" },
  { id: "top-left", label: "Top Left" },
  { id: "top-center", label: "Top Center" },
  { id: "top-right", label: "Top Right" },
];

export default function PageNumbersPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [position, setPosition] = useState<PageNumberPosition>("bottom-center");
  const [fontSize, setFontSize] = useState(12);
  const [startNumber, setStartNumber] = useState(1);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const file = files[0] ?? null;

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(30);
    setError(null);
    try {
      const numbered = await addPageNumbers(file, { position, fontSize, startNumber, prefix, suffix });
      setProgress(100);
      setResult(numbered);
    } catch {
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
    >
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your PDF here"
        sublabel="Upload one PDF to add page numbers"
      />

      {file && !result && (
        <>
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-5">
            <h3 className="font-semibold text-[var(--foreground)]">Page Number Settings</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Position</label>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPosition(p.id)}
                    className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                      position === p.id
                        ? "bg-[#E8372C] text-white border-[#E8372C]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Font Size: {fontSize}px
                </label>
                <input
                  type="range"
                  min={8}
                  max={24}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-[#E8372C]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Start Number</label>
                <input
                  type="number"
                  min={0}
                  value={startNumber}
                  onChange={(e) => setStartNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Prefix (optional)</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder='e.g. "Page "'
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Suffix (optional)</label>
                <input
                  type="text"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder='e.g. " of 10"'
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--muted)] text-sm text-[var(--muted-foreground)]">
              Preview: <span className="font-medium text-[var(--foreground)]">
                {prefix}{startNumber}{suffix}
              </span>, {prefix}{startNumber + 1}{suffix}, {prefix}{startNumber + 2}{suffix}...
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
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <Hash className="w-5 h-5" />
            {processing ? "Adding Numbers..." : "Add Page Numbers"}
          </button>
        </>
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
