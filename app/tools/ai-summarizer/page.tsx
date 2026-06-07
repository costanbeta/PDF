"use client";

import { useState, useEffect } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";
import {
  Sparkles,
  BookOpen,
  Clock,
  FileText,
  Key,
  Eye,
  EyeOff,
  Tag,
  Lightbulb,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Copy,
  Check,
  Download,
  RefreshCw,
} from "lucide-react";

interface TextItem {
  str: string;
}
interface TextContent {
  items: TextItem[];
}

interface AISummary {
  title?: string;
  overview: string;
  keyPoints: string[];
  topics: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  complexity: "beginner" | "intermediate" | "advanced";
  actionItems: string[];
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "text-green-400 bg-green-400/10 border-green-400/20",
  neutral: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  negative: "text-red-400 bg-red-400/10 border-red-400/20",
  mixed: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

const COMPLEXITY_COLOR: Record<string, string> = {
  beginner: "text-green-400 bg-green-400/10 border-green-400/20",
  intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  advanced: "text-red-400 bg-red-400/10 border-red-400/20",
};

export default function AISummarizerPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [hasSystemKey, setHasSystemKey] = useState(false);

  useEffect(() => {
    fetch("/api/summarize-pdf", { cache: "no-store" })
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
  const [progressLabel, setProgressLabel] = useState("Extracting text…");
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [fullText, setFullText] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(5);
    setProgressLabel("Reading PDF…");
    setError(null);
    setSummary(null);

    try {
      // ── 1. Extract text with pdfjs ──────────────────────────────────────
      const buffer = await files[0].arrayBuffer();
      setProgress(15);

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const numPages = pdfDoc.numPages;
      let extractedText = "";

      for (let p = 1; p <= numPages; p++) {
        setProgress(15 + Math.round((p / numPages) * 45));
        setProgressLabel(`Extracting page ${p} of ${numPages}…`);
        const page = await pdfDoc.getPage(p);
        const content = (await page.getTextContent()) as TextContent;
        extractedText += content.items.map((i) => i.str).join(" ") + "\n";
      }

      setProgress(65);
      setProgressLabel("Sending to AI…");

      const wc = extractedText.trim().split(/\s+/).filter(Boolean).length;
      const rt = Math.ceil(wc / 200);
      setWordCount(wc);
      setPageCount(numPages);
      setReadingTime(rt);
      setFullText(extractedText.trim());

      // ── 2. Call OpenRouter API ─────────────────────────────────────────
      const res = await fetch("/api/summarize-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractedText, apiKey: apiKey.trim() || undefined }),
      });

      setProgress(90);
      setProgressLabel("Processing results…");

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to summarize.");
      }

      setSummary(json.summary as AISummary);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    const formatted = [
      summary.title ? `Title: ${summary.title}` : "",
      `Overview: ${summary.overview}`,
      "",
      "Key Points:",
      ...summary.keyPoints.map((pt, i) => `${i + 1}. ${pt}`),
      "",
      summary.actionItems && summary.actionItems.length > 0
        ? `Action Items:\n${summary.actionItems.map((item) => `- ${item}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summary || !files[0]) return;
    const formatted = [
      summary.title ? `Title: ${summary.title}` : "",
      `Overview: ${summary.overview}`,
      "",
      "Key Points:",
      ...summary.keyPoints.map((pt, i) => `${i + 1}. ${pt}`),
      "",
      summary.actionItems && summary.actionItems.length > 0
        ? `Action Items:\n${summary.actionItems.map((item) => `- ${item}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `${getFileNameWithoutExtension(files[0].name)}-summary.txt`);
  };

  const handleReset = () => {
    setFiles([]);
    setSummary(null);
    setFullText("");
    setError(null);
    setProgress(0);
    setShowFull(false);
    setWordCount(0);
    setPageCount(0);
    setReadingTime(0);
  };

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <ToolLayout
      title="AI Summarizer"
      description="Extract key insights and summarize your PDF documents using AI."
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
                  Required for AI summarization •{" "}
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
            sublabel="or click to browse — works best with text-based PDFs"
          />

          {/* Summarize button */}
          {files.length > 0 && !summary && (
            <button
              id="summarize-pdf-btn"
              onClick={handleProcess}
              disabled={processing}
              className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Analyzing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Summarize PDF with AI
                </>
              )}
            </button>
          )}

          {hasSystemKey && !apiKey.trim() && files.length > 0 && !summary && (
            <p className="text-xs text-[var(--muted-foreground)] text-center -mt-3">
              Uses configured system API key (env variable) by default
            </p>
          )}

          {/* Progress */}
          {processing && <ProgressBar progress={progress} label={progressLabel} />}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Results */}
          {summary && (
            <div className="space-y-5 animate-fade-in">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-center">
                  <FileText className="w-5 h-5 text-[#E8372C] mx-auto mb-1" />
                  <div className="text-lg font-bold text-[var(--foreground)]">{pageCount}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Pages</div>
                </div>
                <div className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-center">
                  <BookOpen className="w-5 h-5 text-[#E8372C] mx-auto mb-1" />
                  <div className="text-lg font-bold text-[var(--foreground)]">
                    {wordCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">Words</div>
                </div>
                <div className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-center">
                  <Clock className="w-5 h-5 text-[#E8372C] mx-auto mb-1" />
                  <div className="text-lg font-bold text-[var(--foreground)]">{readingTime} min</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Read time</div>
                </div>
              </div>

              {/* Document title */}
              {summary.title && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] px-5 py-3">
                  <p className="text-xs text-[var(--muted-foreground)] mb-0.5">Document Title</p>
                  <p className="font-semibold text-[var(--foreground)]">{summary.title}</p>
                </div>
              )}

              {/* Overview */}
              <div className="rounded-xl border border-[#E8372C]/30 bg-[#E8372C]/5 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#E8372C]" />
                    <p className="text-sm font-semibold text-[var(--foreground)]">AI Overview</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-medium ${
                        SENTIMENT_COLOR[summary.sentiment] ?? ""
                      }`}
                    >
                      {cap(summary.sentiment)} Sentiment
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 ${
                        COMPLEXITY_COLOR[summary.complexity] ?? ""
                      }`}
                    >
                      <BarChart2 className="w-2.5 h-2.5" />
                      {cap(summary.complexity)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[var(--foreground)] leading-relaxed">{summary.overview}</p>
              </div>

              {/* Key Points */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-[#E8372C]" />
                    <p className="text-sm font-semibold text-[var(--foreground)]">Key Points</p>
                  </div>
                  <button
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
                        Copy Summary
                      </>
                    )}
                  </button>
                </div>
                <ul className="space-y-2">
                  {summary.keyPoints.map((pt, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[var(--foreground)]">
                      <span className="text-[#E8372C] font-bold shrink-0">{i + 1}.</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Topics */}
              {summary.topics.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#E8372C]" />
                    <p className="text-sm font-semibold text-[var(--foreground)]">Topics Covered</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {summary.topics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-[#E8372C]/10 text-[#E8372C] border border-[#E8372C]/20"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {summary.actionItems && summary.actionItems.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[#E8372C]" />
                    <p className="text-sm font-semibold text-[var(--foreground)]">Action Items</p>
                  </div>
                  <ul className="space-y-2">
                    {summary.actionItems.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[var(--foreground)]">
                        <span className="text-[#E8372C] shrink-0">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Show full extracted text */}
              {fullText && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowFull(!showFull)}
                    className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {showFull ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showFull ? "Hide extracted text" : "Show extracted text"}
                  </button>
                  {showFull && (
                    <pre className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-xs text-[var(--foreground)] overflow-y-auto max-h-64 whitespace-pre-wrap">
                      {fullText}
                    </pre>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] text-white font-semibold rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Summary Text
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium rounded-xl hover:bg-[var(--muted)] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Summarize Another PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info card */}
        {!summary && (
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
                  title: "AI Analysis",
                  desc: "The extracted text is securely processed via OpenRouter's Gemini model.",
                },
                {
                  step: "3",
                  title: "Structured Summary",
                  desc: "Get an overview, key points, topics, complexity metrics, and action items.",
                },
                {
                  step: "4",
                  title: "Export Results",
                  desc: "Copy the output to your clipboard or download it as a text file.",
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
