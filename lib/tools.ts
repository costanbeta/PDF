export interface Tool {
  id: string;
  name: string;
  description: string;
  href: string;
  category: ToolCategory;
  color: string;
  bgColor: string;
  icon: string;
  implemented: boolean;
}

export type ToolCategory =
  | "organize"
  | "optimize"
  | "convert-to"
  | "convert-from"
  | "edit"
  | "security"
  | "intelligence";

export interface ToolGroup {
  id: ToolCategory;
  label: string;
  tools: Tool[];
}

export const toolGroups: ToolGroup[] = [
  {
    id: "organize",
    label: "ORGANIZE PDF",
    tools: [
      {
        id: "merge-pdf",
        name: "Merge PDF",
        description: "Combine multiple PDFs into one document",
        href: "/tools/merge-pdf",
        category: "organize",
        color: "#E8372C",
        bgColor: "#fef2f2",
        icon: "merge",
        implemented: true,
      },
      {
        id: "split-pdf",
        name: "Split PDF",
        description: "Split PDF into multiple files by page range",
        href: "/tools/split-pdf",
        category: "organize",
        color: "#E8372C",
        bgColor: "#fef2f2",
        icon: "split",
        implemented: true,
      },
      {
        id: "remove-pages",
        name: "Remove Pages",
        description: "Delete specific pages from your PDF",
        href: "/tools/organize-pdf",
        category: "organize",
        color: "#E8372C",
        bgColor: "#fef2f2",
        icon: "file-minus",
        implemented: true,
      },
      {
        id: "organize-pdf",
        name: "Organize PDF",
        description: "Reorder or delete pages with drag-and-drop",
        href: "/tools/organize-pdf",
        category: "organize",
        color: "#E8372C",
        bgColor: "#fef2f2",
        icon: "layout-grid",
        implemented: true,
      },
    ],
  },
  {
    id: "optimize",
    label: "OPTIMIZE PDF",
    tools: [
      {
        id: "compress-pdf",
        name: "Compress PDF",
        description: "Reduce file size while keeping quality",
        href: "/tools/compress-pdf",
        category: "optimize",
        color: "#16A34A",
        bgColor: "#f0fdf4",
        icon: "compress",
        implemented: true,
      },
      {
        id: "repair-pdf",
        name: "Repair PDF",
        description: "Fix corrupted or damaged PDF files",
        href: "/tools/repair-pdf",
        category: "optimize",
        color: "#16A34A",
        bgColor: "#f0fdf4",
        icon: "wrench",
        implemented: true,
      },
      {
        id: "ocr-pdf",
        name: "OCR PDF",
        description: "Make scanned PDFs searchable and selectable",
        href: "/tools/ocr-pdf",
        category: "optimize",
        color: "#16A34A",
        bgColor: "#f0fdf4",
        icon: "scan-text",
        implemented: true,
      },
    ],
  },
  {
    id: "convert-to",
    label: "CONVERT TO PDF",
    tools: [
      {
        id: "jpg-to-pdf",
        name: "JPG to PDF",
        description: "Convert images to a PDF document",
        href: "/tools/jpg-to-pdf",
        category: "convert-to",
        color: "#D97706",
        bgColor: "#fffbeb",
        icon: "file-image",
        implemented: true,
      },
      {
        id: "word-to-pdf",
        name: "WORD to PDF",
        description: "Convert Word documents to PDF",
        href: "/tools/word-to-pdf",
        category: "convert-to",
        color: "#2563EB",
        bgColor: "#eff6ff",
        icon: "file-type-2",
        implemented: true,
      },
      {
        id: "powerpoint-to-pdf",
        name: "POWERPOINT to PDF",
        description: "Convert PowerPoint presentations to PDF",
        href: "/tools/powerpoint-to-pdf",
        category: "convert-to",
        color: "#DC2626",
        bgColor: "#fef2f2",
        icon: "presentation",
        implemented: true,
      },
      {
        id: "excel-to-pdf",
        name: "EXCEL to PDF",
        description: "Convert Excel spreadsheets to PDF",
        href: "/tools/excel-to-pdf",
        category: "convert-to",
        color: "#16A34A",
        bgColor: "#f0fdf4",
        icon: "table-2",
        implemented: true,
      },
      {
        id: "html-to-pdf",
        name: "HTML to PDF",
        description: "Convert web pages to PDF documents",
        href: "/tools/html-to-pdf",
        category: "convert-to",
        color: "#EA580C",
        bgColor: "#fff7ed",
        icon: "globe",
        implemented: true,
      },
    ],
  },
  {
    id: "convert-from",
    label: "CONVERT FROM PDF",
    tools: [
      {
        id: "pdf-to-jpg",
        name: "PDF to JPG",
        description: "Convert PDF pages to JPEG images",
        href: "/tools/pdf-to-jpg",
        category: "convert-from",
        color: "#D97706",
        bgColor: "#fffbeb",
        icon: "image",
        implemented: true,
      },
      {
        id: "pdf-to-word",
        name: "PDF to WORD",
        description: "Extract text from PDF into .docx format",
        href: "/tools/pdf-to-word",
        category: "convert-from",
        color: "#2563EB",
        bgColor: "#eff6ff",
        icon: "file-text",
        implemented: true,
      },
      {
        id: "pdf-to-powerpoint",
        name: "PDF to POWERPOINT",
        description: "Convert PDF slides to PowerPoint",
        href: "/tools/pdf-to-powerpoint",
        category: "convert-from",
        color: "#DC2626",
        bgColor: "#fef2f2",
        icon: "monitor-play",
        implemented: true,
      },
      {
        id: "pdf-to-excel",
        name: "PDF to EXCEL",
        description: "Extract tables from PDF into Excel",
        href: "/tools/pdf-to-excel",
        category: "convert-from",
        color: "#16A34A",
        bgColor: "#f0fdf4",
        icon: "table",
        implemented: true,
      },
    ],
  },
  {
    id: "edit",
    label: "EDIT PDF",
    tools: [
      {
        id: "rotate-pdf",
        name: "Rotate PDF",
        description: "Rotate individual or all pages",
        href: "/tools/rotate-pdf",
        category: "edit",
        color: "#7C3AED",
        bgColor: "#f5f3ff",
        icon: "rotate-cw",
        implemented: true,
      },
      {
        id: "page-numbers",
        name: "Add Page Numbers",
        description: "Add page numbers in any position",
        href: "/tools/page-numbers",
        category: "edit",
        color: "#7C3AED",
        bgColor: "#f5f3ff",
        icon: "hash",
        implemented: true,
      },
      {
        id: "watermark",
        name: "Add Watermark",
        description: "Stamp text watermark on every page",
        href: "/tools/watermark",
        category: "edit",
        color: "#7C3AED",
        bgColor: "#f5f3ff",
        icon: "stamp",
        implemented: true,
      },
      {
        id: "crop-pdf",
        name: "Crop PDF",
        description: "Crop and resize PDF pages",
        href: "/tools/crop-pdf",
        category: "edit",
        color: "#7C3AED",
        bgColor: "#f5f3ff",
        icon: "crop",
        implemented: true,
      },
    ],
  },
  {
    id: "security",
    label: "PDF SECURITY",
    tools: [
      {
        id: "unlock-pdf",
        name: "Unlock PDF",
        description: "Remove password protection from PDF",
        href: "/tools/unlock-pdf",
        category: "security",
        color: "#0891B2",
        bgColor: "#ecfeff",
        icon: "unlock",
        implemented: true,
      },
      {
        id: "protect-pdf",
        name: "Protect PDF",
        description: "Password protect your PDF document",
        href: "/tools/protect-pdf",
        category: "security",
        color: "#0891B2",
        bgColor: "#ecfeff",
        icon: "lock",
        implemented: true,
      },
      {
        id: "sign-pdf",
        name: "Sign PDF",
        description: "Add your digital signature to PDFs",
        href: "/tools/sign-pdf",
        category: "security",
        color: "#0891B2",
        bgColor: "#ecfeff",
        icon: "pen-tool",
        implemented: true,
      },
      {
        id: "redact-pdf",
        name: "Redact PDF",
        description: "Permanently remove sensitive content",
        href: "/tools/redact-pdf",
        category: "security",
        color: "#0891B2",
        bgColor: "#ecfeff",
        icon: "eraser",
        implemented: true,
      },
    ],
  },
  {
    id: "intelligence",
    label: "PDF INTELLIGENCE",
    tools: [
      {
        id: "ai-summarizer",
        name: "AI Summarizer",
        description: "Summarize PDF content with AI",
        href: "/tools/ai-summarizer",
        category: "intelligence",
        color: "#9333EA",
        bgColor: "#faf5ff",
        icon: "sparkles",
        implemented: true,
      },
      {
        id: "translate-pdf",
        name: "Translate PDF",
        description: "Translate your PDF to another language",
        href: "/tools/translate-pdf",
        category: "intelligence",
        color: "#9333EA",
        bgColor: "#faf5ff",
        icon: "languages",
        implemented: true,
      },
      {
        id: "qr-code",
        name: "QR Code Generator",
        description: "Generate QR codes in PNG or SVG and embed into PDF",
        href: "/tools/qr-code",
        category: "intelligence",
        color: "#9333EA",
        bgColor: "#faf5ff",
        icon: "qr-code",
        implemented: true,
      },
    ],
  },
];

export const allTools: Tool[] = toolGroups.flatMap((g) => g.tools);

// Legacy flat list for ToolGrid tabs
export const tools = allTools;

export const categories = [
  { id: "all", label: "All Tools" },
  { id: "organize", label: "Organize" },
  { id: "optimize", label: "Optimize" },
  { id: "convert-to", label: "Convert To" },
  { id: "convert-from", label: "Convert From" },
  { id: "edit", label: "Edit" },
  { id: "security", label: "Security" },
  { id: "intelligence", label: "Intelligence" },
] as const;
