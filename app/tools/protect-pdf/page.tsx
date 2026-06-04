"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { protectPDF } from "@/lib/pdf/protect";
import { Lock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProtectPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [userPassword, setUserPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [showUser, setShowUser] = useState(false);
  const [showOwner, setShowOwner] = useState(false);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const file = files[0] ?? null;

  const handleProcess = async () => {
    if (!file || !userPassword) return;
    setProcessing(true);
    setProgress(30);
    setError(null);
    try {
      const protected_ = await protectPDF(file, {
        userPassword,
        ownerPassword: ownerPassword || userPassword,
      });
      setProgress(100);
      setResult(protected_);
    } catch {
      setError("Failed to protect PDF. Please ensure the file is a valid PDF.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setProgress(0);
    setError(null);
    setUserPassword("");
    setOwnerPassword("");
  };

  return (
    <ToolLayout
      title="Protect PDF"
      description="Add password protection to your PDF document to prevent unauthorized access."
    >
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your PDF here"
        sublabel="Upload one PDF to password protect"
      />

      {file && !result && (
        <>
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-5">
            <h3 className="font-semibold text-[var(--foreground)]">Password Settings</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">
                User Password <span className="text-[#E8372C]">*</span>
              </label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Required to open the PDF
              </p>
              <div className="relative">
                <input
                  type={showUser ? "text" : "password"}
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Enter password to open PDF"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                />
                <button
                  type="button"
                  onClick={() => setShowUser(!showUser)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                >
                  {showUser ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">
                Owner Password
              </label>
              <p className="text-xs text-[var(--muted-foreground)]">
                For editing permissions (optional — defaults to user password)
              </p>
              <div className="relative">
                <input
                  type={showOwner ? "text" : "password"}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Enter owner password (optional)"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                />
                <button
                  type="button"
                  onClick={() => setShowOwner(!showOwner)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                >
                  {showOwner ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ Remember your password — encrypted PDFs cannot be recovered without it.
            </div>
          </div>

          {processing && <ProgressBar progress={progress} label="Encrypting PDF..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleProcess}
            disabled={processing || !userPassword}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
            )}
          >
            <Lock className="w-5 h-5" />
            {processing ? "Encrypting..." : "Protect PDF"}
          </button>
        </>
      )}

      {result && (
        <DownloadButton
          data={result}
          filename={`protected_${file?.name ?? "output.pdf"}`}
          fileSize={result.length}
          onReset={handleReset}
          label="Download Protected PDF"
        />
      )}
    </ToolLayout>
  );
}
