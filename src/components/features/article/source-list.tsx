"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import type { ArticleReference } from "@/stores/article-store";

interface SourceListProps {
  sources: ArticleReference[];
  isLoading?: boolean;
}

export default function SourceList({
  sources,
  isLoading = false,
}: SourceListProps) {
  const t = useTranslations("article");
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    if (!isLoading) return null;
  }

  const visibleSources = isLoading
    ? [null, null, null]
    : expanded
      ? sources
      : sources.slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{t("source")}</h3>
        {!isLoading && sources.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors"
          >
            {expanded ? (
              <>
                {t("imagePreview.hide")}
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                {t("imagePreview.show")} ({sources.length - 3})
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>

      <ul className="space-y-3">
        {visibleSources.map((source, idx) => (
          <li key={idx} className={isLoading ? "animate-pulse" : ""}>
            {source ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 text-xs text-muted hover:text-primary transition-colors"
              >
                <ExternalLink
                  size={12}
                  className="mt-0.5 shrink-0 opacity-50 group-hover:opacity-100"
                />
                <span className="line-clamp-2">
                  {source.title || source.url}
                </span>
              </a>
            ) : (
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 mt-1 rounded bg-surface-hover shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-2 bg-surface-hover rounded w-full" />
                  <div className="h-2 bg-surface-hover rounded w-2/3" />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
