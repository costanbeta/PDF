"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ progress, label, className }: ProgressBarProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-[var(--muted-foreground)]">{label}</span>
          <span className="font-medium text-[var(--foreground)]">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#E8372C] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
