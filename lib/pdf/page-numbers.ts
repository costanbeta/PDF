import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export type PageNumberPosition =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "top-left"
  | "top-center"
  | "top-right";

export interface PageNumberOptions {
  position: PageNumberPosition;
  fontSize: number;
  startNumber: number;
  prefix?: string;
  suffix?: string;
}

export async function addPageNumbers(
  file: File,
  options: PageNumberOptions
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const margin = 30;

  pdf.getPages().forEach((page, index) => {
    const { width, height } = page.getSize();
    const pageNum = index + options.startNumber;
    const text = `${options.prefix ?? ""}${pageNum}${options.suffix ?? ""}`;
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);

    let x: number;
    let y: number;

    const isBottom = options.position.startsWith("bottom");
    y = isBottom ? margin : height - margin - options.fontSize;

    const hAlign = options.position.split("-")[1];
    if (hAlign === "left") x = margin;
    else if (hAlign === "right") x = width - textWidth - margin;
    else x = (width - textWidth) / 2;

    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  return pdf.save();
}
