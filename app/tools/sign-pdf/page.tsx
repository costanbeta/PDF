"use client";

import { useState, useRef, useEffect } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { renderPageThumbnail, getPDFPageCount } from "@/lib/pdf/to-jpg";
import { getFileNameWithoutExtension, cn } from "@/lib/utils";
import { X, Pen, Type, Upload, PenLine, ChevronLeft, ChevronRight, Plus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SignTab = "signature" | "initials" | "stamp";
type FieldType = "signature" | "initials" | "name" | "date" | "text" | "stamp";

interface PlacedField {
  id: string;
  type: FieldType;
  x: number; // as % of preview container
  y: number;
  pageIndex: number;
  value?: string; // for signature/initials rendered text
  imageData?: string; // for drawn / stamp
  fontIndex?: number;
  color?: string;
}

const SIG_FONTS = [
  { label: "Arial", style: { fontFamily: "Arial, Helvetica, sans-serif", fontWeight: "400" } },
  { label: "Dancing Script", style: { fontFamily: "var(--font-dancing), cursive", fontWeight: "700" } },
  { label: "Pacifico", style: { fontFamily: "var(--font-pacifico), cursive" } },
  { label: "Sacramento", style: { fontFamily: "var(--font-sacramento), cursive" } },
  { label: "Pinyon Script", style: { fontFamily: "var(--font-pinyon), cursive" } },
];

const SIG_COLORS = ["#1a1a1a", "#1a1a5e", "#1e5e1e", "#8b0000", "#00008b"];

const FIELD_DEFS: { type: FieldType; label: string; required?: boolean }[] = [
  { type: "signature", label: "Signature", required: true },
  { type: "initials", label: "Initials" },
  { type: "name", label: "Name" },
  { type: "date", label: "Date" },
  { type: "text", label: "Text" },
  { type: "stamp", label: "Company Stamp" },
];

// ─── Modal Component ──────────────────────────────────────────────────────────

function SignatureModal({
  open,
  onClose,
  onApply,
  fieldType,
  fullName,
  initials,
  onFullNameChange,
  onInitialsChange,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (result: { value?: string; imageData?: string; fontIndex: number; color: string }) => void;
  fieldType: SignTab;
  fullName: string;
  initials: string;
  onFullNameChange: (v: string) => void;
  onInitialsChange: (v: string) => void;
}) {
  const [tab, setTab] = useState<SignTab>(fieldType);
  const [selectedFont, setSelectedFont] = useState(0);
  const [selectedColor, setSelectedColor] = useState(SIG_COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);

  useEffect(() => {
    setTab(fieldType);
  }, [fieldType, open]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [tab, selectedColor]);

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = selectedColor;
  }, [selectedColor]);

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
    const onEnd = () => { setIsDrawing(false); lastPosRef.current = null; };

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
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleStampFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setStampPreview(url);
  };

  const handleApply = () => {
    if (tab === "signature" || tab === "initials") {
      const text = tab === "signature" ? fullName : initials;
      onApply({ value: text, fontIndex: selectedFont, color: selectedColor });
    } else if (tab === "stamp") {
      onApply({ imageData: stampPreview ?? undefined, fontIndex: 0, color: selectedColor });
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-white dark:bg-[#1e2030] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Set your signature details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + Initials inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name:</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => onFullNameChange(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#E8372C]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initials:</label>
              <input
                type="text"
                value={initials}
                onChange={(e) => onInitialsChange(e.target.value)}
                placeholder="Your initials"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#E8372C]"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 gap-1">
            {(["signature", "initials", "stamp"] as SignTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all",
                  tab === t
                    ? "border-[#E8372C] text-[#E8372C]"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                )}
              >
                {t === "signature" ? <PenLine className="w-4 h-4" /> : t === "initials" ? <Type className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {t === "signature" ? "Signature" : t === "initials" ? "Initials" : "Company Stamp"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {(tab === "signature" || tab === "initials") && (
            <div className="space-y-4">
              {/* Font style list */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700 max-h-52 overflow-y-auto">
                {SIG_FONTS.map((font, i) => (
                  <label
                    key={i}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                      selectedFont === i ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    )}
                  >
                    <input
                      type="radio"
                      checked={selectedFont === i}
                      onChange={() => setSelectedFont(i)}
                      className="accent-[#E8372C] w-4 h-4"
                    />
                    <span style={{ ...font.style, fontSize: 28, color: selectedColor }}>
                      {tab === "signature" ? (fullName || "Signature") : (initials || "AC")}
                    </span>
                  </label>
                ))}
              </div>
              {/* Color dots */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Color:</span>
                {SIG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all border-2",
                      selectedColor === c ? "border-gray-400 scale-110 shadow" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {tab === "stamp" && (
            <div>
              <input ref={stampInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleStampFile} />
              {stampPreview ? (
                <div className="flex flex-col items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <img src={stampPreview} alt="Company stamp" className="max-h-32 object-contain rounded" />
                  <button onClick={() => setStampPreview(null)} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ) : (
                <button
                  onClick={() => stampInputRef.current?.click()}
                  className="w-full py-10 flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-[#E8372C] transition-colors"
                >
                  <div className="p-3 rounded-full border border-gray-300 dark:border-gray-600">
                    <Upload className="w-5 h-5 text-[#E8372C]" />
                  </div>
                  <span className="text-sm font-medium text-[#E8372C]">Upload company stamp</span>
                  <span className="text-xs text-gray-500">or drop file here</span>
                  <span className="text-xs text-gray-400">Accepted formats: PNG, JPG and SVG</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleApply}
            className="px-8 py-2.5 bg-[#E8372C] hover:bg-[#c42d22] text-white font-semibold rounded-lg transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Placed Field Widget ──────────────────────────────────────────────────────

function FieldWidget({
  field,
  containerRef,
  onRemove,
  onMove,
}: {
  field: PlacedField;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRemove: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
  const isDragging = useRef(false);
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartField = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    // Don't drag if clicking the remove button
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    dragStartMouse.current = { x: e.clientX, y: e.clientY };
    dragStartField.current = { x: field.x, y: field.y };

    const handleMouseMove = (me: MouseEvent) => {
      if (!isDragging.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dx = me.clientX - dragStartMouse.current.x;
      const dy = me.clientY - dragStartMouse.current.y;
      const newX = dragStartField.current.x + (dx / rect.width) * 100;
      const newY = dragStartField.current.y + (dy / rect.height) * 100;
      onMove(field.id, Math.max(0, Math.min(93, newX)), Math.max(0, Math.min(95, newY)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const fontStyle = field.fontIndex !== undefined ? SIG_FONTS[field.fontIndex]?.style : {};

  return (
    <div
      style={{ left: `${field.x}%`, top: `${field.y}%`, position: "absolute", cursor: "grab", zIndex: 10, userSelect: "none" }}
      onMouseDown={onMouseDown}
      className="group"
    >
      <div className="relative border-2 border-blue-400 bg-blue-50/80 dark:bg-blue-900/40 rounded px-2 py-1 flex items-center gap-1.5 select-none min-w-[80px]">
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(field.id); }}
          className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center hover:bg-red-500 transition-colors z-10"
        >
          <X className="w-3 h-3" />
        </button>
        {field.imageData ? (
          <img src={field.imageData} alt={field.type} className="max-h-8 max-w-[120px] object-contain" draggable={false} />
        ) : (
          <span
            style={{ ...fontStyle, fontSize: 22, color: field.color ?? "#1a1a1a", whiteSpace: "nowrap" }}
          >
            {field.value || field.type}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SignPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingFieldType, setPendingFieldType] = useState<SignTab>("signature");
  const [fullName, setFullName] = useState("");
  const [initials, setInitials] = useState("");

  // Placed fields
  const [fields, setFields] = useState<PlacedField[]>([]);
  const previewRef = useRef<HTMLDivElement>(null);

  // Processing
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const file = files[0] ?? null;

  // Load page thumbnail when file or page changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!file) { setPageImage(null); setTotalPages(0); return; }
      setLoadingPage(true);
      setPageImage(null);
      try {
        const buf = await file.arrayBuffer();
        const count = await getPDFPageCount(buf);
        if (!cancelled) setTotalPages(count);
        const buf2 = await file.arrayBuffer();
        const img = await renderPageThumbnail(buf2, currentPage, 560);
        if (!cancelled) setPageImage(img);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingPage(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file, currentPage]);

  const openModal = (type: SignTab) => {
    setPendingFieldType(type);
    setModalOpen(true);
  };

  const handleModalApply = (result: { value?: string; imageData?: string; fontIndex: number; color: string }) => {
    const id = `field-${Date.now()}-${Math.random()}`;
    const newField: PlacedField = {
      id,
      type: pendingFieldType === "signature" ? "signature" : pendingFieldType === "initials" ? "initials" : "stamp",
      x: 10,
      y: 70,
      pageIndex: currentPage,
      value: result.value,
      imageData: result.imageData,
      fontIndex: result.fontIndex,
      color: result.color,
    };
    setFields((prev) => [...prev, newField]);
  };

  const addSimpleField = (type: FieldType) => {
    if (type === "signature") { openModal("signature"); return; }
    if (type === "initials") { openModal("initials"); return; }
    if (type === "stamp") { openModal("stamp"); return; }
    const id = `field-${Date.now()}`;
    const defaults: Record<string, string> = {
      name: fullName || "Name",
      date: new Date().toLocaleDateString(),
      text: "Text",
    };
    setFields((prev) => [...prev, {
      id,
      type,
      x: 10,
      y: 60,
      pageIndex: currentPage,
      value: defaults[type] ?? type,
      fontIndex: 0,
      color: "#1a1a1a",
    }]);
  };

  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id));
  const moveField = (id: string, x: number, y: number) =>
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, x, y } : f));

  const handleSign = async () => {
    if (!file) return;
    if (fields.length === 0) {
      setError("Please add at least one signature field before signing.");
      return;
    }
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(buffer);
      setProgress(30);
      const pages = pdf.getPages();

      // Get preview container size for coordinate mapping
      const previewEl = previewRef.current;
      const previewW = previewEl?.clientWidth ?? 500;
      const previewH = previewEl?.clientHeight ?? 700;

      // Group fields by page
      for (const field of fields) {
        const page = pages[field.pageIndex];
        if (!page) continue;
        const { width: pdfW, height: pdfH } = page.getSize();

        // Map % positions to PDF coordinates
        const pdfX = (field.x / 100) * pdfW;
        const pdfY = pdfH - (field.y / 100) * pdfH - 30; // flip Y, offset for element height

        if (field.imageData) {
          try {
            const res = await fetch(field.imageData);
            const imgBuf = await res.arrayBuffer();
            const img = await pdf.embedPng(new Uint8Array(imgBuf)).catch(() => pdf.embedJpg(new Uint8Array(imgBuf)));
            page.drawImage(img, { x: pdfX, y: pdfY, width: 120, height: 50 });
          } catch {
            // skip if image fails
          }
        } else if (field.value) {
          const font = await pdf.embedFont(StandardFonts.HelveticaOblique);
          let [r, g, b] = [0.1, 0.1, 0.3];
          if (field.color) {
            const hex = field.color.replace("#", "");
            r = parseInt(hex.substring(0, 2), 16) / 255;
            g = parseInt(hex.substring(2, 4), 16) / 255;
            b = parseInt(hex.substring(4, 6), 16) / 255;
          }
          const fontSize = field.type === "initials" ? 20 : 26;
          page.drawText(field.value, { x: pdfX, y: pdfY, size: fontSize, font, color: rgb(r, g, b) });
        }
      }

      setProgress(80);
      const saved = await pdf.save();
      setResult(saved);
      setOutputName(`${getFileNameWithoutExtension(file.name)}-signed.pdf`);
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
    setFields([]);
    setCurrentPage(0);
    setFullName("");
    setInitials("");
  };

  const currentPageFields = fields.filter((f) => f.pageIndex === currentPage);

  // ─── Upload screen ─────────────────────────────────────────────────────────
  if (!file) {
    return (
      <ToolLayout title="Sign PDF" description="Add your signature to PDF documents.">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <FileUploader
            files={files}
            onFilesChange={setFiles}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            label="Drag & drop your PDF here"
            sublabel="or click to browse"
          />
        </div>
      </ToolLayout>
    );
  }

  // ─── Result screen ─────────────────────────────────────────────────────────
  if (result) {
    return (
      <ToolLayout title="Sign PDF" description="Add your signature to PDF documents.">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <DownloadButton
            data={result}
            filename={outputName}
            fileSize={result.length}
            onReset={handleReset}
            label="Download Signed PDF"
          />
        </div>
      </ToolLayout>
    );
  }

  // ─── Editor screen ─────────────────────────────────────────────────────────
  return (
    <ToolLayout title="Sign PDF" description="Add your signature to PDF documents." wide>
      <SignatureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onApply={handleModalApply}
        fieldType={pendingFieldType}
        fullName={fullName}
        initials={initials}
        onFullNameChange={setFullName}
        onInitialsChange={setInitials}
      />

      <div className="flex gap-0 h-full" style={{ minHeight: "80vh" }}>
        {/* ── Left: PDF Preview ── */}
        <div className="flex-1 flex flex-col bg-[var(--muted)] rounded-l-2xl overflow-hidden border border-[var(--border)]">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--card)] border-b border-[var(--border)]">
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-xs hover:text-[var(--foreground)] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> All Tools
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--foreground)] truncate max-w-[160px]">{file.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-1.5 rounded hover:bg-[var(--muted)] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[var(--foreground)]">{currentPage + 1} / {totalPages || 1}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-1.5 rounded hover:bg-[var(--muted)] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Page canvas area */}
          <div className="flex-1 flex items-start justify-center p-8 overflow-auto">
            <div
              ref={previewRef}
              className="relative bg-white shadow-2xl"
              style={{ width: "100%", maxWidth: 560 }}
            >
              {loadingPage ? (
                <div className="w-full aspect-[3/4] flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <p className="text-sm text-[var(--muted-foreground)] animate-pulse">Loading page…</p>
                </div>
              ) : pageImage ? (
                <img src={pageImage} alt={`Page ${currentPage + 1}`} className="w-full h-auto block" draggable={false} />
              ) : null}

              {/* Placed fields overlay */}
              {currentPageFields.map((field) => (
                <FieldWidget
                  key={field.id}
                  field={field}
                  containerRef={previewRef}
                  onRemove={removeField}
                  onMove={moveField}
                />
              ))}
            </div>
          </div>

          {/* Page strip thumbnails */}
          {totalPages > 1 && (
            <div className="flex gap-2 px-4 py-3 bg-[var(--card)] border-t border-[var(--border)] overflow-x-auto">
              {Array.from({ length: Math.min(totalPages, 8) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={cn(
                    "flex-shrink-0 text-xs rounded border transition-all flex flex-col items-center gap-1 p-1",
                    currentPage === i ? "border-[#E8372C]" : "border-[var(--border)] hover:border-[var(--foreground)]"
                  )}
                >
                  <div className="w-10 h-14 bg-gray-200 dark:bg-gray-700 rounded text-center flex items-center justify-center text-[10px] text-gray-400">
                    {i + 1}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Signing Options Sidebar ── */}
        <div className="w-72 flex-shrink-0 flex flex-col bg-[var(--card)] rounded-r-2xl border border-l-0 border-[var(--border)] overflow-y-auto">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-bold text-[var(--foreground)] text-lg">Signing options</h2>
          </div>

          <div className="flex-1 px-5 py-4 space-y-5">
            {/* Required fields */}
            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Required fields</p>
              {FIELD_DEFS.filter((f) => f.required).map((fieldDef) => {
                const added = fields.filter((f) => f.type === fieldDef.type && f.pageIndex === currentPage);
                return (
                  <div
                    key={fieldDef.type}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] mb-2"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                      <Pen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{fieldDef.label}</p>
                      {added.length > 0 && (
                        <p className="text-xs text-blue-500 truncate">
                          {added[0].value || "Custom"}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => addSimpleField(fieldDef.type)}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--muted)] hover:bg-[#E8372C] hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Optional fields */}
            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Optional fields</p>
              <div className="space-y-2">
                {FIELD_DEFS.filter((f) => !f.required).map((fieldDef) => {
                  const added = fields.filter((f) => f.type === fieldDef.type && f.pageIndex === currentPage);
                  const icons: Record<string, React.ReactNode> = {
                    initials: <Type className="w-4 h-4 text-green-600 dark:text-green-400" />,
                    name: <span className="text-xs font-bold text-purple-600">N</span>,
                    date: <span className="text-xs font-bold text-orange-600">D</span>,
                    text: <span className="text-xs font-bold text-yellow-600">T</span>,
                    stamp: <Upload className="w-4 h-4 text-gray-500" />,
                  };
                  const bgColors: Record<string, string> = {
                    initials: "bg-green-100 dark:bg-green-900/30",
                    name: "bg-purple-100 dark:bg-purple-900/30",
                    date: "bg-orange-100 dark:bg-orange-900/30",
                    text: "bg-yellow-100 dark:bg-yellow-900/30",
                    stamp: "bg-gray-100 dark:bg-gray-800",
                  };
                  return (
                    <div
                      key={fieldDef.type}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] cursor-pointer hover:border-[#E8372C] transition-colors group"
                      onClick={() => addSimpleField(fieldDef.type)}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", bgColors[fieldDef.type])}>
                        {icons[fieldDef.type]}
                      </div>
                      <p className="text-sm font-medium text-[var(--foreground)] flex-1">{fieldDef.label}</p>
                      {added.length > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-bold">
                          {added.length}
                        </span>
                      )}
                      <Plus className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[#E8372C] transition-colors flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fields summary */}
            {fields.length > 0 && (
              <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{fields.length} field{fields.length !== 1 ? "s" : ""} placed</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Drag them to reposition on the PDF</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Progress */}
            {processing && <ProgressBar progress={progress} label="Signing PDF…" />}
          </div>

          {/* Sign button */}
          <div className="px-5 py-4 border-t border-[var(--border)]">
            <button
              onClick={handleSign}
              disabled={processing || fields.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all text-base"
            >
              <Pen className="w-5 h-5" />
              Sign
            </button>
          </div>
        </div>
      </div>

      {/* Privacy notice */}
      <p className="text-center text-xs text-[var(--muted-foreground)] mt-4 flex items-center justify-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        Files are processed locally — they never leave your device
      </p>
    </ToolLayout>
  );
}
