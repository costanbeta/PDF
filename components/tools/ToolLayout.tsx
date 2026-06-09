import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { getToolSEO } from "@/lib/seo-data";
import { allTools } from "@/lib/tools";
import { ToolCard } from "./ToolCard";

interface ToolLayoutProps {
  title: string;
  description: string;
  backLabel?: string;
  children: React.ReactNode;
  wide?: boolean;
  toolId?: string;
}

export function ToolLayout({
  title,
  description,
  backLabel = "All Tools",
  children,
  wide = false,
  toolId,
}: ToolLayoutProps) {
  // Find current tool and resolve SEO metadata
  const currentTool = toolId ? allTools.find((t) => t.id === toolId) : null;
  const seo = currentTool
    ? getToolSEO(currentTool.id, currentTool.name, currentTool.category)
    : null;

  // Find 3 related tools for internal linking
  const relatedTools = currentTool
    ? allTools
        .filter((t) => t.implemented && t.id !== currentTool.id)
        .sort((a, b) => {
          // Prioritize tools in the same category
          if (a.category === currentTool.category && b.category !== currentTool.category) return -1;
          if (a.category !== currentTool.category && b.category === currentTool.category) return 1;
          return 0;
        })
        .slice(0, 3)
    : [];

  return (
    <div className="min-h-screen py-8 sm:py-12">
      {seo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": `PDFCraft — ${currentTool?.name}`,
                "operatingSystem": "All",
                "applicationCategory": "UtilityApplication",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD",
                },
                "description": seo.description,
              },
              {
                "@context": "https://schema.org",
                "@type": "HowTo",
                "name": `How to use ${currentTool?.name} online for free`,
                "description": seo.description,
                "step": seo.steps.map((step, idx) => ({
                  "@type": "HowToStep",
                  "name": `Step ${idx + 1}`,
                  "text": step,
                })),
              },
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": seo.faqs.map((faq) => ({
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
      )}

      <div className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8",
        wide || (seo && relatedTools.length > 0) ? "max-w-7xl" : "max-w-3xl"
      )}>
        {/* Main Tool Interface Box */}
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-4"
            >
              <ChevronLeft className="w-4 h-4" />
              {backLabel}
            </Link>

            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[var(--foreground)] mb-2">
              {title}
            </h1>
            <p className="text-[var(--muted-foreground)]">{seo?.description || description}</p>
          </div>

          <div className="space-y-6">{children}</div>

          <div className="mt-8 flex items-center gap-2 text-xs text-[var(--muted-foreground)] justify-center">
            <Shield className="w-3.5 h-3.5 text-green-500" />
            Files are processed locally — they never leave your device
          </div>
        </div>

        {/* Dynamic, Keyword-Rich SEO Copy Section */}
        {seo && (
          <div className="mt-20 pt-16 border-t border-[var(--border)] space-y-20">
            {/* How to use */}
            <section className="space-y-8 max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--foreground)] text-center">
                How to {currentTool?.name} online for free
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {seo.steps.map((step, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] relative overflow-hidden group hover:border-[#E8372C]/30 hover:shadow-md transition-all duration-300"
                  >
                    <span className="absolute -right-6 -bottom-6 text-8xl font-extrabold text-[var(--muted)] opacity-15 select-none group-hover:scale-110 transition-transform duration-300">
                      {index + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[#E8372C]/10 text-[#E8372C] flex items-center justify-center font-bold text-sm mb-4">
                      {index + 1}
                    </div>
                    <p className="text-sm text-[var(--foreground)] leading-relaxed relative z-10">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Key features */}
            <section className="space-y-8 max-w-5xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--foreground)] text-center">
                Features of our {currentTool?.name} tool
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {seo.features.map((feat, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-[#E8372C]/20 transition-all duration-200"
                  >
                    <h3 className="font-semibold text-[var(--foreground)] mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {feat.title}
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQs */}
            <section className="space-y-8 max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--foreground)] text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {seo.faqs.map((faq, index) => (
                  <details
                    key={index}
                    className="group p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] [&_summary::-webkit-details-marker]:hidden cursor-pointer transition-all duration-200 hover:border-[#E8372C]/30"
                  >
                    <summary className="flex items-center justify-between font-semibold text-[var(--foreground)] text-sm sm:text-base focus:outline-none select-none">
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
            </section>

            {/* Related tools */}
            {relatedTools.length > 0 && (
              <section className="space-y-8 max-w-5xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[var(--foreground)] text-center">
                  Explore other free PDF tools
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {relatedTools.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


