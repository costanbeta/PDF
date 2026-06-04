import Link from "next/link";
import {
  Merge, Scissors, FileMinus, LayoutGrid,
  Minimize2, Wrench, ScanText,
  FileImage, FileType2, Presentation, Table2, Globe,
  Image, FileText, MonitorPlay, Table,
  RotateCw, Hash, Stamp, Crop,
  Unlock, Lock, PenTool, Eraser,
  Sparkles, Languages, QrCode,
} from "lucide-react";
import type { Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

export const iconMap: Record<string, React.ReactNode> = {
  merge: <Merge className="w-5 h-5" />,
  split: <Scissors className="w-5 h-5" />,
  "file-minus": <FileMinus className="w-5 h-5" />,
  "layout-grid": <LayoutGrid className="w-5 h-5" />,
  compress: <Minimize2 className="w-5 h-5" />,
  wrench: <Wrench className="w-5 h-5" />,
  "scan-text": <ScanText className="w-5 h-5" />,
  "file-image": <FileImage className="w-5 h-5" />,
  "file-type-2": <FileType2 className="w-5 h-5" />,
  presentation: <Presentation className="w-5 h-5" />,
  "table-2": <Table2 className="w-5 h-5" />,
  globe: <Globe className="w-5 h-5" />,
  image: <Image className="w-5 h-5" />,
  "file-text": <FileText className="w-5 h-5" />,
  "monitor-play": <MonitorPlay className="w-5 h-5" />,
  table: <Table className="w-5 h-5" />,
  "rotate-cw": <RotateCw className="w-5 h-5" />,
  hash: <Hash className="w-5 h-5" />,
  stamp: <Stamp className="w-5 h-5" />,
  crop: <Crop className="w-5 h-5" />,
  unlock: <Unlock className="w-5 h-5" />,
  lock: <Lock className="w-5 h-5" />,
  "pen-tool": <PenTool className="w-5 h-5" />,
  eraser: <Eraser className="w-5 h-5" />,
  sparkles: <Sparkles className="w-5 h-5" />,
  languages: <Languages className="w-5 h-5" />,
  "qr-code": <QrCode className="w-5 h-5" />,
};

interface ToolCardProps {
  tool: Tool;
  className?: string;
}

export function ToolCard({ tool, className }: ToolCardProps) {
  return (
    <Link
      href={tool.href}
      className={cn(
        "group relative flex flex-col gap-3 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] transition-all duration-200",
        tool.implemented
          ? "hover:shadow-lg hover:-translate-y-0.5 hover:border-[#E8372C]/30 cursor-pointer"
          : "opacity-70 cursor-default pointer-events-none",
        className
      )}
    >
      {!tool.implemented && (
        <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] tracking-wide">
          SOON
        </span>
      )}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ backgroundColor: tool.bgColor, color: tool.color }}
      >
        {iconMap[tool.icon]}
      </div>
      <div>
        <h3 className={cn(
          "font-semibold transition-colors",
          tool.implemented ? "text-[var(--foreground)] group-hover:text-[#E8372C]" : "text-[var(--muted-foreground)]"
        )}>
          {tool.name}
        </h3>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5 leading-relaxed">
          {tool.description}
        </p>
      </div>
    </Link>
  );
}
