export interface ToolSEOData {
  title: string;
  description: string;
  keywords: string[];
  steps: string[];
  features: { title: string; desc: string }[];
  faqs: { question: string; answer: string }[];
}

export const BASE_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pdfcraft.qzz.io";

// Special overrides for key tools to target high-traffic search terms
const seoOverrides: Record<string, Partial<ToolSEOData>> = {
  "compress-pdf": {
    title: "Compress PDF Online - Reduce PDF File Size for Free",
    description: "Compress PDF files in seconds. Reduce PDF file size while maintaining maximum quality. 100% secure browser-based compression — files never leave your device.",
    keywords: ["compress pdf", "reduce pdf size", "shrink pdf size", "compress pdf online", "free pdf compressor"],
    steps: [
      "Upload your PDF file by dragging and dropping it or clicking the upload area.",
      "Select your preferred compression level: Low (best quality), Medium (recommended), or High (maximum compression).",
      "Click the 'Compress PDF' button to start the on-device processing.",
      "Compare original and compressed sizes, then download your optimized PDF instantly."
    ],
    faqs: [
      {
        question: "How does local PDF compression work?",
        answer: "PDFCraft compresses files directly in your web browser using WebAssembly. Unlike other services, your document is never uploaded to external servers, protecting your privacy completely."
      },
      {
        question: "Does compressing a PDF reduce its visual quality?",
        answer: "It depends on the compression level. Medium compression reduces image resolution slightly while keeping text crystal clear. Low compression maintains maximum quality, while High compression optimizes for the absolute smallest file size."
      },
      {
        question: "Is there a file size limit for PDF compression?",
        answer: "Since compression runs locally on your computer or phone, there are no artificial server-side limits. It can handle large files easily, subject only to your device's available memory."
      }
    ]
  },
  "merge-pdf": {
    title: "Merge PDF Online - Combine PDF Files for Free",
    description: "Combine multiple PDF documents into a single PDF file online. Easy, fast, and 100% secure. Reorder pages and files with drag-and-drop before merging.",
    keywords: ["merge pdf", "combine pdfs", "join pdf files", "merge pdf online free", "concatenate pdf"],
    steps: [
      "Select and upload two or more PDF files from your device.",
      "Drag and drop the file cards to reorder them in the exact sequence you want.",
      "Click the 'Merge PDF' button to compile the files locally.",
      "Download your merged PDF file immediately."
    ],
    faqs: [
      {
        question: "Can I reorder PDF files before merging them?",
        answer: "Yes, PDFCraft includes an interactive drag-and-drop file organizer. You can easily drag files to rearrange their sequence before clicking the merge button."
      },
      {
        question: "Is there a limit to how many PDF files I can merge?",
        answer: "No. You can merge as many PDF files as you need. Since the merge occurs inside your browser, there are no upload wait times or file count restrictions."
      },
      {
        question: "Are my files secure when using the PDF merger?",
        answer: "Absolutely. We do not upload your documents to any server. The merging process is done completely offline in your browser, keeping your data confidential."
      }
    ]
  },
  "split-pdf": {
    title: "Split PDF - Extract Pages from PDF Online for Free",
    description: "Split PDF files into individual pages or extract specific page ranges easily. Free, secure, and fast client-side PDF splitter tool.",
    keywords: ["split pdf", "extract pages from pdf", "separate pdf pages", "pdf page splitter", "split pdf online"],
    steps: [
      "Choose and upload the PDF file you wish to split.",
      "Select your split mode: extract all pages as individual files, or specify a custom page range (e.g., pages 3-7).",
      "Click the 'Split PDF' button to process your request locally.",
      "Download your split PDF pages or a ZIP archive containing all extracted files."
    ],
    faqs: [
      {
        question: "How do I split specific ranges from a PDF?",
        answer: "Simply enter the desired page range (e.g., '1-5' or '10-15') in the settings input. The tool will extract only those pages into a new document."
      },
      {
        question: "Can I extract every page of a PDF as a separate file?",
        answer: "Yes, you can choose the 'Extract All' option, which will generate a separate PDF for every single page in your original file and package them in a ZIP download."
      },
      {
        question: "Does splitting a PDF damage the original file?",
        answer: "No, your original PDF remains completely untouched. The tool creates new PDF files containing only the pages you selected."
      }
    ]
  },
  "pdf-to-word": {
    title: "PDF to Word Converter - Convert PDF to DOCX Free",
    description: "Convert PDF files to editable Word documents (DOCX) online. Clean conversion preserving text formatting. 100% private and safe.",
    keywords: ["pdf to word", "pdf to docx", "convert pdf to word online", "pdf to word converter free", "convert pdf to editable docx"],
    steps: [
      "Select the PDF file you want to convert to Microsoft Word format.",
      "Click the 'Convert to Word' button to run the extraction engine.",
      "Wait a few seconds for the text content and structure to be parsed.",
      "Download your editable Word (.docx) document."
    ],
    faqs: [
      {
        question: "Will the formatting of my PDF remain intact in Word?",
        answer: "PDFCraft attempts to match layout structures, paragraphs, and styles. While highly complex layouts might require minor adjustments, text and tables are cleanly exported."
      },
      {
        question: "Can I convert scanned PDFs to Word?",
        answer: "Yes! For scanned PDFs (which are just images), please use our OCR PDF tool first to make the text searchable and editable, then convert it to Word."
      }
    ]
  },
  "word-to-pdf": {
    title: "Word to PDF Converter - Convert DOCX to PDF Online",
    description: "Convert Word documents (DOCX) to professional PDF files online for free. Keep fonts, alignments, and images perfectly formatted.",
    keywords: ["word to pdf", "convert docx to pdf", "word to pdf converter online", "docx to pdf free", "convert word to pdf free"],
    steps: [
      "Upload your DOCX file from your computer or mobile device.",
      "Click the 'Convert to PDF' button to compile the document.",
      "Our client-side engine parses the Word structure and translates it into PDF vectors.",
      "Download your polished PDF file instantly."
    ],
    faqs: [
      {
        question: "Do I need Microsoft Word installed to use this converter?",
        answer: "No. The conversion is done entirely within the PDFCraft browser application, so you do not need Office or Word installed on your device."
      },
      {
        question: "Is my document privacy protected?",
        answer: "Yes. PDFCraft compiles DOCX to PDF locally. Your documents are never transmitted over the internet, preventing any data leaks."
      }
    ]
  },
  "pdf-to-jpg": {
    title: "PDF to JPG Converter - Extract Images from PDF Online",
    description: "Convert PDF pages to high-quality JPG images online. Extract all photos embedded in PDFs or render full pages as JPEG images. Free and secure.",
    keywords: ["pdf to jpg", "pdf to jpeg", "extract images from pdf", "convert pdf pages to image", "pdf to jpg free"],
    steps: [
      "Upload the PDF file you want to convert into images.",
      "Choose to convert entire pages to JPG, or extract only the images embedded inside the file.",
      "Click 'Convert PDF to JPG' to process the pages locally in high resolution.",
      "Download your images as a ZIP archive or individually."
    ],
    faqs: [
      {
        question: "Can I choose the image quality or resolution?",
        answer: "Yes, our converter exports pages in high-resolution (typically 150-300 DPI) to ensure text and details in the image remain sharp and legible."
      },
      {
        question: "Are my files uploaded online?",
        answer: "Never. The PDF rendering happens on your local device. This makes it incredibly fast and completely secure."
      }
    ]
  },
  "jpg-to-pdf": {
    title: "JPG to PDF Converter - Convert Images to PDF Free",
    description: "Convert JPG, PNG, and other images into a single PDF document. Easily adjust margins, orientation, and layout sizes. Fast, free, and secure.",
    keywords: ["jpg to pdf", "png to pdf", "image to pdf converter", "convert images to pdf online", "free jpg to pdf"],
    steps: [
      "Select or drag & drop one or multiple images (JPG, JPEG, PNG, WebP) into the uploader.",
      "Arrange the sequence of images and set options like page margins or page size (A4, Letter, Fit to Image).",
      "Click 'Convert to PDF' to compile the images on-device.",
      "Download your compiled PDF document."
    ],
    faqs: [
      {
        question: "Can I combine multiple different images into a single PDF?",
        answer: "Yes! You can upload multiple images at once, reorder them as pages, and merge them into a single PDF file."
      },
      {
        question: "Does this tool support formats other than JPG?",
        answer: "Yes, PDFCraft supports JPG, JPEG, PNG, WebP, and SVG images for conversion to PDF."
      }
    ]
  },
  "protect-pdf": {
    title: "Protect PDF - Add Password to PDF Online for Free",
    description: "Encrypt and secure your PDF files with strong passwords. Protect sensitive information and prevent unauthorized access. 100% private.",
    keywords: ["protect pdf", "password protect pdf", "add password to pdf", "encrypt pdf online", "secure pdf free"],
    steps: [
      "Upload the PDF document you want to password protect.",
      "Enter a strong password of your choice in the security settings.",
      "Click the 'Protect PDF' button to encrypt the file client-side.",
      "Download your secure, password-protected PDF."
    ],
    faqs: [
      {
        question: "What encryption standard is used?",
        answer: "Our tool utilizes secure PDF encryption algorithms (RC4/AES) to apply owner and user passwords, which are compatible with all standard PDF readers like Adobe Acrobat."
      },
      {
        question: "Can PDFCraft see my password or files?",
        answer: "No. Since all encryption operations happen locally inside your web browser, your password and files never leave your device."
      }
    ]
  },
  "unlock-pdf": {
    title: "Unlock PDF - Remove PDF Password Online for Free",
    description: "Remove password protection and restrictions from PDF files. Decrypt secure PDFs instantly. Fast, free, and client-side processing.",
    keywords: ["unlock pdf", "remove password from pdf", "decrypt pdf", "unlock password protected pdf online", "free pdf unlocker"],
    steps: [
      "Select the locked PDF file you want to unlock.",
      "If required, enter the file password to authenticate ownership.",
      "Click the 'Unlock PDF' button to remove the restrictions and decrypt the document.",
      "Download your unlocked, restriction-free PDF file."
    ],
    faqs: [
      {
        question: "Can I unlock a PDF if I don't know the password?",
        answer: "You must know the password if the document is strongly encrypted with an open password. For restriction-only passwords (e.g. printing/copying locks), the tool can often unlock them instantly without a password."
      },
      {
        question: "Is decrypting PDFs safe on this site?",
        answer: "Absolutely. The decryption is performed entirely in your browser memory. Your password and PDF are never sent over the network, ensuring complete confidentiality."
      }
    ]
  }
};

// Generates highly optimized default SEO data if a specific tool override does not exist
export function getToolSEO(id: string, name: string, category: string): ToolSEOData {
  const override = seoOverrides[id] || {};

  const cleanName = name || id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const baseTitle = `${cleanName} - Free Online PDF Tool | PDFCraft`;
  const baseDesc = `${cleanName} online for free. ${cleanName} files securely in your web browser. No registration, no ads, and no uploads required. Your privacy is guaranteed.`;
  const baseKeywords = [
    id.replace(/-/g, " "),
    `${id.replace(/-/g, " ")} online`,
    `free ${id.replace(/-/g, " ")}`,
    "pdf tool",
    "pdfcraft"
  ];

  const defaultSteps = [
    `Drag and drop or upload your file into the ${cleanName} tool.`,
    "Configure any available settings or options to your liking.",
    `Click the '${cleanName}' button to process your document on your device.`,
    "Wait for the processing to finish and download your file instantly."
  ];

  const defaultFeatures = [
    {
      title: "100% Privacy & Security",
      desc: "All processing occurs locally in your browser using WebAssembly. Your files never leave your computer."
    },
    {
      title: "Fast & Free",
      desc: "Instant processing with zero wait times. No subscriptions, limitations, or hidden costs."
    },
    {
      title: "No Installation Needed",
      desc: "Access PDFCraft from any modern browser on Windows, Mac, Linux, iOS, or Android."
    },
    {
      title: "High Fidelity",
      desc: "Our client-side rendering engines maintain high quality, formatting, and layout styles."
    }
  ];

  const defaultFaqs = [
    {
      question: `Is the ${cleanName} tool free to use?`,
      answer: `Yes, PDFCraft's ${cleanName} is 100% free with no daily limits, watermarks, or user account registrations required.`
    },
    {
      question: "Are my files uploaded to any servers?",
      answer: "No. PDFCraft is built on a local-first architecture. All PDF processing happens inside your web browser using client-side JavaScript, ensuring maximum security."
    },
    {
      question: "What browsers are supported?",
      answer: "We support all modern browsers, including Google Chrome, Mozilla Firefox, Apple Safari, Microsoft Edge, and mobile browsers on iOS and Android."
    }
  ];

  return {
    title: override.title || baseTitle,
    description: override.description || baseDesc,
    keywords: override.keywords || baseKeywords,
    steps: override.steps || defaultSteps,
    features: defaultFeatures, // standard across the board
    faqs: override.faqs || defaultFaqs
  };
}
