"use client";

import { useState } from "react";
import { toolGroups, allTools, categories } from "@/lib/tools";
import { ToolCard } from "./ToolCard";
import { cn } from "@/lib/utils";

export function ToolGrid() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const isGroupView = activeCategory === "all";

  const filteredTools = isGroupView
    ? null
    : allTools.filter((t) => t.category === activeCategory);

  const filteredGroup = isGroupView
    ? null
    : toolGroups.find((g) => g.id === activeCategory);

  return (
    <div className="space-y-10">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeCategory === cat.id
                ? "bg-[#E8372C] text-white shadow-sm"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* All tools — grouped by category */}
      {isGroupView && (
        <div className="space-y-10">
          {toolGroups.map((group) => (
            <div key={group.id}>
              <h3 className="text-xs font-bold tracking-widest text-[var(--muted-foreground)] mb-4 px-1">
                {group.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {group.tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Single category filter view */}
      {!isGroupView && filteredTools && (
        <div>
          {filteredGroup && (
            <h3 className="text-xs font-bold tracking-widest text-[var(--muted-foreground)] mb-4 px-1">
              {filteredGroup.label}
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
