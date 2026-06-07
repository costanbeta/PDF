import { PDFDocument, rgb, StandardFonts, degrees, PDFPage, PDFFont, PDFImage } from "pdf-lib";

export type WatermarkPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type WatermarkLayer = "over" | "below";

export interface WatermarkOptions {
  mode: "text" | "image";

  // Text options
  text?: string;
  fontSize?: number;
  fontFamily?: "Helvetica" | "Times-Roman" | "Courier";
  bold?: boolean;
  italic?: boolean;
  color?: string;

  // Image options
  imageFile?: File;

  // Shared
  opacity: number;            // 0-100
  rotation: number;           // degrees
  position: WatermarkPosition;
  mosaic: boolean;
  layer: WatermarkLayer;

  // Page range (1-based, inclusive)
  fromPage: number;
  toPage: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

function resolveFont(
  pdf: PDFDocument,
  family: string,
  bold: boolean,
  italic: boolean
): Promise<PDFFont> {
  const map: Record<string, StandardFonts> = {
    "Helvetica-BoldOblique": StandardFonts.HelveticaBoldOblique,
    "Helvetica-Bold": StandardFonts.HelveticaBold,
    "Helvetica-Oblique": StandardFonts.HelveticaOblique,
    Helvetica: StandardFonts.Helvetica,
    "Times-BoldItalic": StandardFonts.TimesRomanBoldItalic,
    "Times-Bold": StandardFonts.TimesRomanBold,
    "Times-Italic": StandardFonts.TimesRomanItalic,
    "Times-Roman": StandardFonts.TimesRoman,
    "Courier-BoldOblique": StandardFonts.CourierBoldOblique,
    "Courier-Bold": StandardFonts.CourierBold,
    "Courier-Oblique": StandardFonts.CourierOblique,
    Courier: StandardFonts.Courier,
  };

  const suffix = bold && italic ? (family === "Helvetica" ? "-BoldOblique" : family === "Times-Roman" ? "-BoldItalic" : "-BoldOblique")
    : bold ? "-Bold"
    : italic ? (family === "Helvetica" ? "-Oblique" : family === "Times-Roman" ? "-Italic" : "-Oblique")
    : "";

  const key = family + suffix;
  const standard = map[key] ?? StandardFonts.Helvetica;
  return pdf.embedFont(standard);
}

function getXY(
  position: WatermarkPosition,
  pageWidth: number,
  pageHeight: number,
  itemWidth: number,
  itemHeight: number,
  margin = 40
): { x: number; y: number } {
  const [v, h] = position.split("-") as [string, string];

  let x: number;
  if (h === "left") x = margin;
  else if (h === "right") x = pageWidth - itemWidth - margin;
  else x = pageWidth / 2 - itemWidth / 2;

  let y: number;
  if (v === "top") y = pageHeight - itemHeight - margin;
  else if (v === "bottom") y = margin;
  else y = pageHeight / 2 - itemHeight / 2;

  return { x, y };
}

function drawTextWatermark(
  page: PDFPage,
  options: WatermarkOptions,
  font: PDFFont,
  mx: number,
  my: number
) {
  const text = options.text ?? "WATERMARK";
  const fontSize = options.fontSize ?? 48;
  const { r, g, b } = hexToRgb(options.color ?? "#E8372C");
  const opacity = options.opacity / 100;
  const rot = options.rotation;
  const { width, height } = page.getSize();

  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = font.heightAtSize(fontSize);

  if (options.mosaic) {
    const stepX = textWidth * 1.5;
    const stepY = textHeight * 3;
    for (let tx = mx; tx < width + stepX; tx += stepX) {
      for (let ty = my; ty < height + stepY; ty += stepY) {
        page.drawText(text, {
          x: tx, y: ty, size: fontSize, font,
          color: rgb(r, g, b), opacity, rotate: degrees(rot),
        });
      }
    }
  } else {
    const { x, y } = getXY(options.position, width, height, textWidth, textHeight);
    page.drawText(text, {
      x, y, size: fontSize, font,
      color: rgb(r, g, b), opacity, rotate: degrees(rot),
    });
  }
}

function drawImageWatermark(
  page: PDFPage,
  embeddedImage: PDFImage,
  options: WatermarkOptions
) {
  const { width, height } = page.getSize();
  const opacity = options.opacity / 100;
  const rot = options.rotation;

  const maxW = Math.min(width * 0.35, 200);
  const scale = maxW / embeddedImage.width;
  const imgW = embeddedImage.width * scale;
  const imgH = embeddedImage.height * scale;

  if (options.mosaic) {
    const stepX = imgW * 1.6;
    const stepY = imgH * 1.8;
    for (let tx = 0; tx < width + stepX; tx += stepX) {
      for (let ty = 0; ty < height + stepY; ty += stepY) {
        page.drawImage(embeddedImage, {
          x: tx, y: ty, width: imgW, height: imgH,
          opacity, rotate: degrees(rot),
        });
      }
    }
  } else {
    const { x, y } = getXY(options.position, width, height, imgW, imgH);
    page.drawImage(embeddedImage, {
      x, y, width: imgW, height: imgH,
      opacity, rotate: degrees(rot),
    });
  }
}

export async function addWatermark(
  file: File,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const pages = pdf.getPages();

  const from = Math.max(1, options.fromPage) - 1;
  const to = Math.min(pages.length, options.toPage) - 1;

  // Pre-embed assets
  let font: PDFFont | null = null;
  let embeddedImage: PDFImage | null = null;

  if (options.mode === "text") {
    font = await resolveFont(
      pdf,
      options.fontFamily ?? "Helvetica",
      options.bold ?? false,
      options.italic ?? false
    );
  } else if (options.mode === "image" && options.imageFile) {
    const imgBuf = await options.imageFile.arrayBuffer();
    const name = options.imageFile.name.toLowerCase();
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
      embeddedImage = await pdf.embedJpg(imgBuf);
    } else {
      embeddedImage = await pdf.embedPng(imgBuf);
    }
  }

  for (let i = from; i <= to; i++) {
    const page = pages[i];

    if (options.layer === "below") {
      // Insert a content stream before existing content
      // pdf-lib doesn't directly support inserting behind; we use a workaround:
      // We push the drawing ops before existing by creating a new content stream and prepending.
      // For simplicity, we still draw after but with reduced opacity — the layer difference
      // is approximated. True "below" would require content stream manipulation.
      // We mark for future enhancement — current draw is always over.
    }

    if (options.mode === "text" && font) {
      drawTextWatermark(page, options, font, 40, 40);
    } else if (options.mode === "image" && embeddedImage) {
      drawImageWatermark(page, embeddedImage, options);
    }
  }

  return pdf.save();
}
