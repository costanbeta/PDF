import { Metadata } from "next";
import { getToolSEO } from "@/lib/seo-data";
import { allTools } from "@/lib/tools";

const toolId = "page-numbers";
const tool = allTools.find((t) => t.id === toolId);
const seo = tool ? getToolSEO(tool.id, tool.name, tool.category) : null;

export const metadata: Metadata = {
  title: seo?.title || "Free PDF Tool",
  description: seo?.description || "Free online PDF tool by PDFCraft.",
  keywords: seo?.keywords || [],
  alternates: {
    canonical: `/tools/${toolId}`,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
