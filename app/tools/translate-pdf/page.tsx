"use client";

import { useState, useRef, useEffect } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";
import {
  Globe,
  Download,
  Sparkles,
  Eye,
  EyeOff,
  RefreshCw,
  Key,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";

interface TextItem {
  str: string;
}

interface TextContent {
  items: TextItem[];
}

const LANGUAGES: { code: string; label: string; flag: string }[] = [
  { code: "Spanish", label: "Spanish", flag: "🇪🇸" },
  { code: "French", label: "French", flag: "🇫🇷" },
  { code: "German", label: "German", flag: "🇩🇪" },
  { code: "Portuguese", label: "Portuguese", flag: "🇵🇹" },
  { code: "Italian", label: "Italian", flag: "🇮🇹" },
  { code: "Chinese (Simplified)", label: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "Chinese (Traditional)", label: "Chinese (Traditional)", flag: "🇹🇼" },
  { code: "Japanese", label: "Japanese", flag: "🇯🇵" },
  { code: "Korean", label: "Korean", flag: "🇰🇷" },
  { code: "Arabic", label: "Arabic", flag: "🇸🇦" },
  { code: "Hindi", label: "Hindi", flag: "🇮🇳" },
  { code: "Russian", label: "Russian", flag: "🇷🇺" },
  { code: "Dutch", label: "Dutch", flag: "🇳🇱" },
  { code: "Turkish", label: "Turkish", flag: "🇹🇷" },
  { code: "Polish", label: "Polish", flag: "🇵🇱" },
  { code: "Swedish", label: "Swedish", flag: "🇸🇪" },
  { code: "Norwegian", label: "Norwegian", flag: "🇳🇴" },
  { code: "Danish", label: "Danish", flag: "🇩🇰" },
  { code: "Finnish", label: "Finnish", flag: "🇫🇮" },
  { code: "Greek", label: "Greek", flag: "🇬🇷" },
  { code: "Hebrew", label: "Hebrew", flag: "🇮🇱" },
  { code: "Thai", label: "Thai", flag: "🇹🇭" },
  { code: "Vietnamese", label: "Vietnamese", flag: "🇻🇳" },
  { code: "Indonesian", label: "Indonesian", flag: "🇮🇩" },
  { code: "Malay", label: "Malay", flag: "🇲🇾" },
  { code: "Ukrainian", label: "Ukrainian", flag: "🇺🇦" },
  { code: "Romanian", label: "Romanian", flag: "🇷🇴" },
  { code: "Hungarian", label: "Hungarian", flag: "🇭🇺" },
  { code: "Czech", label: "Czech", flag: "🇨🇿" },
  { code: "Bulgarian", label: "Bulgarian", flag: "🇧🇬" },
  { code: "Croatian", label: "Croatian", flag: "🇭🇷" },
  { code: "Slovak", label: "Slovak", flag: "🇸🇰" },
  { code: "Slovenian", label: "Slovenian", flag: "🇸🇮" },
  { code: "Estonian", label: "Estonian", flag: "🇪🇪" },
  { code: "Latvian", label: "Latvian", flag: "🇱🇻" },
  { code: "Lithuanian", label: "Lithuanian", flag: "🇱🇹" },
  { code: "Serbian", label: "Serbian", flag: "🇷🇸" },
  { code: "Catalan", label: "Catalan", flag: "🏴" },
  { code: "Swahili", label: "Swahili", flag: "🇰🇪" },
  { code: "Bengali", label: "Bengali", flag: "🇧🇩" },
  { code: "Urdu", label: "Urdu", flag: "🇵🇰" },
  { code: "Persian", label: "Persian", flag: "🇮🇷" },
  { code: "Afrikaans", label: "Afrikaans", flag: "🇿🇦" },
];

// Split text into chunks that respect a max character length
function chunkText(text: string, maxChars = 3000): string[] {
  const paragraphs = text.split(/\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n" + para).length > maxChars && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n" + para : para;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export default function TranslatePDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [hasSystemKey, setHasSystemKey] = useState(false);

  useEffect(() => {
    fetch("/api/translate-pdf", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.hasSystemKey) {
          setHasSystemKey(true);
        }
      })
      .catch(() => {});
  }, []);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [targetLang, setTargetLang] = useState("Spanish");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(false);

  const handleExtractAndTranslate = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(2);
    setProgressLabel("Reading PDF…");
    setError(null);
    setExtractedText("");
    setTranslatedText("");
    abortRef.current = false;

    try {
      // --- Step 1: Extract text from PDF ---
      const buffer = await files[0].arrayBuffer();
      setProgress(5);
      setProgressLabel("Loading PDF engine…");

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const pdfDoc = await pdfjsLib
        .getDocument({ data: new Uint8Array(buffer) })
        .promise;
      const numPages = pdfDoc.numPages;
      let rawText = "";

      for (let p = 1; p <= numPages; p++) {
        if (abortRef.current) return;
        setProgress(5 + Math.round((p / numPages) * 25));
        setProgressLabel(`Extracting page ${p} of ${numPages}…`);
        const page = await pdfDoc.getPage(p);
        const content = (await page.getTextContent()) as TextContent;
        rawText += content.items.map((i) => i.str).join(" ") + "\n";
      }

      rawText = rawText.trim();
      if (!rawText) {
        throw new Error(
          "No text found in the PDF. The document may be image-based — try our OCR tool first."
        );
      }
      setExtractedText(rawText);

      // --- Step 2: Chunk & translate ---
      const chunks = chunkText(rawText, 3000);
      const translatedChunks: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        if (abortRef.current) return;
        const chunkProgress = 30 + Math.round(((i + 1) / chunks.length) * 68);
        setProgress(chunkProgress);
        setProgressLabel(
          `Translating chunk ${i + 1} of ${chunks.length} with AI…`
        );

        const res = await fetch("/api/translate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chunks[i],
            targetLanguage: targetLang,
            apiKey: apiKey.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Translation API error");
        }

        translatedChunks.push(data.translated);
      }

      setProgress(100);
      setProgressLabel("Done!");
      setTranslatedText(translatedChunks.join("\n\n"));
    } catch (err) {
      if (!abortRef.current) {
        setError(err instanceof Error ? err.message : "Translation failed.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!translatedText || !files[0]) return;
    const blob = new Blob([translatedText], {
      type: "text/plain;charset=utf-8",
    });
    const lang = targetLang.toLowerCase().replace(/\s+/g, "-");
    downloadBlob(
      blob,
      `${getFileNameWithoutExtension(files[0].name)}-${lang}.txt`
    );
  };

  const handleCopy = async () => {
    if (!translatedText) return;
    await navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    abortRef.current = true;
    setFiles([]);
    setExtractedText("");
    setTranslatedText("");
    setError(null);
    setProgress(0);
    setProgressLabel("");
    setShowOriginal(false);
  };

  const selectedLang = LANGUAGES.find((l) => l.code === targetLang);
  const wordCount = translatedText
    ? translatedText.split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <ToolLayout
      title="Translate PDF"
      description="AI-powered PDF translation using OpenRouter — supports 40+ languages."
    >
      <div className="space-y-5">
        {/* API Key Panel */}
        {!hasSystemKey && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E8372C]/10 flex items-center justify-center">
                <Key className="w-3.5 h-3.5 text-[#E8372C]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  OpenRouter API Key
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Required for AI translation •{" "}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#E8372C] hover:underline"
                  >
                    Get a free key →
                  </a>
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                id="api-key-input"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full pr-10 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#E8372C] transition-colors font-mono"
              />
              <button
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Your key is never stored — it&apos;s sent directly for this session only. Model:{" "}
              <span className="font-mono text-[var(--foreground)]">
                openrouter/free
              </span>
            </p>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
          <FileUploader
            files={files}
            onFilesChange={setFiles}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            label="Drag & drop your PDF here"
            sublabel="or click to browse — text-based PDFs only"
          />

          {/* Language selector */}
          {files.length > 0 && !translatedText && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Translate to
              </label>
              <div className="relative">
                <select
                  id="target-language-select"
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--muted)] pl-10 pr-10 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[#E8372C] transition-colors cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg">
                  {selectedLang?.flag ?? "🌐"}
                </span>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              </div>
            </div>
          )}

          {/* Translate button */}
          {files.length > 0 && !translatedText && (
            <button
              id="translate-pdf-btn"
              onClick={handleExtractAndTranslate}
              disabled={processing}
              className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeOpacity="0.3"
                    />
                    <path
                      d="M12 2a10 10 0 0 1 10 10"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Translating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Translate to {selectedLang?.label ?? targetLang}
                </>
              )}
            </button>
          )}

          {hasSystemKey && !apiKey.trim() && files.length > 0 && !translatedText && (
            <p className="text-xs text-[var(--muted-foreground)] text-center -mt-3">
              Uses configured system API key (env variable) by default
            </p>
          )}

          {/* Progress */}
          {processing && (
            <ProgressBar progress={progress} label={progressLabel} />
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Translation Result */}
          {translatedText && (
            <div className="space-y-5 animate-fade-in">
              {/* Stats */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-lg px-3 py-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#E8372C]" />
                  <span>
                    Translated to{" "}
                    <strong className="text-[var(--foreground)]">
                      {selectedLang?.flag} {targetLang}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-lg px-3 py-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E8372C]" />
                  <span>
                    <strong className="text-[var(--foreground)]">
                      {wordCount.toLocaleString()}
                    </strong>{" "}
                    words translated
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-lg px-3 py-1.5">
                  <span>
                    via{" "}
                    <strong className="text-[var(--foreground)] font-mono">
                      OpenRouter Free Model
                    </strong>
                  </span>
                </div>
              </div>

              {/* Translated text preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {selectedLang?.flag} Translated Text
                  </p>
                  <button
                    id="copy-translation-btn"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-xs text-[var(--foreground)] overflow-y-auto max-h-72 whitespace-pre-wrap leading-relaxed">
                  {translatedText}
                </pre>
              </div>

              {/* Original text toggle */}
              {extractedText && (
                <div className="space-y-2">
                  <button
                    id="toggle-original-text-btn"
                    onClick={() => setShowOriginal((v) => !v)}
                    className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {showOriginal ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    {showOriginal ? "Hide" : "Show"} original extracted text
                  </button>
                  {showOriginal && (
                    <pre className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-xs text-[var(--muted-foreground)] overflow-y-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                      {extractedText}
                    </pre>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="download-translation-btn"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] text-white font-semibold rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Translated Text
                </button>
                <button
                  id="translate-another-btn"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium rounded-xl hover:bg-[var(--muted)] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Translate Another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info card */}
        {!translatedText && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
              How it works
            </p>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Upload your PDF",
                  desc: "We extract all text content from your document locally.",
                },
                {
                  step: "2",
                  title: "Choose target language",
                  desc: "Pick from 40+ languages for your translation.",
                },
                {
                  step: "3",
                  title: "AI translates with Gemini",
                  desc: "OpenRouter routes to google/gemini-2.0-flash for high-quality translation.",
                },
                {
                  step: "4",
                  title: "Download your result",
                  desc: "Get a translated .txt file instantly.",
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#E8372C]/10 text-[#E8372C] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
