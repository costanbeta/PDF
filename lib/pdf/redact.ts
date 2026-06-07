/**
 * PDF Redaction Library
 *
 * Uses pdfjs-dist to extract text positions, then pdf-lib to draw black
 * rectangles over matched content for permanent redaction.
 */

export interface TextMatch {
  pageIndex: number;
  /** pdf-lib coordinate space (origin at bottom-left) */
  x: number;
  y: number;
  width: number;
  height: number;
}

const PATTERNS: Record<string, RegExp> = {
  "Credit Card": /\b(?:\d[ -]?){13,16}\b/g,
  "Phone Number":
    /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?)?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  Email: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
};

/**
 * Find all text matches in a PDF (by search string or pattern name).
 * Returns bounding boxes in pdf-lib coordinate space per page.
 */
export async function findTextMatches(
  pdfData: ArrayBuffer | Uint8Array,
  query: string,
  mode: "text" | "pattern"
): Promise<TextMatch[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data =
    pdfData instanceof Uint8Array ? pdfData.slice() : new Uint8Array(pdfData);
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const matches: TextMatch[] = [];
  const regex =
    mode === "pattern"
      ? PATTERNS[query]
      : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");

  if (!regex) return matches;

  for (let pageIdx = 0; pageIdx < pdf.numPages; pageIdx++) {
    const page = await pdf.getPage(pageIdx + 1);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    // Build a full text string with character position offsets
    // so we can map regex matches back to individual items
    const items = textContent.items as Array<{
      str: string;
      transform: number[];
      width: number;
      height: number;
    }>;

    // Concatenate all items into one string, tracking start indices
    let fullText = "";
    const offsets: { start: number; end: number; item: typeof items[0] }[] = [];
    for (const item of items) {
      const start = fullText.length;
      fullText += item.str + " ";
      offsets.push({ start, end: start + item.str.length, item });
    }

    // Reset regex lastIndex
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(fullText)) !== null) {
      const matchStart = m.index;
      const matchEnd = m.index + m[0].length;

      // Find all items that overlap with this match
      const overlapping = offsets.filter(
        (o) => o.start < matchEnd && o.end > matchStart
      );

      for (const o of overlapping) {
        const { item } = o;
        // item.transform = [scaleX, skewX, skewY, scaleY, tx, ty]
        // tx, ty are in pdf-lib coordinate space (bottom-left origin)
        const tx = item.transform[4];
        const ty = item.transform[5];
        const scaleX = item.transform[0];
        const scaleY = item.transform[3];

        // Compute proportional width if only part of the item is matched
        const charCount = item.str.length || 1;
        const overlapStart = Math.max(matchStart, o.start) - o.start;
        const overlapEnd = Math.min(matchEnd, o.end) - o.start;
        const fraction = (overlapEnd - overlapStart) / charCount;
        const offsetFraction = overlapStart / charCount;

        const itemWidth = item.width || Math.abs(scaleX) * charCount;
        const itemHeight = item.height || Math.abs(scaleY);

        // Convert from pdfjs viewport space to pdf-lib space
        // pdfjs viewport has y increasing downward, pdf-lib has y increasing upward
        const pdfLibX = tx + itemWidth * offsetFraction;
        const pdfLibY = ty - itemHeight * 0.2; // slight padding

        matches.push({
          pageIndex: pageIdx,
          x: pdfLibX,
          y: pdfLibY,
          width: Math.max(itemWidth * fraction, 4),
          height: itemHeight * 1.4,
        });
      }
    }
  }

  return matches;
}

/**
 * Apply redaction rectangles to the PDF.
 * Draws permanent black rectangles over all specified regions.
 */
export async function applyRedactions(
  pdfData: ArrayBuffer | Uint8Array,
  matches: TextMatch[]
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");

  const buffer: ArrayBuffer =
    pdfData instanceof Uint8Array
      ? pdfData.buffer.slice(pdfData.byteOffset, pdfData.byteOffset + pdfData.byteLength) as ArrayBuffer
      : pdfData as ArrayBuffer;
  const pdf = await PDFDocument.load(buffer);
  const pages = pdf.getPages();

  for (const match of matches) {
    const page = pages[match.pageIndex];
    if (!page) continue;
    page.drawRectangle({
      x: match.x,
      y: match.y,
      width: match.width,
      height: match.height,
      color: rgb(0, 0, 0),
      opacity: 1,
    });
  }

  return pdf.save();
}

/**
 * Apply region-based redactions (full-width black bars).
 */
export interface RegionRedaction {
  topPercent: number;
  heightPercent: number;
  pages: "all" | "first" | "last";
}

export async function applyRegionRedactions(
  pdfData: ArrayBuffer | Uint8Array,
  regions: RegionRedaction[]
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");

  const buffer: ArrayBuffer =
    pdfData instanceof Uint8Array
      ? pdfData.buffer.slice(pdfData.byteOffset, pdfData.byteOffset + pdfData.byteLength) as ArrayBuffer
      : pdfData as ArrayBuffer;
  const pdf = await PDFDocument.load(buffer);
  const pages = pdf.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    for (const region of regions) {
      const apply =
        region.pages === "all" ||
        (region.pages === "first" && i === 0) ||
        (region.pages === "last" && i === pages.length - 1);

      if (!apply) continue;

      const y =
        height -
        (region.topPercent / 100) * height -
        (region.heightPercent / 100) * height;
      const rh = (region.heightPercent / 100) * height;

      page.drawRectangle({
        x: 0,
        y,
        width,
        height: rh,
        color: rgb(0, 0, 0),
        opacity: 1,
      });
    }
  }

  return pdf.save();
}

export { PATTERNS };
