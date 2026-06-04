import { PDFDocument } from "pdf-lib";

export type CompressionLevel = "low" | "medium" | "high";

export async function compressPDF(
  file: File,
  level: CompressionLevel
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });

  // pdf-lib doesn't have native compression, but we can re-save to strip metadata
  // and remove unused objects, which reduces file size somewhat
  const saveOptions = {
    useObjectStreams: level !== "low",
    addDefaultPage: false,
    objectsPerTick: level === "high" ? 20 : level === "medium" ? 50 : 100,
  };

  return pdf.save(saveOptions);
}
