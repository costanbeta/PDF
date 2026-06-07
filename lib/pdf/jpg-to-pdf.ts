import { PDFDocument } from "pdf-lib";

export type Orientation = "portrait" | "landscape";
export type PageSizeId = "fit" | "a4" | "a3" | "letter" | "legal";
export type MarginSize = "none" | "small" | "big";

export interface ImageToPDFOptions {
  orientation: Orientation;
  pageSize: PageSizeId;
  margin: MarginSize;
  oneLongPage?: boolean;
}

const PAGE_SIZES: Record<Exclude<PageSizeId, "fit">, [number, number]> = {
  a4:     [595.28, 841.89],
  a3:     [841.89, 1190.55],
  letter: [612, 792],
  legal:  [612, 1008],
};

const MARGINS: Record<MarginSize, number> = {
  none:  0,
  small: 20,
  big:   50,
};

async function embedImage(pdf: PDFDocument, file: File) {
  const buffer = await file.arrayBuffer();
  const mime = file.type;
  if (mime === "image/jpeg" || mime === "image/jpg") return pdf.embedJpg(buffer);
  if (mime === "image/png") return pdf.embedPng(buffer);
  // WebP fallback
  try { return await pdf.embedJpg(buffer); } catch { return pdf.embedPng(buffer); }
}

export async function imagesToPDF(
  files: File[],
  options: ImageToPDFOptions = { orientation: "portrait", pageSize: "fit", margin: "none", oneLongPage: false }
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const margin = MARGINS[options.margin];

  if (options.oneLongPage) {
    const embeddedImages = [];
    let pageW: number;

    if (options.pageSize === "fit") {
      let maxW = 0;
      for (const file of files) {
        const img = await embedImage(pdf, file);
        if (img.width > maxW) maxW = img.width;
        embeddedImages.push({ img, w: img.width, h: img.height });
      }
      pageW = maxW + margin * 2;
    } else {
      let [w, h] = PAGE_SIZES[options.pageSize];
      if (options.orientation === "landscape") [w, h] = [h, w];
      pageW = w;
      for (const file of files) {
        const img = await embedImage(pdf, file);
        embeddedImages.push({ img, w: img.width, h: img.height });
      }
    }

    const drawW = pageW - margin * 2;
    const imagesWithScaledDimensions = embeddedImages.map((item) => {
      const scale = drawW / item.w;
      const scaledW = drawW;
      const scaledH = item.h * scale;
      return { ...item, scaledW, scaledH };
    });

    const sumScaledHeight = imagesWithScaledDimensions.reduce((sum, item) => sum + item.scaledH, 0);
    const pageH = sumScaledHeight + margin * 2;

    const page = pdf.addPage([pageW, pageH]);
    let currentY = pageH - margin;

    for (const item of imagesWithScaledDimensions) {
      currentY -= item.scaledH;
      page.drawImage(item.img, {
        x: margin,
        y: currentY,
        width: item.scaledW,
        height: item.scaledH,
      });
    }

    return pdf.save();
  }

  for (const file of files) {
    const image = await embedImage(pdf, file);
    const imgW = image.width;
    const imgH = image.height;

    let pageW: number, pageH: number;

    if (options.pageSize === "fit") {
      pageW = imgW;
      pageH = imgH;
    } else {
      let [w, h] = PAGE_SIZES[options.pageSize];
      if (options.orientation === "landscape") [w, h] = [h, w];
      pageW = w;
      pageH = h;
    }

    const page = pdf.addPage([pageW, pageH]);
    const drawW = pageW - margin * 2;
    const drawH = pageH - margin * 2;

    // Scale image to fit within draw area, preserve aspect ratio
    const scale = Math.min(drawW / imgW, drawH / imgH);
    const scaledW = imgW * scale;
    const scaledH = imgH * scale;

    // Center the image
    const x = margin + (drawW - scaledW) / 2;
    const y = margin + (drawH - scaledH) / 2;

    page.drawImage(image, { x, y, width: scaledW, height: scaledH });
  }

  return pdf.save();
}

export async function imagesToPDFSeparate(
  files: File[],
  options: ImageToPDFOptions
): Promise<{ name: string; data: Uint8Array }[]> {
  const results = [];
  for (const file of files) {
    const data = await imagesToPDF([file], options);
    results.push({ name: file.name.replace(/\.[^/.]+$/, "") + ".pdf", data });
  }
  return results;
}
