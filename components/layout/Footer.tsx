import Link from "next/link";
import { FileText, Shield, Zap, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--muted)] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#E8372C] rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-heading font-bold text-xl text-[var(--foreground)]">
                PDF<span className="text-[#E8372C]">Craft</span>
              </span>
            </Link>
            <p className="text-sm text-[var(--muted-foreground)] max-w-xs mb-4">
              The all-in-one browser-based PDF toolkit. All processing happens
              locally — your files never leave your device.
            </p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                100% Secure
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Zap className="w-3.5 h-3.5 text-yellow-500" />
                Fast & Free
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                <Lock className="w-3.5 h-3.5 text-blue-500" />
                Private
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--foreground)] mb-3 text-sm">Convert</h4>
            <ul className="space-y-2">
              {[
                { label: "PDF to JPG", href: "/tools/pdf-to-jpg" },
                { label: "JPG to PDF", href: "/tools/jpg-to-pdf" },
                { label: "PDF to Word", href: "/tools/pdf-to-word" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[var(--foreground)] mb-3 text-sm">Edit & Organize</h4>
            <ul className="space-y-2">
              {[
                { label: "Merge PDF", href: "/tools/merge-pdf" },
                { label: "Split PDF", href: "/tools/split-pdf" },
                { label: "Compress PDF", href: "/tools/compress-pdf" },
                { label: "Rotate PDF", href: "/tools/rotate-pdf" },
                { label: "Watermark", href: "/tools/watermark" },
                { label: "Protect PDF", href: "/tools/protect-pdf" },
                { label: "Unlock PDF", href: "/tools/unlock-pdf" },
                { label: "Page Numbers", href: "/tools/page-numbers" },
                { label: "Organize PDF", href: "/tools/organize-pdf" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-[var(--border)] mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} PDFCraft. Free PDF tools, forever.
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Built with ❤️ — No ads, no tracking, no file uploads
          </p>
        </div>
      </div>
    </footer>
  );
}
