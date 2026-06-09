import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Dancing_Script, Pacifico, Sacramento, Pinyon_Script } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Script from "next/script";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
});

const sacramento = Sacramento({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sacramento",
});

const pinyonScript = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pinyon",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://pdfcraft.vijaychouhan.in"),
  title: {
    default: "PDFCraft — Free Online PDF Tools (100% Secure & Client-Side)",
    template: "%s | PDFCraft",
  },
  description:
    "Merge, split, compress, convert, sign and edit PDFs for free. 100% secure — all processing happens locally inside your browser, so files never leave your device.",
  keywords: [
    "PDF tools",
    "free online pdf tools",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "PDF to JPG",
    "convert pdf",
    "browser based pdf editor",
    "secure pdf converter"
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "PDFCraft — Free Online PDF Tools (100% Secure)",
    description: "Merge, split, compress, convert and edit PDFs for free. All-in-one browser-based PDF utility suite. No uploads required.",
    url: "https://pdfcraft.vijaychouhan.in",
    siteName: "PDFCraft",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFCraft — Free Online PDF Tools",
    description: "Merge, split, compress, convert and edit PDFs for free. 100% secure client-side processing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jakarta.variable} ${dancingScript.variable} ${pacifico.variable} ${sacramento.variable} ${pinyonScript.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9725451064133102"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
