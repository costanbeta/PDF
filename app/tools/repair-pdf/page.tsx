"use client";

import { useState } from "react";
import { PDFDocument } from "pdf-lib";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { FileUploader } from "@/components/tools/FileUploader";
import { DownloadButton } from "@/components/tools/DownloadButton";
import { ProgressBar } from "@/components/tools/ProgressBar";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface Diagnostic {
  pageCount: number;
  encrypted: boolean;
  status: "success" | "fallback" | "failed";
  message: string;
}

export default function RepairPDFPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Uint8Array | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("");

  const handleProcess = async () => {
    if (!files[0]) return;
    setProcessing(true);
    setProgress(10);
    setError(null);
    setDiagnostic(null);
    setResult(null);

    try {
      const buffer = await files[0].arrayBuffer();
      setProgress(30);

      let pdf: PDFDocument;
      let encrypted = false;
      let status: Diagnostic["status"] = "success";
      let message = "PDF loaded and repaired successfully.";

      try {
        pdf = await PDFDocument.load(buffer);
      } catch {
        try {
          pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
          encrypted = true;
          status = "fallback";
          message = "PDF was encrypted or had issues. Loaded with encryption bypass.";
        } catch (fallbackErr) {
          throw new Error(`Could not repair PDF: ${fallbackErr instanceof Error ? fallbackErr.message : "Unknown error"}`);
        }
      }

      setProgress(60);

      const pageCount = pdf.getPageCount();
      const saved = await pdf.save();

      setProgress(90);

      setDiagnostic({ pageCount, encrypted, status, message });
      setResult(saved);
      setOutputName(`${getFileNameWithoutExtension(files[0].name)}-repaired.pdf`);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to repair PDF.");
      setDiagnostic({
        pageCount: 0,
        encrypted: false,
        status: "failed",
        message: err instanceof Error ? err.message : "Failed to repair PDF.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setDiagnostic(null);
    setError(null);
    setProgress(0);
  };

  return (
    <ToolLayout
      toolId="repair-pdf"
      title="Repair PDF"
      description="Fix corrupted or damaged PDF files."
    >
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-6">
        <FileUploader
          files={files}
          onFilesChange={setFiles}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={false}
          label="Drag & drop your PDF here"
          sublabel="or click to browse — supports damaged or encrypted files"
        />

        {files.length > 0 && !result && (
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full py-3.5 bg-[#E8372C] hover:bg-[#c42d22] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
          >
            {processing ? "Repairing…" : "Repair PDF"}
          </button>
        )}

        {processing && (
          <ProgressBar progress={progress} label="Repairing PDF…" />
        )}

        {diagnostic && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4 space-y-3">
            <p className="font-semibold text-[var(--foreground)]">Diagnostics</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {diagnostic.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : diagnostic.status === "fallback" ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                )}
                <span className="text-[var(--foreground)]">{diagnostic.message}</span>
              </div>
              {diagnostic.pageCount > 0 && (
                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <span>Pages found:</span>
                  <span className="font-medium text-[var(--foreground)]">{diagnostic.pageCount}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                <span>Encryption detected:</span>
                <span className="font-medium text-[var(--foreground)]">{diagnostic.encrypted ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        )}

        {error && !diagnostic && (
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {result && (
          <DownloadButton
            data={result}
            filename={outputName}
            fileSize={result.length}
            onReset={handleReset}
            label="Download Repaired PDF"
          />
        )}
      </div>
    </ToolLayout>
  );
}
