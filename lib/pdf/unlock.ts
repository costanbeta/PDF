import { decryptPDF, isEncrypted } from "@pdfsmaller/pdf-decrypt";

export async function unlockPDF(file: File, password: string): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const encryptionInfo = await isEncrypted(bytes);
  if (!encryptionInfo.encrypted) {
    return bytes;
  }

  return decryptPDF(bytes, password);
}
