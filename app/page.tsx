import { Hero } from "@/components/layout/Hero";
import { ToolGrid } from "@/components/tools/ToolGrid";

export default function Home() {
  return (
    <>
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
    </>
  );
}
