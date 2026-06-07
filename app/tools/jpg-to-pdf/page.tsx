"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { imagesToPDF, imagesToPDFSeparate, type Orientation, type PageSizeId, type MarginSize } from "@/lib/pdf/jpg-to-pdf";
import { useDropzone } from "react-dropzone";
import { Upload, GripVertical, X, FileImage, Plus, Info } from "lucide-react";
import { cn, formatBytes, downloadBlob } from "@/lib/utils";
import JSZip from "jszip";

const PAGE_SIZE_OPTIONS: { id: PageSizeId; label: string }[] = [
  { id: "fit",    label: "Fit to image" },
  { id: "a4",     label: "A4" },
  { id: "a3",     label: "A3" },
  { id: "letter", label: "Letter" },
  { id: "legal",  label: "Legal" },
];

export default function JPGToPDFPage() {
  const [files, setFiles]       = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [result, setResult]     = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [error, setError]           = useState<string | null>(null);
  const [dragIndex, setDragIndex]   = useState<number | null>(null);
  const [overIndex, setOverIndex]   = useState<number | null>(null);

  // Options
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [pageSize, setPageSize]       = useState<PageSizeId>("fit");
  const [margin, setMargin]           = useState<MarginSize>("none");
  const [mergeAll, setMergeAll]       = useState(true);
  const [oneLongPage, setOneLongPage] = useState(false);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    multiple: true,
    noClick: files.length > 0,
    onDrop: (accepted) => {
      setFiles((prev) => [...prev, ...accepted]);
      accepted.forEach((f) => setPreviews((prev) => [...prev, URL.createObjectURL(f)]));
    },
  });

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setOverIndex(i); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null); setOverIndex(null); return;
    }
    const rf = [...files], rp = [...previews];
    const [fMoved] = rf.splice(dragIndex, 1);
    const [pMoved] = rp.splice(dragIndex, 1);
    rf.splice(overIndex, 0, fMoved);
    rp.splice(overIndex, 0, pMoved);
    setFiles(rf); setPreviews(rp);
    setDragIndex(null); setOverIndex(null);
  };

  const handleConvert = async () => {
    if (files.length === 0) return;
    setProcessing(true); setProgress(20); setError(null);
    const opts = { orientation, pageSize, margin, oneLongPage };
    try {
      if (oneLongPage || mergeAll || files.length === 1) {
        setProgress(60);
        const pdf = await imagesToPDF(files, opts);
        setProgress(100);
        setResult(pdf);
      } else {
        setProgress(50);
        const parts = await imagesToPDFSeparate(files, opts);
        setProgress(85);
        const zip = new JSZip();
        parts.forEach(({ name, data }) => zip.file(name, data));
        const blob = await zip.generateAsync({ type: "blob" });
        setProgress(100);
        downloadBlob(blob, "images_to_pdf.zip");
        setResult(new Uint8Array(0)); // trigger done state
      }
    } catch {
      setError("Failed to convert images. Ensure files are valid JPEG, PNG, or WebP.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setFiles([]); setPreviews([]); setResult(null); setProgress(0); setError(null);
  };

  const hasFiles = files.length > 0;

  return (
    <ToolLayout title="JPG to PDF" description="Convert images to a PDF document. Drag to reorder images.">
      {!result ? (
        <div className={cn("gap-6", hasFiles ? "grid grid-cols-1 lg:grid-cols-[1fr_300px]" : "")}>
          {/* Left: dropzone + image grid */}
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-2xl transition-all",
                hasFiles ? "p-3 cursor-default" : "p-10 text-center cursor-pointer",
                isDragActive ? "border-[#E8372C] bg-[#E8372C]/5" : "border-[var(--border)] hover:border-[#E8372C]/50"
              )}
            >
              <input {...getInputProps()} />
              {!hasFiles ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">Upload images (JPG, PNG, WebP)</p>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">Drag & drop or click to browse</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {files.length} image{files.length > 1 ? "s" : ""} — drag to reorder
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); open(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:border-[#E8372C] hover:text-[#E8372C] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add more
                  </button>
                </div>
              )}
            </div>

            {hasFiles && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                    className={cn(
                      "relative group rounded-xl overflow-hidden border-2 cursor-grab select-none transition-all",
                      overIndex === index && dragIndex !== index
                        ? "border-[#E8372C] scale-105 shadow-lg"
                        : dragIndex === index
                        ? "opacity-40 border-dashed border-[var(--border)]"
                        : "border-[var(--border)] hover:border-[var(--muted-foreground)]/50"
                    )}
                  >
                    <div className="aspect-square bg-[var(--muted)]">
                      <img
                        src={previews[index]}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-1.5">
                      <GripVertical className="w-4 h-4 text-white mt-0.5" />
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 rounded-full bg-red-500 text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[11px] text-white truncate">
                      {formatBytes(file.size)}
                    </div>
                    {/* Position number */}
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[#E8372C] text-white text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: options panel */}
          {hasFiles && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] space-y-5">
                <h3 className="font-semibold text-[var(--foreground)]">Image to PDF options</h3>

                {/* Page size */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">Page size</label>
                  <div className="relative">
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value as PageSizeId)}
                      className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--muted)] pl-4 pr-10 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[#E8372C] transition-colors cursor-pointer"
                    >
                      <option value="fit">Fit to image</option>
                      <option value="a4">A4 ({orientation === "landscape" ? "297x210 mm" : "210x297 mm"})</option>
                      <option value="a3">A3 ({orientation === "landscape" ? "420x297 mm" : "297x420 mm"})</option>
                      <option value="letter">Letter ({orientation === "landscape" ? "279x216 mm" : "216x279 mm"})</option>
                      <option value="legal">Legal ({orientation === "landscape" ? "356x216 mm" : "216x356 mm"})</option>
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
                      onClick={() => {
                        setOneLongPage(!oneLongPage);
                        if (!oneLongPage) {
                          setMergeAll(true);
                        }
                      }}
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
                          Generates a single continuous PDF page fitting all images stacked vertically.
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
                      disabled={pageSize === "fit"}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all bg-[var(--card)]",
                        pageSize === "fit" ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                        orientation === "portrait" && pageSize !== "fit"
                          ? "border-[#E8372C] text-[#E8372C]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/40"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-10 rounded border-2 flex items-center justify-center",
                        orientation === "portrait" && pageSize !== "fit" ? "border-[#E8372C]" : "border-[var(--muted-foreground)]"
                      )}>
                        <div className={cn("w-3 h-4 rounded-sm", orientation === "portrait" && pageSize !== "fit" ? "bg-[#E8372C]" : "bg-[var(--muted-foreground)]")} />
                      </div>
                      <span className="text-xs font-semibold">Portrait</span>
                    </button>

                    <button
                      onClick={() => setOrientation("landscape")}
                      disabled={pageSize === "fit"}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all bg-[var(--card)]",
                        pageSize === "fit" ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                        orientation === "landscape" && pageSize !== "fit"
                          ? "border-[#E8372C] text-[#E8372C]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)]/40"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-8 rounded border-2 flex items-center justify-center",
                        orientation === "landscape" && pageSize !== "fit" ? "border-[#E8372C]" : "border-[var(--muted-foreground)]"
                      )}>
                        <div className={cn("w-4 h-3 rounded-sm", orientation === "landscape" && pageSize !== "fit" ? "bg-[#E8372C]" : "bg-[var(--muted-foreground)]")} />
                      </div>
                      <span className="text-xs font-semibold">Landscape</span>
                    </button>
                  </div>
                </div>

                {/* Page margin */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--foreground)]">Page margin</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(["none", "small", "big"] as MarginSize[]).map((m) => (
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

                {/* Merge checkbox */}
                <div className="pt-1">
                  <label className={cn(
                    "flex items-center gap-3 py-1 select-none group",
                    oneLongPage ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  )}>
                    <div
                      onClick={() => {
                        if (!oneLongPage) setMergeAll(!mergeAll);
                      }}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 transition-all",
                        mergeAll || oneLongPage ? "bg-[#E8372C] border-[#E8372C]" : "border-[var(--border)] group-hover:border-[#E8372C]"
                      )}
                    >
                      {(mergeAll || oneLongPage) && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-[var(--foreground)]">Merge all images in one PDF file</span>
                  </label>
                </div>
              </div>

              {processing && <ProgressBar progress={progress} label="Converting to PDF..." />}
              {error && (
                <p className="text-sm text-red-500 p-3 rounded-xl bg-red-50 dark:bg-red-950/30">{error}</p>
              )}

              <button
                onClick={handleConvert}
                disabled={files.length === 0 || processing}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
              >
                <FileImage className="w-5 h-5" />
                {processing ? "Converting…" : "Convert to PDF"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <DownloadButton
          data={result}
          filename="images_to_pdf.pdf"
          fileSize={result.length}
          onReset={handleReset}
          label="Download PDF"
        />
      )}

      {!hasFiles && (
        <>
          {processing && <ProgressBar progress={progress} label="Converting to PDF..." />}
          {error && <p className="text-sm text-red-500 p-3 rounded-xl bg-red-50 dark:bg-red-950/30">{error}</p>}
        </>
      )}
    </ToolLayout>
  );
}
