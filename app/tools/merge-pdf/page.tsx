"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { mergePDFs } from "@/lib/pdf/merge";
import { Merge, GripVertical, X } from "lucide-react";

export default function MergePDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    try {
      setProgress(50);
      const merged = await mergePDFs(files);
      setProgress(100);
      setResult(merged);
    } catch {
      setError("Failed to merge PDFs. Please ensure all files are valid PDF documents.");
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

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };
  const handleDrop = () => {
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) return;
    const reordered = [...files];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(overIndex, 0, moved);
    setFiles(reordered);
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <ToolLayout
      title="Merge PDF"
      description="Combine multiple PDF files into a single document. Drag to reorder."
    >
      {!result ? (
        <>
          <FileUploader
            files={[]}
            onFilesChange={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
            multiple
            label="Drag & drop PDFs here"
            sublabel="or click to browse — add multiple files"
          />

          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-[var(--foreground)] text-sm">
                Files to merge ({files.length}) — drag to reorder
              </h3>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-grab ${
                      overIndex === index
                        ? "border-[#E8372C] bg-[#E8372C]/5"
                        : "border-[var(--border)] bg-[var(--card)]"
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                    <span className="w-6 h-6 rounded-full bg-[#E8372C]/10 text-[#E8372C] text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-[var(--foreground)] truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {processing && <ProgressBar progress={progress} label="Merging PDFs..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleMerge}
            disabled={files.length < 2 || processing}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <Merge className="w-5 h-5" />
            {processing ? "Merging..." : `Merge ${files.length} PDFs`}
          </button>
        </>
      ) : (
        <DownloadButton
          data={result}
          filename="merged.pdf"
          fileSize={result.length}
          onReset={handleReset}
          label="Download Merged PDF"
        />
      )}
    </ToolLayout>
  );
}
