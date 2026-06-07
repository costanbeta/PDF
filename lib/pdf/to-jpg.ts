"use client";

export async function pdfPageToJpeg(
  pdfData: ArrayBuffer | Uint8Array,
  pageIndex: number,
  dpi: number
): Promise<Blob> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  // Always pass a copy — pdfjs transfers (detaches) the ArrayBuffer on load
  const data = pdfData instanceof Uint8Array ? pdfData.slice() : new Uint8Array(pdfData);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(pageIndex + 1);
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;

  await page.render({ canvasContext: ctx, viewport }).promise;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.92);
  });
}

export async function renderPageThumbnail(
  pdfData: ArrayBuffer | Uint8Array,
  pageIndex: number,
  maxWidth = 150
): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = pdfData instanceof Uint8Array ? pdfData.slice() : new Uint8Array(pdfData);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = maxWidth / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;
  const ctx = canvas.getContext("2d")!;

  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

  return canvas.toDataURL("image/jpeg", 0.7);
}

export async function getPDFPageCount(pdfData: ArrayBuffer | Uint8Array): Promise<number> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = pdfData instanceof Uint8Array ? pdfData.slice() : new Uint8Array(pdfData);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  return pdf.numPages;
}
