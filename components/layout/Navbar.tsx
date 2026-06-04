"use client";

import Link from "next/link";
import {
  FileText, Moon, Sun, Menu, X, ChevronDown,
  Merge, Scissors, FileMinus, LayoutGrid,
  Minimize2, Wrench, ScanText,
  FileImage, FileType2, Presentation, Table2, Globe,
  Image, FileText as FileTextIcon, MonitorPlay, Table,
  RotateCw, Hash, Stamp, Crop,
  Unlock, Lock, PenTool, Eraser,
  Sparkles, Languages, QrCode,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { toolGroups, type Tool } from "@/lib/tools";

const iconMap: Record<string, React.ReactNode> = {
  merge: <Merge className="w-4 h-4" />,
  split: <Scissors className="w-4 h-4" />,
  "file-minus": <FileMinus className="w-4 h-4" />,
  "layout-grid": <LayoutGrid className="w-4 h-4" />,
  compress: <Minimize2 className="w-4 h-4" />,
  wrench: <Wrench className="w-4 h-4" />,
  "scan-text": <ScanText className="w-4 h-4" />,
  "file-image": <FileImage className="w-4 h-4" />,
  "file-type-2": <FileType2 className="w-4 h-4" />,
  presentation: <Presentation className="w-4 h-4" />,
  "table-2": <Table2 className="w-4 h-4" />,
  globe: <Globe className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  "file-text": <FileTextIcon className="w-4 h-4" />,
  "monitor-play": <MonitorPlay className="w-4 h-4" />,
  table: <Table className="w-4 h-4" />,
  "rotate-cw": <RotateCw className="w-4 h-4" />,
  hash: <Hash className="w-4 h-4" />,
  stamp: <Stamp className="w-4 h-4" />,
  crop: <Crop className="w-4 h-4" />,
  unlock: <Unlock className="w-4 h-4" />,
  lock: <Lock className="w-4 h-4" />,
  "pen-tool": <PenTool className="w-4 h-4" />,
  eraser: <Eraser className="w-4 h-4" />,
  sparkles: <Sparkles className="w-4 h-4" />,
  languages: <Languages className="w-4 h-4" />,
  "qr-code": <QrCode className="w-4 h-4" />,
};

function ToolMenuItem({ tool }: { tool: Tool }) {
  return (
    <Link
      href={tool.href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ backgroundColor: tool.bgColor, color: tool.color }}
      >
        {iconMap[tool.icon]}
      </div>
      <div className="min-w-0">
        <p className={cn(
          "text-sm font-semibold leading-tight",
          tool.implemented ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
        )}>
          {tool.name}
          {!tool.implemented && (
            <span className="ml-1.5 text-[10px] font-medium px-1 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
              SOON
            </span>
          )}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] truncate">{tool.description}</p>
      </div>
    </Link>
  );
}

// Convert dropdown: 2 columns (Convert TO / Convert FROM)
function ConvertDropdown({ onClose }: { onClose: () => void }) {
  const toGroup = toolGroups.find((g) => g.id === "convert-to")!;
  const fromGroup = toolGroups.find((g) => g.id === "convert-from")!;

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[580px] bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl p-5 z-50">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-bold text-[var(--muted-foreground)] tracking-widest mb-3 px-1">
            {toGroup.label}
          </p>
          <div className="space-y-0.5" onClick={onClose}>
            {toGroup.tools.map((t) => <ToolMenuItem key={t.id} tool={t} />)}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-[var(--muted-foreground)] tracking-widest mb-3 px-1">
            {fromGroup.label}
          </p>
          <div className="space-y-0.5" onClick={onClose}>
            {fromGroup.tools.map((t) => <ToolMenuItem key={t.id} tool={t} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// All PDF Tools mega-menu: all 7 groups in columns
function MegaMenu({ onClose }: { onClose: () => void }) {
  const leftGroups = toolGroups.slice(0, 4);
  const rightGroups = toolGroups.slice(4);

  return (
    <div className="absolute top-full right-0 mt-2 w-[900px] bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl p-6 z-50">
      <div className="grid grid-cols-4 gap-6">
        {[...leftGroups, ...rightGroups].map((group) => (
          <div key={group.id}>
            <p className="text-[11px] font-bold text-[var(--muted-foreground)] tracking-widest mb-3 px-1">
              {group.label}
            </p>
            <div className="space-y-0.5" onClick={onClose}>
              {group.tools.map((t) => <ToolMenuItem key={t.id} tool={t} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const convertRef = useRef<HTMLDivElement>(null);
  const megaRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (convertRef.current && !convertRef.current.contains(e.target as Node)) {
        setConvertOpen(false);
      }
      if (megaRef.current && !megaRef.current.contains(e.target as Node)) {
        setMegaOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const directLinks = [
    { label: "MERGE PDF", href: "/tools/merge-pdf" },
    { label: "SPLIT PDF", href: "/tools/split-pdf" },
    { label: "COMPRESS PDF", href: "/tools/compress-pdf" },
  ];

  const mobileAllGroups = toolGroups;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8">
        <div className="flex h-16 items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 bg-[#E8372C] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-xl text-[var(--foreground)]">
              PDF<span className="text-[#E8372C]">Craft</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {directLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-xs font-bold tracking-wide text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-lg transition-colors whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}

            {/* Convert PDF dropdown */}
            <div ref={convertRef} className="relative">
              <button
                onClick={() => { setConvertOpen(!convertOpen); setMegaOpen(false); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wide rounded-lg transition-colors whitespace-nowrap",
                  convertOpen
                    ? "text-[#E8372C] bg-red-50 dark:bg-red-950/30"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                )}
              >
                CONVERT PDF
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", convertOpen && "rotate-180")} />
              </button>
              {convertOpen && <ConvertDropdown onClose={() => setConvertOpen(false)} />}
            </div>

            {/* All PDF Tools mega-menu */}
            <div ref={megaRef} className="relative">
              <button
                onClick={() => { setMegaOpen(!megaOpen); setConvertOpen(false); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-wide rounded-lg transition-colors whitespace-nowrap",
                  megaOpen
                    ? "text-[#E8372C] bg-red-50 dark:bg-red-950/30"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                )}
              >
                ALL PDF TOOLS
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", megaOpen && "rotate-180")} />
              </button>
              {megaOpen && <MegaMenu onClose={() => setMegaOpen(false)} />}
            </div>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            <button
              className="lg:hidden p-2 rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[var(--border)] bg-[var(--background)] max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-4 space-y-6">
            {mobileAllGroups.map((group) => (
              <div key={group.id}>
                <p className="text-[11px] font-bold text-[var(--muted-foreground)] tracking-widest mb-2 px-1">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-0.5">
                  {group.tools.map((tool) => (
                    <Link
                      key={tool.id}
                      href={tool.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
                    >
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: tool.bgColor, color: tool.color }}
                      >
                        {iconMap[tool.icon]}
                      </div>
                      <span className="text-xs font-medium text-[var(--foreground)] truncate">
                        {tool.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
