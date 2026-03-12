"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Pencil, CheckCircle, User, FileCheck, ScanSearch, ArrowRight, RefreshCw } from "lucide-react";

interface ToolItem {
  slug: string;
  icon: React.ReactNode;
  urlSlug: string;
}

const TOOLS: ToolItem[] = [
  { slug: "writingAssistant", icon: <Pencil size={28} />, urlSlug: "writing-assistant" },
  { slug: "proofread", icon: <CheckCircle size={28} />, urlSlug: "proofread" },
  { slug: "humanize", icon: <User size={28} />, urlSlug: "humanize" },
  { slug: "paraphrase", icon: <RefreshCw size={28} />, urlSlug: "paraphrase" },
  { slug: "grammarCorrection", icon: <FileCheck size={28} />, urlSlug: "grammar-correction" },
  { slug: "aiDetector", icon: <ScanSearch size={28} />, urlSlug: "ai-detector" },
];

export default function AiToolsGreeting() {
  const t = useTranslations("aiTools");
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 max-w-5xl mx-auto w-full">

      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t("title")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <button
            key={tool.slug}
            onClick={() => router.push(`/ai-tools/${tool.urlSlug}`)}
            className="group text-left rounded-lg border border-border bg-surface p-5 hover:border-primary/40 hover:bg-surface-hover transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                {tool.icon}
              </div>
              <ArrowRight
                size={14}
                className="text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
              />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">
              {t(`tools.${tool.slug}.title`)}
            </h3>
            <p className="text-xs text-muted leading-relaxed line-clamp-3">
              {t(`tools.${tool.slug}.desc`)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
