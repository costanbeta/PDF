import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";

interface ToolLayoutProps {
  title: string;
  description: string;
  backLabel?: string;
  children: React.ReactNode;
}

export function ToolLayout({
  title,
  description,
  backLabel = "All Tools",
  children,
}: ToolLayoutProps) {
  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <p className="text-[var(--muted-foreground)]">{description}</p>
        </div>

        <div className="space-y-6">{children}</div>

        <div className="mt-8 flex items-center gap-2 text-xs text-[var(--muted-foreground)] justify-center">
          <Shield className="w-3.5 h-3.5 text-green-500" />
          Files are processed locally — they never leave your device
        </div>
      </div>
    </div>
  );
}
