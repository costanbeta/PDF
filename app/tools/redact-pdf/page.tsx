"use client";

import { useState, useCallback, useRef } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import {
  findTextMatches,
  applyRedactions,
  applyRegionRedactions,
  type TextMatch,
  type RegionRedaction,
} from "@/lib/pdf/redact";
import {
  Search,
  CreditCard,
  Phone,
  Mail,
  Plus,
  X,
  ShieldCheck,
  Trash2,
  AlertCircle,
  EyeOff,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Types                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

type Tab = "search" | "patterns" | "regions";

interface FoundMatch extends TextMatch {
  id: string;
  label: string;
  preview: string;
}

interface RegionEntry extends RegionRedaction {
  id: string;
}

const PATTERN_OPTIONS = [
  {
    key: "Credit Card",
    icon: CreditCard,
    description: "Visa, Mastercard, Amex numbers",
  },
  {
    key: "Phone Number",
    icon: Phone,
    description: "Local and international formats",
  },
  { key: "Email", icon: Mail, description: "name@domain.com addresses" },
] as const;

/* ─────────────────────────────────────────────────────────────────────────── */
/* Component                                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function RedactPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [tab, setTab] = useState<Tab>("search");

  /* Search tab */
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchMatches, setSearchMatches] = useState<FoundMatch[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  /* Patterns tab */
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(
    new Set()
  );
  const [patternMatches, setPatternMatches] = useState<
    Record<string, FoundMatch[]>
  >({});
  const [isScanningPatterns, setIsScanningPatterns] = useState(false);

  /* Regions tab */
  const [regions, setRegions] = useState<RegionEntry[]>([
    { id: "1", topPercent: 5, heightPercent: 10, pages: "all" },
  ]);

  /* Processing */
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [outputName, setOutputName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pdfBufferRef = useRef<ArrayBuffer | null>(null);

  /* ───────── Helpers ───────── */

  const loadBuffer = useCallback(async (file: File) => {
    if (!pdfBufferRef.current) {
      pdfBufferRef.current = await file.arrayBuffer();
    }
    return pdfBufferRef.current;
  }, []);

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles);
    pdfBufferRef.current = null;
    setSearchMatches([]);
    setPatternMatches({});
    setResult(null);
    setError(null);
    setProgress(0);
  };

  /* ───────── Search ───────── */

  const handleSearch = async () => {
    if (!files[0] || !searchText.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const buf = await loadBuffer(files[0]);
      const raw = await findTextMatches(buf, searchText.trim(), "text");
      const found: FoundMatch[] = raw.map((m, i) => ({
        ...m,
        id: `s-${i}`,
        label: `"${searchText}" — Page ${m.pageIndex + 1}`,
        preview: searchText,
      }));
      setSearchMatches((prev) => {
        // avoid duplicates if search is called multiple times
        const existingIds = new Set(prev.map((p) => `${p.pageIndex}-${p.x}-${p.y}`));
        const fresh = found.filter(
          (f) => !existingIds.has(`${f.pageIndex}-${f.x}-${f.y}`)
        );
        return [...prev, ...fresh];
      });
      if (raw.length === 0) setSearchError(`No matches found for "${searchText}"`);
    } catch {
      setSearchError("Failed to search PDF. Ensure the file is valid.");
    } finally {
      setIsSearching(false);
    }
  };

  const removeSearchMatch = (id: string) =>
    setSearchMatches((prev) => prev.filter((m) => m.id !== id));

  /* ───────── Patterns ───────── */

  const handleScanPattern = async (patternKey: string) => {
    if (!files[0]) return;
    setIsScanningPatterns(true);
    try {
      const buf = await loadBuffer(files[0]);
      const raw = await findTextMatches(buf, patternKey, "pattern");
      const found: FoundMatch[] = raw.map((m, i) => ({
        ...m,
        id: `p-${patternKey}-${i}`,
        label: `${patternKey} — Page ${m.pageIndex + 1}`,
        preview: patternKey,
      }));
      setPatternMatches((prev) => ({ ...prev, [patternKey]: found }));
    } catch {
      /* ignore */
    } finally {
      setIsScanningPatterns(false);
    }
  };

  const togglePattern = async (key: string) => {
    setSelectedPatterns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        if (!patternMatches[key]) handleScanPattern(key);
      }
      return next;
    });
  };

  const removePatternMatch = (patternKey: string, id: string) => {
    setPatternMatches((prev) => ({
      ...prev,
      [patternKey]: (prev[patternKey] || []).filter((m) => m.id !== id),
    }));
  };

  /* ───────── Regions ───────── */

  const addRegion = () =>
    setRegions((r) => [
      ...r,
      {
        id: Date.now().toString(),
        topPercent: 10,
        heightPercent: 10,
        pages: "all",
      },
    ]);

  const removeRegion = (id: string) =>
    setRegions((r) => r.filter((reg) => reg.id !== id));

  const updateRegion = (
    id: string,
    field: keyof RegionRedaction,
    value: string | number
  ) =>
    setRegions((r) =>
      r.map((reg) => (reg.id === id ? { ...reg, [field]: value } : reg))
    );

  /* ───────── Processing ───────── */

  const totalRedactions =
    tab === "search"
      ? searchMatches.length
      : tab === "patterns"
      ? Object.values(patternMatches)
          .flat()
          .filter((m) => selectedPatterns.has(m.preview)).length
      : regions.length;

  const handleRedact = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    setResult(null);

    try {
      const buf = await loadBuffer(files[0]);
      let saved: Uint8Array;

      if (tab === "search" || tab === "patterns") {
        const allMatches: TextMatch[] =
          tab === "search"
            ? searchMatches
            : Object.entries(patternMatches)
                .filter(([key]) => selectedPatterns.has(key))
                .flatMap(([, matches]) => matches);

        setProgress(30);
        saved = await applyRedactions(buf, allMatches);
      } else {
        setProgress(30);
        saved = await applyRegionRedactions(buf, regions);
      }

      setProgress(95);
      setResult(saved);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}-redacted.pdf`);
      setProgress(100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Redaction failed. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    pdfBufferRef.current = null;
    setResult(null);
    setError(null);
    setProgress(0);
    setSearchText("");
    setSearchMatches([]);
    setPatternMatches({});
    setSelectedPatterns(new Set());
    setRegions([{ id: "1", topPercent: 5, heightPercent: 10, pages: "all" }]);
  };

  /* ───────── Render ───────── */

  return (
    <ToolLayout
      title="Redact PDF"
      description="Permanently remove sensitive content from your PDF — text, patterns, or custom regions."
    >
      {!result ? (
        <div className="space-y-5">
          {/* File Uploader */}
          <FileUploader
            files={files}
            onFilesChange={handleFileChange}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            label="Drag & drop your PDF here"
            sublabel="or click to browse · Max 100 MB"
          />

          {files.length > 0 && (
            <>
              {/* File badge */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <div className="w-8 h-8 rounded-lg bg-[#E8372C]/10 flex items-center justify-center shrink-0">
                  <EyeOff className="w-4 h-4 text-[#E8372C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {files[0].name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {(files[0].size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => handleFileChange([])}
                  className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-[var(--muted)] border border-[var(--border)]">
                {(["search", "patterns", "regions"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize ${
                      tab === t
                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {t === "search"
                      ? "Search Text"
                      : t === "patterns"
                      ? "Auto-detect"
                      : "Regions"}
                  </button>
                ))}
              </div>

              {/* ── Search Tab ── */}
              {tab === "search" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)] mb-1">
                        Search & Redact Text
                      </h3>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Type a word or phrase. All occurrences will be permanently blacked out.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                          placeholder="Enter text to redact…"
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--muted)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#E8372C] transition-colors"
                        />
                      </div>
                      <button
                        onClick={handleSearch}
                        disabled={!searchText.trim() || isSearching}
                        className="px-4 py-2.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
                      >
                        {isSearching ? "Searching…" : "Find & Mark"}
                      </button>
                    </div>

                    {searchError && (
                      <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        {searchError}
                      </div>
                    )}
                  </div>

                  {searchMatches.length > 0 && (
                    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-[var(--foreground)]">
                          Marked for Redaction
                          <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                            ({searchMatches.length} occurrence
                            {searchMatches.length !== 1 ? "s" : ""})
                          </span>
                        </p>
                        <button
                          onClick={() => setSearchMatches([])}
                          className="text-xs text-red-500 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Clear all
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {searchMatches.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-[#E8372C] shrink-0" />
                              <span className="text-xs text-[var(--foreground)] truncate">
                                {m.label}
                              </span>
                            </div>
                            <button
                              onClick={() => removeSearchMatch(m.id)}
                              className="text-[var(--muted-foreground)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Patterns Tab ── */}
              {tab === "patterns" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)] mb-1">
                        Auto-detect Sensitive Data
                      </h3>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Select patterns to automatically find and redact all
                        matching data across the document.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {PATTERN_OPTIONS.map(({ key, icon: Icon, description }) => {
                        const isSelected = selectedPatterns.has(key);
                        const count = patternMatches[key]?.length ?? null;

                        return (
                          <button
                            key={key}
                            onClick={() => togglePattern(key)}
                            disabled={isScanningPatterns}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                              isSelected
                                ? "border-[#E8372C] bg-[#E8372C]/5"
                                : "border-[var(--border)] hover:border-[var(--foreground)]/30"
                            }`}
                          >
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-[#E8372C] text-white"
                                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                              }`}
                            >
                              <Icon className="w-4.5 h-4.5 w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-semibold ${
                                  isSelected
                                    ? "text-[#E8372C]"
                                    : "text-[var(--foreground)]"
                                }`}
                              >
                                {key}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {description}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              {count !== null ? (
                                <span
                                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                    count > 0
                                      ? "bg-[#E8372C]/10 text-[#E8372C]"
                                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                                  }`}
                                >
                                  {count} found
                                </span>
                              ) : isSelected && isScanningPatterns ? (
                                <span className="text-xs text-[var(--muted-foreground)]">
                                  Scanning…
                                </span>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pattern match lists */}
                  {Array.from(selectedPatterns).map((key) => {
                    const matches = patternMatches[key] || [];
                    if (matches.length === 0) return null;
                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {key}
                            <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                              ({matches.length} match
                              {matches.length !== 1 ? "es" : ""})
                            </span>
                          </p>
                          <button
                            onClick={() =>
                              setPatternMatches((prev) => ({
                                ...prev,
                                [key]: [],
                              }))
                            }
                            className="text-xs text-red-500 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Clear
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {matches.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-[#E8372C] shrink-0" />
                                <span className="text-xs text-[var(--foreground)] truncate">
                                  {m.label}
                                </span>
                              </div>
                              <button
                                onClick={() => removePatternMatch(key, m.id)}
                                className="text-[var(--muted-foreground)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Regions Tab ── */}
              {tab === "regions" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--foreground)] mb-0.5">
                          Redaction Regions
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Define full-width black bars by position on the page.
                        </p>
                      </div>
                      <button
                        onClick={addRegion}
                        className="flex items-center gap-1.5 text-sm text-[#E8372C] hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Region
                      </button>
                    </div>

                    <div className="space-y-4">
                      {regions.map((region, idx) => (
                        <div
                          key={region.id}
                          className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-[var(--foreground)]">
                              Region {idx + 1}
                            </span>
                            {regions.length > 1 && (
                              <button
                                onClick={() => removeRegion(region.id)}
                                className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                                <span>Top offset</span>
                                <span>{region.topPercent}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={90}
                                value={region.topPercent}
                                onChange={(e) =>
                                  updateRegion(
                                    region.id,
                                    "topPercent",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full accent-[#E8372C]"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                                <span>Height</span>
                                <span>{region.heightPercent}%</span>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={100}
                                value={region.heightPercent}
                                onChange={(e) =>
                                  updateRegion(
                                    region.id,
                                    "heightPercent",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full accent-[#E8372C]"
                              />
                            </div>
                          </div>

                          {/* Page scope */}
                          <div className="flex gap-3">
                            {(["all", "first", "last"] as const).map((p) => (
                              <label
                                key={p}
                                className="flex items-center gap-1.5 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name={`pages-${region.id}`}
                                  value={p}
                                  checked={region.pages === p}
                                  onChange={() =>
                                    updateRegion(region.id, "pages", p)
                                  }
                                  className="accent-[#E8372C]"
                                />
                                <span className="text-xs text-[var(--foreground)] capitalize">
                                  {p === "all"
                                    ? "All pages"
                                    : p === "first"
                                    ? "First page"
                                    : "Last page"}
                                </span>
                              </label>
                            ))}
                          </div>

                          {/* Preview miniature */}
                          <div
                            className="rounded-lg border border-[var(--border)] bg-white overflow-hidden relative"
                            style={{ height: 60 }}
                          >
                            <div className="absolute inset-0 bg-gray-100 dark:bg-zinc-800" />
                            <div
                              className="absolute left-0 right-0 bg-black"
                              style={{
                                top: `${region.topPercent}%`,
                                height: `${region.heightPercent}%`,
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-[10px] text-gray-400">
                                Page preview
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Progress */}
              {processing && (
                <ProgressBar progress={progress} label="Applying redactions…" />
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Privacy notice */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Files are processed locally in your browser — they never leave
                  your device.
                </span>
              </div>

              {/* Action button */}
              <button
                onClick={handleRedact}
                disabled={
                  processing ||
                  (tab === "search" && searchMatches.length === 0) ||
                  (tab === "patterns" &&
                    Object.values(patternMatches)
                      .flat()
                      .filter((m) => selectedPatterns.has(m.preview)).length === 0 &&
                    selectedPatterns.size === 0) ||
                  (tab === "regions" && regions.length === 0)
                }
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
              >
                <EyeOff className="w-5 h-5" />
                {processing
                  ? "Redacting…"
                  : `Apply Redactions${
                      totalRedactions > 0 ? ` (${totalRedactions})` : ""
                    }`}
              </button>
            </>
          )}
        </div>
      ) : (
        <DownloadButton
          data={result}
          filename={outputName}
          fileSize={result.length}
          onReset={handleReset}
          label="Download Redacted PDF"
        />
      )}
    </ToolLayout>
  );
}
