"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { addWatermark, type WatermarkOptions } from "@/lib/pdf/watermark";
import { Stamp } from "lucide-react";

const POSITIONS: { id: WatermarkOptions["position"]; label: string }[] = [
  { id: "center", label: "Center" },
  { id: "top-left", label: "Top Left" },
  { id: "top-right", label: "Top Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "bottom-right", label: "Bottom Right" },
];

export default function WatermarkPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("CONFIDENTIAL");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(30);
  const [color, setColor] = useState("#E8372C");
  const [rotation, setRotation] = useState(45);
  const [position, setPosition] = useState<WatermarkOptions["position"]>("center");
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const file = files[0] ?? null;

  const handleProcess = async () => {
    if (!file || !text.trim()) return;
    setProcessing(true);
    setProgress(30);
    setError(null);
    try {
      const watermarked = await addWatermark(file, { text, fontSize, opacity, color, rotation, position });
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
  };

  return (
    <ToolLayout
      title="Add Watermark"
      description="Stamp a text watermark on every page of your PDF."
    >
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your PDF here"
        sublabel="Upload one PDF to watermark"
      />

      {file && !result && (
        <>
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-5">
            <h3 className="font-semibold text-[var(--foreground)]">Watermark Settings</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Watermark Text</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. CONFIDENTIAL, DRAFT"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Font Size: {fontSize}px
                </label>
                <input
                  type="range"
                  min={12}
                  max={120}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-[#E8372C]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Opacity: {opacity}%
                </label>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-[#E8372C]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Rotation: {rotation}°
                </label>
                <input
                  type="range"
                  min={-90}
                  max={90}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-[#E8372C]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm"
                  />
                </div>
              </div>
            </div>

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

            <div
              className="p-4 rounded-lg border border-dashed border-[var(--border)] relative overflow-hidden"
              style={{ minHeight: 80 }}
            >
              <div className="text-xs text-[var(--muted-foreground)] mb-2">Preview:</div>
              <div
                className="font-bold select-none"
                style={{
                  color: color,
                  opacity: opacity / 100,
                  fontSize: Math.min(24, fontSize / 2),
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: "center",
                  display: "inline-block",
                }}
              >
                {text || "Your watermark"}
              </div>
            </div>
          </div>

          {processing && <ProgressBar progress={progress} label="Adding watermark..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleProcess}
            disabled={processing || !text.trim()}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <Stamp className="w-5 h-5" />
            {processing ? "Adding Watermark..." : "Add Watermark"}
          </button>
        </>
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
