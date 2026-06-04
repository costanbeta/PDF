import Link from "next/link";
import { Construction, ChevronLeft } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          All Tools
        </Link>

        <div className="flex flex-col items-center text-center py-20 gap-6">
          <div className="w-20 h-20 rounded-2xl bg-[var(--muted)] flex items-center justify-center">
            <Construction className="w-10 h-10 text-[var(--muted-foreground)]" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[var(--foreground)] mb-3">
              {title}
            </h1>
            <p className="text-[var(--muted-foreground)] max-w-md">{description}</p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm font-medium">
            🚧 Coming Soon — check back soon!
          </div>
          <Link
            href="/"
            className="mt-4 px-6 py-3 bg-[#E8372C] hover:bg-[#c42d22] text-white font-semibold rounded-xl transition-all"
          >
            Browse Available Tools
          </Link>
        </div>
      </div>
    </div>
  );
}
