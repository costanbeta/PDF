import { Hero } from "@/components/layout/Hero";
import { ToolGrid } from "@/components/tools/ToolGrid";
import { Shield, Zap, Lock, EyeOff } from "lucide-react";

export default function Home() {
  const homeFaqs = [
    {
      question: "What makes PDFCraft different from other online PDF tools?",
      answer: "Unlike traditional services that require you to upload files to their servers, PDFCraft runs entirely on your device using WebAssembly. Your documents are processed locally in your browser, resulting in instant rendering, zero network lag, and complete privacy.",
    },
    {
      question: "Is PDFCraft really free and unlimited?",
      answer: "Yes, completely! Because we do not run expensive server-side conversion farms, we don't have to charge subscription fees or enforce daily usage limits. You can process as many files as you want, of any size, free of charge.",
    },
    {
      question: "Are my files safe and secure with PDFCraft?",
      answer: "Your files never leave your computer, laptop, or phone. PDFCraft functions completely on the client side, meaning we have zero access to your data. It is the most secure way to handle confidential documents.",
    },
    {
      question: "Can I use PDFCraft offline without an internet connection?",
      answer: "Yes, you can! Once you have loaded PDFCraft in your browser, the utility engines run locally. You can compress, merge, split, and edit files even if you lose your internet connection entirely.",
    },
  ];

  return (
    <>
      {/* Homepage JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "PDFCraft",
              "url": "https://pdfcraft.qzz.io",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All",
              "description": "Free, fast, and 100% secure client-side PDF utility suite. Merge, split, compress, protect, and convert PDFs directly in your browser.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": homeFaqs.map((faq) => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer,
                },
              })),
            },
          ]),
        }}
      />

      <Hero />
      
      <section id="tools" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-[var(--foreground)] mb-3">
              All PDF Tools
            </h2>
            <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
              Everything you need to work with PDFs — merge, split, compress,
              convert, protect, and more.
            </p>
          </div>
          <ToolGrid />
        </div>
      </section>

      {/* Why PDFCraft Section */}
      <section className="py-16 bg-[var(--muted)] border-t border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-heading font-bold text-3xl text-[var(--foreground)] mb-4">
              A Private, Local-First PDF Suite
            </h2>
            <p className="text-[var(--muted-foreground)]">
              PDFCraft redesigns PDF utilities for security-conscious professionals. 
              By leveraging browser technology, your documents stay exactly where they belong: on your machine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-center">
              <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[var(--foreground)] mb-2">100% Client-Side</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                Files are never uploaded to any remote servers. All code runs locally in your browser.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-center">
              <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[var(--foreground)] mb-2">Instant Speed</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                Skip the upload and download wait times. Large files process in a fraction of a second.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-center">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[var(--foreground)] mb-2">Zero Tracking</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                We collect no analytics, require no login accounts, and place no advertising trackers.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-center">
              <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <EyeOff className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-[var(--foreground)] mb-2">GDPR & HIPAA Friendly</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                Perfect for legal, financial, and healthcare industries where uploading files is strictly prohibited.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* General FAQ Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading font-bold text-3xl text-[var(--foreground)] text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {homeFaqs.map((faq, index) => (
              <details
                key={index}
                className="group p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all duration-200 hover:border-[#E8372C]/30"
              >
                <summary className="flex items-center justify-between font-semibold text-[var(--foreground)] text-base focus:outline-none select-none">
                  <span>{faq.question}</span>
                  <span className="transition-transform duration-300 group-open:rotate-180 text-[var(--muted-foreground)]">
                    ▼
                  </span>
                </summary>
                <p className="mt-4 text-sm text-[var(--muted-foreground)] leading-relaxed border-t border-[var(--border)] pt-4">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
