"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { compressPDF, type CompressionLevel } from "@/lib/pdf/compress";
import { formatBytes } from "@/lib/utils";
import { Minimize2 } from "lucide-react";

const levels: { id: CompressionLevel; label: string; desc: string; est: string }[] = [
  { id: "low",    label: "Low",    desc: "Best quality, minor size reduction", est: "~10–20% smaller" },
  { id: "medium", label: "Medium", desc: "Balanced size and quality",           est: "~30–50% smaller" },
  { id: "high",   label: "High",   desc: "Maximum compression, smaller file",   est: "~50–70% smaller" },
];

export default function CompressPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const file = files[0] ?? null;

  const handleCompress = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(20);
    setError(null);
    try {
      setProgress(50);
      const compressed = await compressPDF(file, level);
      setProgress(100);
      setResult(compressed);
    } catch {
      setError("Failed to compress PDF. Please ensure the file is a valid PDF.");
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

  const savings =
    result && file
      ? Math.max(0, ((file.size - result.length) / file.size) * 100)
      : 0;

  return (
    <ToolLayout
      title="Compress PDF"
      description="Reduce PDF file size while preserving quality. Choose your compression level."
    >
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your PDF here"
      />

      {file && !result && (
        <>
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Compression Level</h3>
            <div className="grid grid-cols-3 gap-3">
              {levels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    level === l.id
                      ? "border-[#E8372C] bg-[#E8372C]/5"
                      : "border-[var(--border)] hover:border-[var(--foreground)]"
                  }`}
                >
                  <div className={`font-semibold text-sm ${level === l.id ? "text-[#E8372C]" : "text-[var(--foreground)]"}`}>
                    {l.label}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{l.desc}</div>
                  <div className={`text-[11px] font-semibold mt-1.5 ${level === l.id ? "text-[#E8372C]" : "text-[var(--muted-foreground)]"}`}>
                    {l.est}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-sm">
              <span className="text-[var(--muted-foreground)]">Original size</span>
              <span className="font-semibold text-[var(--foreground)]">{formatBytes(file.size)}</span>
            </div>
          </div>

          {processing && <ProgressBar progress={progress} label="Compressing PDF..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleCompress}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <Minimize2 className="w-5 h-5" />
            {processing ? "Compressing..." : "Compress PDF"}
          </button>
        </>
      )}

      {result && (
        <div className="space-y-4">
          {/* Size comparison card */}
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Compression Result</h3>

            <div className="grid grid-cols-3 gap-3 items-center">
              {/* Original */}
              <div className="p-3 rounded-lg bg-[var(--muted)] text-center">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Original</p>
                <p className="text-lg font-bold text-[var(--foreground)]">{formatBytes(file!.size)}</p>
              </div>

              {/* Arrow + savings badge */}
              <div className="flex flex-col items-center gap-1">
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  savings > 0
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}>
                  {savings > 0 ? `−${savings.toFixed(1)}%` : "No change"}
                </div>
                <div className="text-[var(--muted-foreground)] text-lg">→</div>
              </div>

              {/* Compressed */}
              <div className={`p-3 rounded-lg text-center ${
                savings > 0
                  ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                  : "bg-[var(--muted)]"
              }`}>
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Compressed</p>
                <p className={`text-lg font-bold ${savings > 0 ? "text-green-700 dark:text-green-400" : "text-[var(--foreground)]"}`}>
                  {formatBytes(result.length)}
                </p>
              </div>
            </div>

            {/* Size bar */}
            {savings > 0 && (
              <div className="space-y-1.5">
                <div className="h-2.5 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-700"
                    style={{ width: `${100 - savings}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--muted-foreground)] text-right">
                  Saved {formatBytes(file!.size - result.length)}
                </p>
              </div>
            )}
          </div>

          <DownloadButton
            data={result}
            filename={`compressed_${file?.name ?? "output.pdf"}`}
            fileSize={result.length}
            onReset={handleReset}
            label="Download Compressed PDF"
          />
        </div>
      )}
    </ToolLayout>
  );
}
