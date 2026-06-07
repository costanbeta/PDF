import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export type PageNumberPosition =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "top-left"
  | "top-center"
  | "top-right";

export interface PageNumberOptions {
  position: PageNumberPosition;
  fontSize: number;
  startNumber: number;
  pageMode?: "single" | "facing";
  marginType?: "recommended" | "small" | "large";
  fromPage?: number;
  toPage?: number;
  textFormat?: string;
  fontFamily?: "Helvetica" | "Times-Roman" | "Courier";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  return {
    r: isNaN(num) ? 0.2 : ((num >> 16) & 255) / 255,
    g: isNaN(num) ? 0.2 : ((num >> 8) & 255) / 255,
    b: isNaN(num) ? 0.2 : (num & 255) / 255,
  };
}

export async function addPageNumbers(
  file: File,
  options: PageNumberOptions
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);

  // 1. Resolve Margins
  let margin = 30;
  if (options.marginType === "small") margin = 15;
  else if (options.marginType === "large") margin = 50;

  // 2. Resolve Font
  const fontFamily = options.fontFamily ?? "Helvetica";
  const bold = options.bold ?? false;
  const italic = options.italic ?? false;

  let fontName: string;
  if (fontFamily === "Times-Roman") {
    if (bold && italic) fontName = "Times-BoldItalic";
    else if (bold) fontName = "Times-Bold";
    else if (italic) fontName = "Times-Italic";
    else fontName = "Times-Roman";
  } else if (fontFamily === "Courier") {
    if (bold && italic) fontName = "Courier-BoldOblique";
    else if (bold) fontName = "Courier-Bold";
    else if (italic) fontName = "Courier-Oblique";
    else fontName = "Courier";
  } else {
    // Helvetica
    if (bold && italic) fontName = "Helvetica-BoldOblique";
    else if (bold) fontName = "Helvetica-Bold";
    else if (italic) fontName = "Helvetica-Oblique";
    else fontName = "Helvetica";
  }

  const font = await pdf.embedFont(fontName as StandardFonts);

  // 3. Resolve Color
  const hexColor = options.color ?? "#333333";
  const { r, g, b } = hexToRgb(hexColor);

  const totalPages = pdf.getPageCount();
  const fromPage = options.fromPage ?? 1;
  const toPage = options.toPage ?? totalPages;
  const pageMode = options.pageMode ?? "single";

  pdf.getPages().forEach((page, index) => {
    const pageNumOneBased = index + 1;
    if (pageNumOneBased < fromPage || pageNumOneBased > toPage) {
      return; // Skip pages outside the selected numbering range
    }

    const { width, height } = page.getSize();
    const pageNum = options.startNumber + (pageNumOneBased - fromPage);

    // Format text
    const textFormat = options.textFormat ?? "{n}";
    const text = textFormat
      .replace("{n}", pageNum.toString())
      .replace("{m}", totalPages.toString());

    const textWidth = font.widthOfTextAtSize(text, options.fontSize);

    let x: number;
    let y: number;

    // Resolve y-coordinate (vertical alignment)
    const position = options.position;
    if (position.startsWith("bottom")) {
      y = margin;
    } else if (position.startsWith("top")) {
      y = height - margin - options.fontSize;
    } else {
      // middle
      y = (height - options.fontSize) / 2;
    }

    // Resolve x-coordinate (horizontal alignment) with facing pages mode handling
    let hAlign = position.split("-")[1];

    if (pageMode === "facing") {
      const isEvenPage = pageNumOneBased % 2 === 0;
      if (isEvenPage) {
        if (hAlign === "right") hAlign = "left";
        else if (hAlign === "left") hAlign = "right";
      }
    }

    if (hAlign === "left") {
      x = margin;
    } else if (hAlign === "right") {
      x = width - textWidth - margin;
    } else {
      // center
      x = (width - textWidth) / 2;
    }

    // Draw text
    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(r, g, b),
    });

    // Draw underline if enabled
    if (options.underline) {
      const thickness = Math.max(0.5, options.fontSize / 12);
      page.drawLine({
        start: { x, y: y - thickness - 1 },
        end: { x: x + textWidth, y: y - thickness - 1 },
        thickness,
        color: rgb(r, g, b),
      });
    }
  });

  return pdf.save();
}

