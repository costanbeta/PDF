"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";
import { ExternalLink, Download } from "lucide-react";

interface TextItem {
  str: string;
}

interface TextContent {
  items: TextItem[];
}

const LANGUAGES: { code: string; label: string }[] = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "zh-CN", label: "Chinese (Simplified)" },
  { code: "ja", label: "Japanese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
];

export default function TranslatePDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [targetLang, setTargetLang] = useState("es");
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(5);
    setError(null);
    setExtractedText("");

    try {
      const buffer = await files[0].arrayBuffer();
      setProgress(15);

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const numPages = pdfDoc.numPages;
      let text = "";

      for (let p = 1; p <= numPages; p++) {
        setProgress(15 + Math.round((p / numPages) * 80));
        const page = await pdfDoc.getPage(p);
        const content = await page.getTextContent() as TextContent;
        text += content.items.map((i) => i.str).join(" ") + "\n";
      }

      setProgress(100);
      setExtractedText(text.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Text extraction failed.");
    } finally {
      setProcessing(false);
    }
  };

  const handleTranslate = () => {
    if (!extractedText) return;
    const preview = extractedText.slice(0, 5000);
    const url = `https://translate.google.com/?text=${encodeURIComponent(preview)}&sl=auto&tl=${targetLang}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadText = () => {
    if (!extractedText || !files[0]) return;
    const blob = new Blob([extractedText], { type: "text/plain" });
    downloadBlob(blob, `${getFileNameWithoutExtension(files[0].name)}-extracted.txt`);
  };

  const handleReset = () => {
    setFiles([]);
    setExtractedText("");
    setError(null);
    setProgress(0);
  };

  return (
    <ToolLayout title="Translate PDF" description="Extract and translate PDF text to another language.">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Drag & drop your PDF here"
          sublabel="or click to browse"
        />

        {files.length > 0 && !extractedText && (
          <button
            onClick={handleExtract}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Extracting text…" : "Extract Text"}
          </button>
        )}

        {processing && <ProgressBar progress={progress} label="Extracting text from PDF…" />}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {extractedText && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--foreground)]">Extracted Text Preview</p>
              <pre className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-xs text-[var(--foreground)] overflow-y-auto max-h-48 whitespace-pre-wrap">
                {extractedText.slice(0, 1000)}{extractedText.length > 1000 ? "…" : ""}
              </pre>
              <p className="text-xs text-[var(--muted-foreground)]">
                {extractedText.split(/\s+/).filter(Boolean).length.toLocaleString()} words extracted
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Target Language</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] p-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[#E8372C]"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
              Translation opens Google Translate with up to 5,000 characters. For longer documents, download the text file and paste it manually.
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleTranslate}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] text-white font-semibold rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Translate with Google
              </button>
              <button
                onClick={handleDownloadText}
                className="flex items-center justify-center gap-2 px-6 py-3.5 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium rounded-xl hover:bg-[var(--muted)] transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Text
              </button>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium rounded-xl hover:bg-[var(--muted)] transition-colors text-sm"
            >
              Process Another PDF
            </button>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
