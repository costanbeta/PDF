import { PDFDocument } from "pdf-lib";

export async function imagesToPDF(files: File[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const mimeType = file.type;

    let image;
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      image = await pdf.embedJpg(buffer);
    } else if (mimeType === "image/png") {
      image = await pdf.embedPng(buffer);
    } else {
      // For webp and others, try as jpeg
      image = await pdf.embedJpg(buffer).catch(() => pdf.embedPng(buffer));
    }

    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  return pdf.save();
}
