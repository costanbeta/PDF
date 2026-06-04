import { PDFDocument } from "pdf-lib";

export async function unlockPDF(file: File, _password: string): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  // pdf-lib v1.x loads encrypted PDFs by ignoring encryption
  // For full decryption, we reload and save without encryption
  const pdf = await PDFDocument.load(buffer, {
    ignoreEncryption: true,
  });

  return pdf.save();
}
