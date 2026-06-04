"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";

interface FileUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function FileUploader({
  files,
  onFilesChange,
  accept = { "application/pdf": [".pdf"] },
  multiple = false,
  maxSize = 100 * 1024 * 1024,
  label = "Drag & drop your PDF here",
  sublabel = "or click to browse files",
  className,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (multiple) {
        onFilesChange([...files, ...accepted]);
      } else {
        onFilesChange(accepted);
      }
    },
    [files, multiple, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxSize,
  });

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all",
          isDragActive
            ? "border-[#E8372C] bg-[#E8372C]/5 scale-[1.01]"
            : "border-[var(--border)] hover:border-[#E8372C]/50 hover:bg-[var(--muted)]"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
              isDragActive ? "bg-[#E8372C]/10" : "bg-[var(--muted)]"
            )}
          >
            <Upload
              className={cn(
                "w-8 h-8 transition-colors",
                isDragActive ? "text-[#E8372C]" : "text-[var(--muted-foreground)]"
              )}
            />
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)]">{label}</p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{sublabel}</p>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Max file size: {formatBytes(maxSize)}
          </p>
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            {fileRejections.map(({ file, errors }) => (
              <p key={file.name}>
                <span className="font-medium">{file.name}</span>:{" "}
                {errors.map((e) => e.message).join(", ")}
              </p>
            ))}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)]"
            >
              <div className="w-9 h-9 rounded-lg bg-[#E8372C]/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-[#E8372C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{file.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
