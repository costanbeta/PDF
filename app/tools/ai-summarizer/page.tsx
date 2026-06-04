"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { Sparkles, BookOpen, Clock, FileText } from "lucide-react";

interface TextItem {
  str: string;
}

interface TextContent {
  items: TextItem[];
}

interface Summary {
  text: string;
  wordCount: number;
  pageCount: number;
  readingTime: number;
  sentences: string[];
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
}

function extractiveSummarize(text: string, numSentences: number = 8): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 500);

  if (sentences.length === 0) return [];

  const allTokens = tokenize(text);
  const freq: Record<string, number> = {};
  for (const t of allTokens) {
    freq[t] = (freq[t] || 0) + 1;
  }

  const maxFreq = Math.max(...Object.values(freq), 1);
  const normalizedFreq: Record<string, number> = {};
  for (const [k, v] of Object.entries(freq)) {
    normalizedFreq[k] = v / maxFreq;
  }

  const scored = sentences.map((sentence, idx) => {
    const tokens = tokenize(sentence);
    const score =
      tokens.reduce((sum, t) => sum + (normalizedFreq[t] || 0), 0) / (tokens.length || 1);
    return { sentence, score, idx };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, numSentences)
    .sort((a, b) => a.idx - b.idx)
    .map((s) => s.sentence);
}

export default function AISummarizerPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fullText, setFullText] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(5);
    setError(null);
    setSummary(null);

    try {
      const buffer = await files[0].arrayBuffer();
      setProgress(15);

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const numPages = pdfDoc.numPages;
      let extractedText = "";

      for (let p = 1; p <= numPages; p++) {
        setProgress(15 + Math.round((p / numPages) * 60));
        const page = await pdfDoc.getPage(p);
        const content = await page.getTextContent() as TextContent;
        extractedText += content.items.map((i) => i.str).join(" ") + "\n";
      }

      setProgress(80);
      setFullText(extractedText.trim());

      const wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;
      const readingTime = Math.ceil(wordCount / 200);
      const sentences = extractiveSummarize(extractedText, 8);

      setProgress(95);
      setSummary({
        text: sentences.join(" "),
        wordCount,
        pageCount: numPages,
        readingTime,
        sentences,
      });
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setSummary(null);
    setFullText("");
    setError(null);
    setProgress(0);
    setShowFull(false);
  };

  return (
    <ToolLayout
      title="AI Summarizer"
      description="Extract key insights and summarize your PDF documents."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Drag & drop your PDF here"
          sublabel="or click to browse — works best with text-based PDFs"
        />

        {files.length > 0 && !summary && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Analyzing…" : "Summarize PDF"}
          </button>
        )}

        {processing && <ProgressBar progress={progress} label="Extracting and analyzing text…" />}

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {summary && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-center">
                <FileText className="w-5 h-5 text-[#E8372C] mx-auto mb-1" />
                <div className="text-lg font-bold text-[var(--foreground)]">{summary.pageCount}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Pages</div>
              </div>
              <div className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-center">
                <BookOpen className="w-5 h-5 text-[#E8372C] mx-auto mb-1" />
                <div className="text-lg font-bold text-[var(--foreground)]">{summary.wordCount.toLocaleString()}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Words</div>
              </div>
              <div className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-center">
                <Clock className="w-5 h-5 text-[#E8372C] mx-auto mb-1" />
                <div className="text-lg font-bold text-[var(--foreground)]">{summary.readingTime} min</div>
                <div className="text-xs text-[var(--muted-foreground)]">Read time</div>
              </div>
            </div>

            <div className="rounded-xl border border-[#E8372C]/30 bg-[#E8372C]/5 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8372C]" />
                <p className="text-sm font-semibold text-[var(--foreground)]">Summary</p>
                <span className="text-xs text-[var(--muted-foreground)] ml-auto">
                  Using extractive summarization — key sentences from the document.
                </span>
              </div>
              {summary.sentences.length > 0 ? (
                <ul className="space-y-2">
                  {summary.sentences.map((sentence, i) => (
                    <li key={i} className="flex gap-2 text-sm text-[var(--foreground)]">
                      <span className="text-[#E8372C] font-bold shrink-0">{i + 1}.</span>
                      <span>{sentence}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Could not extract meaningful sentences. The document may be image-based or have unusual formatting.
                </p>
              )}
            </div>

            {fullText && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowFull(!showFull)}
                  className="text-sm text-[#E8372C] hover:underline"
                >
                  {showFull ? "Hide full text" : "Show extracted text"}
                </button>
                {showFull && (
                  <pre className="rounded-xl bg-[var(--muted)] border border-[var(--border)] p-4 text-xs text-[var(--foreground)] overflow-y-auto max-h-64 whitespace-pre-wrap">
                    {fullText}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={handleReset}
              className="w-full py-3 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium rounded-xl hover:bg-[var(--muted)] transition-colors text-sm"
            >
              Summarize Another PDF
            </button>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
