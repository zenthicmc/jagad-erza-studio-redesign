"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  FileText,
  ScrollText,
  Newspaper,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

const TOOL_ICONS: Record<string, React.ReactNode> = {
  listicle: <ScrollText size={28} />,
  longform: <FileText size={28} />,
  news: <Newspaper size={28} />,
  faq: <HelpCircle size={28} />,
};

const TOOL_SLUGS = ["listicle", "longform", "news", "faq"] as const;

export default function ArticleGreeting() {
  const t = useTranslations("article");
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col p-6 md:p-10 max-w-5xl mx-auto w-full">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t("createArticle")}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TOOL_SLUGS.map((slug) => (
          <button
            key={slug}
            onClick={() => router.push(`article/${slug}`)}
            className="group text-left rounded-lg border border-border bg-surface p-5 hover:border-primary/40 hover:bg-surface-hover transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                {TOOL_ICONS[slug]}
              </div>
              <ArrowRight
                size={14}
                className="text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
              />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">
              {t(`tools.${slug}.title`)}
            </h3>
            <p className="text-xs text-muted leading-relaxed line-clamp-3">
              {t(`tools.${slug}.desc`)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
