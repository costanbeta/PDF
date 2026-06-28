import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";

export interface ProtectOptions {
  userPassword: string;
  ownerPassword: string;
}

export async function protectPDF(
  file: File,
  options: ProtectOptions
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  return encryptPDF(
    bytes,
    options.userPassword,
    options.ownerPassword || null
  );
}
