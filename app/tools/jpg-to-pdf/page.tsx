"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { imagesToPDF } from "@/lib/pdf/jpg-to-pdf";
import { useDropzone } from "react-dropzone";
import { Upload, GripVertical, X, FileImage } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";

export default function JPGToPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    multiple: true,
    onDrop: (accepted) => {
      setFiles((prev) => [...prev, ...accepted]);
      accepted.forEach((f) => {
        const url = URL.createObjectURL(f);
        setPreviews((prev) => [...prev, url]);
      });
    },
  });

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (overIndex: number) => {
    if (dragIndex === null || dragIndex === overIndex) return;
    const reorderedFiles = [...files];
    const reorderedPreviews = [...previews];
    const [fMoved] = reorderedFiles.splice(dragIndex, 1);
    const [pMoved] = reorderedPreviews.splice(dragIndex, 1);
    reorderedFiles.splice(overIndex, 0, fMoved);
    reorderedPreviews.splice(overIndex, 0, pMoved);
    setFiles(reorderedFiles);
    setPreviews(reorderedPreviews);
    setDragIndex(null);
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setProgress(20);
    setError(null);
    try {
      setProgress(60);
      const pdf = await imagesToPDF(files);
      setProgress(100);
      setResult(pdf);
    } catch {
      setError("Failed to convert images. Ensure files are valid JPEG, PNG, or WebP images.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
    setResult(null);
    setProgress(0);
    setError(null);
  };

  return (
    <ToolLayout
      title="JPG to PDF"
      description="Convert images to a PDF document. Drag to reorder images."
    >
      {!result ? (
        <>
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
              isDragActive
                ? "border-[#E8372C] bg-[#E8372C]/5"
                : "border-[var(--border)] hover:border-[#E8372C]/50 hover:bg-[var(--muted)]"
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center">
                <Upload className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <div>
                <p className="font-semibold text-[var(--foreground)]">Upload images (JPG, PNG, WebP)</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Drag & drop or click to browse</p>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-[var(--foreground)] text-sm">
                {files.length} image{files.length > 1 ? "s" : ""} — drag to reorder
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className="relative group rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--muted)] cursor-grab"
                  >
                    <div className="aspect-square">
                      <img
                        src={previews[index]}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-1.5">
                      <GripVertical className="w-4 h-4 text-white" />
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 rounded-full bg-red-500 text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white truncate">
                      {formatBytes(file.size)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {processing && <ProgressBar progress={progress} label="Converting to PDF..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleConvert}
            disabled={files.length === 0 || processing}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <FileImage className="w-5 h-5" />
            {processing ? "Converting..." : `Convert ${files.length || ""} Image${files.length !== 1 ? "s" : ""} to PDF`}
          </button>
        </>
      ) : (
        <DownloadButton
          data={result}
          filename="images_to_pdf.pdf"
          fileSize={result.length}
          onReset={handleReset}
          label="Download PDF"
        />
      )}
    </ToolLayout>
  );
}
