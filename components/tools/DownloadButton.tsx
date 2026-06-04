"use client";

import { Download, Check, RefreshCw } from "lucide-react";
import { cn, downloadBlob, formatBytes } from "@/lib/utils";

interface DownloadButtonProps {
  data: Uint8Array | Blob | null;
  filename: string;
  fileSize?: number;
  onReset?: () => void;
  label?: string;
  className?: string;
}

export function DownloadButton({
  data,
  filename,
  fileSize,
  onReset,
  label = "Download",
  className,
}: DownloadButtonProps) {
  if (!data) return null;

  const blob = data instanceof Uint8Array ? new Blob([data as BlobPart], { type: "application/pdf" }) : data;

  const handleDownload = () => {
    downloadBlob(blob, filename);
  };

  return (
    <div className={cn("flex flex-col sm:flex-row items-center gap-3", className)}>
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 flex-1 w-full sm:w-auto">
        <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
            {filename}
          </p>
          {fileSize !== undefined && (
            <p className="text-xs text-green-600 dark:text-green-400">{formatBytes(fileSize)}</p>
          )}
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="flex items-center gap-2 px-6 py-3 bg-[#E8372C] hover:bg-[#c42d22] text-white font-semibold rounded-xl transition-all hover:shadow-md whitespace-nowrap"
      >
        <Download className="w-4 h-4" />
        {label}
      </button>

      {onReset && (
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-3 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium rounded-xl hover:bg-[var(--muted)] transition-colors whitespace-nowrap"
        >
          <RefreshCw className="w-4 h-4" />
          Process Another
        </button>
      )}
    </div>
  );
}
