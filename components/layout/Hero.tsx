import Link from "next/link";
import { Shield, Zap, Globe } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-blue-50 dark:from-red-950/20 dark:via-[#0f0f1a] dark:to-blue-950/20" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#E8372C]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E8372C]/10 text-[#E8372C] text-xs font-semibold mb-6">
          <Shield className="w-3.5 h-3.5" />
          100% FREE · NO SIGN-UP · FILES NEVER UPLOADED
        </div>

        <h1 className="font-heading font-bold text-4xl sm:text-5xl lg:text-6xl text-gray-900 dark:text-white leading-tight mb-6">
          Every PDF Tool
          <br />
          <span className="text-[#E8372C]">You&apos;ll Ever Need</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6 leading-relaxed">
          Merge, split, compress, convert, rotate, watermark, protect and more —
          all directly in your browser. No installs, no sign-up, zero uploads.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {["20+ Tools", "100% Free", "No Sign-up", "Client-Side Only", "Dark Mode"].map((tag) => (
            <span key={tag} className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="#tools"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#E8372C] hover:bg-[#c42d22] text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <Zap className="w-4 h-4" />
            Start Using Tools
          </Link>
          <Link
            href="/tools/merge-pdf"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-semibold rounded-xl hover:bg-[var(--muted)] transition-all"
          >
            Merge PDFs →
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: "Privacy First",
              desc: "All processing happens locally in your browser. Files never reach our servers.",
              color: "text-green-500",
              bg: "bg-green-500/10",
            },
            {
              icon: Zap,
              title: "Blazing Fast",
              desc: "Powered by WebAssembly and modern web APIs for instant PDF processing.",
              color: "text-yellow-500",
              bg: "bg-yellow-500/10",
            },
            {
              icon: Globe,
              title: "Works Everywhere",
              desc: "No installation required. Works on any modern browser, any device.",
              color: "text-blue-500",
              bg: "bg-blue-500/10",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center gap-3 p-6 rounded-2xl bg-[var(--card)] border border-[var(--border)]"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-[var(--foreground)]">{feature.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
