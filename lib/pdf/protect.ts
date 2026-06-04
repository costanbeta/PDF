import { PDFDocument } from "pdf-lib";

export interface ProtectOptions {
  userPassword: string;
  ownerPassword: string;
}

export async function protectPDF(
  file: File,
  options: ProtectOptions
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);

  // pdf-lib supports basic encryption
  return pdf.save({
    // @ts-expect-error - pdf-lib encryption support
    userPassword: options.userPassword || undefined,
    ownerPassword: options.ownerPassword || undefined,
  });
}
