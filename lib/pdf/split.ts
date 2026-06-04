import { PDFDocument } from "pdf-lib";

export interface SplitRange {
  start: number;
  end: number;
  label: string;
}

export async function splitPDFByRanges(
  file: File,
  ranges: SplitRange[]
): Promise<{ name: string; data: Uint8Array }[]> {
  const buffer = await file.arrayBuffer();
  const source = await PDFDocument.load(buffer);
  const results: { name: string; data: Uint8Array }[] = [];

  for (const range of ranges) {
    const doc = await PDFDocument.create();
    const indices: number[] = [];
    for (let i = range.start - 1; i < range.end; i++) {
      if (i >= 0 && i < source.getPageCount()) indices.push(i);
    }
    const pages = await doc.copyPages(source, indices);
    pages.forEach((p) => doc.addPage(p));
    const data = await doc.save();
    results.push({ name: `${range.label}.pdf`, data });
  }

  return results;
}

export async function splitPDFAllPages(
  file: File
): Promise<{ name: string; data: Uint8Array }[]> {
  const buffer = await file.arrayBuffer();
  const source = await PDFDocument.load(buffer);
  const results: { name: string; data: Uint8Array }[] = [];
  const baseName = file.name.replace(/\.pdf$/i, "");

  for (let i = 0; i < source.getPageCount(); i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(source, [i]);
    doc.addPage(page);
    results.push({ name: `${baseName}_page_${i + 1}.pdf`, data: await doc.save() });
  }

  return results;
}

export function parseRanges(input: string, totalPages: number): SplitRange[] {
  const ranges: SplitRange[] = [];
  const parts = input.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = Math.max(1, parseInt(startStr.trim(), 10));
      const end = Math.min(totalPages, parseInt(endStr.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        ranges.push({ start, end, label: `pages_${start}-${end}` });
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        ranges.push({ start: page, end: page, label: `page_${page}` });
      }
    }
  }

  return ranges;
}
