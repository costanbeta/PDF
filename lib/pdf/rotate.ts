import { PDFDocument, degrees } from "pdf-lib";

export async function rotatePDF(
  file: File,
  rotations: Record<number, number>
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);

  pdf.getPages().forEach((page, index) => {
    const rotation = rotations[index] ?? 0;
    if (rotation !== 0) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotation) % 360));
    }
  });

  return pdf.save();
}
