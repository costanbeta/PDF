import { PDFDocument } from "pdf-lib";

export async function organizePDF(
  file: File,
  pageOrder: number[]
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const source = await PDFDocument.load(buffer);
  const newDoc = await PDFDocument.create();

  const pages = await newDoc.copyPages(source, pageOrder);
  pages.forEach((page) => newDoc.addPage(page));

  return newDoc.save();
}
