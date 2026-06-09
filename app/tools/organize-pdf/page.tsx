"use client";

import { useState, useCallback, useRef } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { LayoutGrid, X, Plus, Upload, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

interface SourceFile {
  id: string;
  file: File;
  bytes: Uint8Array;
  color: string;
  letter: string;
}

interface PageItem {
  id: string;
  sourceId: string;
  pageIndex: number;
  thumbnail: string;
  loading: boolean;
}

const FILE_COLORS = [
  "#E8372C", "#2563EB", "#16A34A", "#D97706", "#7C3AED",
  "#0891B2", "#DC2626", "#EA580C", "#65A30D", "#9333EA",
];

let _seq = 0;
const uid = () => `${Date.now()}-${_seq++}`;

export default function OrganizePDFPage() {
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileCountRef = useRef(0);

  const addPDFs = useCallback(async (newFiles: File[]) => {
    for (const file of newFiles) {
      const colorIndex = fileCountRef.current % FILE_COLORS.length;
      const letter = String.fromCharCode(65 + fileCountRef.current % 26);
      fileCountRef.current++;

      const id = uid();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const src: SourceFile = { id, file, bytes, color: FILE_COLORS[colorIndex], letter };
      setSources((prev) => [...prev, src]);

      const count = await getPDFPageCount(bytes);
      const newItems: PageItem[] = Array.from({ length: count }, (_, i) => ({
        id: uid(),
        sourceId: id,
        pageIndex: i,
        thumbnail: "",
        loading: true,
      }));
      setPages((prev) => [...prev, ...newItems]);

      // Render thumbnails one by one (shows progressively)
      for (let i = 0; i < count; i++) {
        const thumb = await renderPageThumbnail(bytes, i, 160);
        const itemId = newItems[i].id;
        setPages((prev) =>
          prev.map((p) => (p.id === itemId ? { ...p, thumbnail: thumb, loading: false } : p))
        );
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    onDrop: addPDFs,
    noClick: pages.length > 0,
    noKeyboard: pages.length > 0,
  });

  const deletePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setOverIndex(index);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    setPages((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(dragIndex, 1);
      arr.splice(overIndex, 0, moved);
      return arr;
    });
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleSave = async () => {
    if (pages.length === 0) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const newDoc = await PDFDocument.create();

      const srcMap = new Map(sources.map((s) => [s.id, s]));
      const loadedPdfs = new Map<string, ReturnType<(typeof PDFDocument)["load"]> extends Promise<infer T> ? T : never>();

      setProgress(25);
      for (const src of sources) {
        const pdf = await PDFDocument.load(src.bytes.slice());
        loadedPdfs.set(src.id, pdf);
      }

      setProgress(55);
      for (const page of pages) {
        const srcPdf = loadedPdfs.get(page.sourceId)!;
        const [copied] = await newDoc.copyPages(srcPdf, [page.pageIndex]);
        newDoc.addPage(copied);
      }

      setProgress(90);
      const bytes = await newDoc.save();
      setProgress(100);
      setResult(bytes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setSources([]);
    setPages([]);
    setResult(null);
    setProgress(0);
    setError(null);
    fileCountRef.current = 0;
  };

  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  return (
    <ToolLayout
      toolId="organize-pdf"
      title="Organize PDF"
      description="Reorder or delete pages with drag-and-drop. Combine multiple PDFs into one."
    >
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl transition-all",
          pages.length === 0 ? "cursor-pointer p-12 text-center" : "p-4 cursor-default",
          isDragActive
            ? "border-[#E8372C] bg-[#E8372C]/5"
            : "border-[var(--border)] hover:border-[#E8372C]/50"
        )}
      >
        <input {...getInputProps()} />
        {pages.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--muted)] flex items-center justify-center">
              <Upload className="w-7 h-7 text-[var(--muted-foreground)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)] text-lg">Drop PDFs here</p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                or click to browse — supports multiple files
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {sources.map((src) => (
                <span
                  key={src.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: src.color }}
                >
                  <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[10px] font-bold">
                    {src.letter}
                  </span>
                  {src.file.name.length > 22 ? src.file.name.slice(0, 22) + "…" : src.file.name}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); open(); }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[#E8372C] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add more PDFs
            </button>
          </div>
        )}
      </div>

      {/* Page grid */}
      {pages.length > 0 && !result && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted-foreground)]">
              <span className="font-semibold text-[var(--foreground)]">{pages.length}</span> page{pages.length !== 1 ? "s" : ""} &nbsp;·&nbsp; drag to reorder &nbsp;·&nbsp; ✕ to remove
            </p>
            <button
              onClick={() => setPages([])}
              className="text-xs text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {pages.map((page, index) => {
              const src = sourceMap.get(page.sourceId);
              const isOver = overIndex === index && dragIndex !== index;
              const isDragging = dragIndex === index;

              return (
                <div
                  key={page.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={handleDrop}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  className={cn(
                    "relative group rounded-xl border-2 overflow-hidden select-none transition-all duration-150",
                    isOver
                      ? "border-[#E8372C] scale-[1.04] shadow-xl"
                      : isDragging
                      ? "opacity-30 border-dashed border-[var(--muted-foreground)]"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)]/60 hover:shadow-md cursor-grab"
                  )}
                >
                  {/* Page thumbnail */}
                  <div className="aspect-[3/4] bg-white flex items-center justify-center overflow-hidden">
                    {page.loading ? (
                      <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
                    ) : (
                      <img
                        src={page.thumbnail}
                        alt={`Page ${page.pageIndex + 1}`}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    )}
                  </div>

                  {/* Source file badge (top-left) */}
                  {src && (
                    <div
                      className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow"
                      style={{ backgroundColor: src.color }}
                      title={src.file.name}
                    >
                      {src.letter}
                    </div>
                  )}

                  {/* Delete (top-right, hover) */}
                  <button
                    onClick={() => deletePage(index)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Page number footer */}
                  <div
                    className="py-1.5 text-center text-[12px] font-bold"
                    style={src ? { backgroundColor: src.color + "22", color: src.color } : undefined}
                  >
                    {index + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {processing && <ProgressBar progress={progress} label="Building PDF…" />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={processing || pages.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <LayoutGrid className="w-5 h-5" />
            {processing ? "Building PDF…" : `Save Organized PDF (${pages.length} pages)`}
          </button>
        </>
      )}

      {result && (
        <DownloadButton
          data={result}
          filename={`organized_${sources[0]?.file.name ?? "output.pdf"}`}
          fileSize={result.length}
          onReset={handleReset}
          label="Download Organized PDF"
        />
      )}
    </ToolLayout>
  );
}
