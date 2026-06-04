"use client";

import { useState } from "react";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { unlockPDF } from "@/lib/pdf/unlock";
import { Unlock, Eye, EyeOff } from "lucide-react";

export default function UnlockPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const file = files[0] ?? null;

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(30);
    setError(null);
    try {
      const unlocked = await unlockPDF(file, password);
      setProgress(100);
      setResult(unlocked);
    } catch {
      setError("Failed to unlock PDF. The password may be incorrect, or the file may not be encrypted.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setProgress(0);
    setError(null);
    setPassword("");
  };

  return (
    <ToolLayout
      title="Unlock PDF"
      description="Remove password protection from a PDF document to allow unrestricted access."
    >
      <FileUploader
        files={files}
        onFilesChange={setFiles}
        label="Drag & drop your protected PDF here"
        sublabel="Upload a password-protected PDF"
      />

      {file && !result && (
        <>
          <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Enter Password</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">PDF Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the PDF password"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[#E8372C]"
                  onKeyDown={(e) => e.key === "Enter" && handleProcess()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Leave blank if the PDF doesn&apos;t require a password
              </p>
            </div>
          </div>

          {processing && <ProgressBar progress={progress} label="Removing protection..." />}

          {error && (
            <p className="text-sm text-red-500 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              {error}
            </p>
          )}

          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
          >
            <Unlock className="w-5 h-5" />
            {processing ? "Unlocking..." : "Unlock PDF"}
          </button>
        </>
      )}

      {result && (
        <DownloadButton
          data={result}
          filename={`unlocked_${file?.name ?? "output.pdf"}`}
          fileSize={result.length}
          onReset={handleReset}
          label="Download Unlocked PDF"
        />
      )}
    </ToolLayout>
  );
}
