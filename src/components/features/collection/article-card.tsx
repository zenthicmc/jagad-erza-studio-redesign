"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  MoreVertical,
  Edit2,
  Trash2,
  Download,
  FileText,
  List,
  AlignLeft,
  Newspaper,
  HelpCircle,
  Pencil,
  RefreshCw,
  CheckSquare,
  ScanSearch,
  MessageSquare,
  Send,
  CaseSensitive,
} from "lucide-react";
import type { ArticleGeneration } from "@/stores/article-store";
import api from "@/lib/api";
import { Dropdown } from "@/components/ui";
import type { DropdownItem } from "@/components/ui/dropdown";
import { downloadContent, sanitizeFilename } from "@/lib/download-utils";

interface ArticleCardProps {
  article: ArticleGeneration;
  onEdit: (article: ArticleGeneration) => void;
  onDelete: (article: ArticleGeneration) => void;
  onRename: (article: ArticleGeneration) => void;
  onPost?: (article: ArticleGeneration) => void;
  isAuthenticated?: boolean;
}

const POSTABLE_TYPES = new Set(["listicle", "longform", "news", "faq"]);

interface TypeConfig {
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  listicle: {
    label: "Listicle",
    icon: <List size={14} />,
    iconBg: "bg-blue-500/10 dark:bg-blue-400/10",
    badgeBg: "bg-blue-100 dark:bg-blue-950/50",
    badgeText: "text-blue-700 dark:text-blue-300",
  },
  longform: {
    label: "Longform",
    icon: <AlignLeft size={14} />,
    iconBg: "bg-violet-500/10 dark:bg-violet-400/10",
    badgeBg: "bg-violet-100 dark:bg-violet-950/50",
    badgeText: "text-violet-700 dark:text-violet-300",
  },
  news: {
    label: "News",
    icon: <Newspaper size={14} />,
    iconBg: "bg-orange-500/10 dark:bg-orange-400/10",
    badgeBg: "bg-orange-100 dark:bg-orange-950/50",
    badgeText: "text-orange-700 dark:text-orange-300",
  },
  faq: {
    label: "FAQ",
    icon: <HelpCircle size={14} />,
    iconBg: "bg-teal-500/10 dark:bg-teal-400/10",
    badgeBg: "bg-teal-100 dark:bg-teal-950/50",
    badgeText: "text-teal-700 dark:text-teal-300",
  },
  humanize: {
    label: "Humanizer",
    icon: <Pencil size={14} />,
    iconBg: "bg-pink-500/10 dark:bg-pink-400/10",
    badgeBg: "bg-pink-100 dark:bg-pink-950/50",
    badgeText: "text-pink-700 dark:text-pink-300",
  },
  paraphrase: {
    label: "Paraphraser",
    icon: <RefreshCw size={14} />,
    iconBg: "bg-amber-500/10 dark:bg-amber-400/10",
    badgeBg: "bg-amber-100 dark:bg-amber-950/50",
    badgeText: "text-amber-700 dark:text-amber-300",
  },
  grammar: {
    label: "Grammar",
    icon: <CheckSquare size={14} />,
    iconBg: "bg-green-500/10 dark:bg-green-400/10",
    badgeBg: "bg-green-100 dark:bg-green-950/50",
    badgeText: "text-green-700 dark:text-green-300",
  },
  detector: {
    label: "AI Detector",
    icon: <ScanSearch size={14} />,
    iconBg: "bg-red-500/10 dark:bg-red-400/10",
    badgeBg: "bg-red-100 dark:bg-red-950/50",
    badgeText: "text-red-700 dark:text-red-300",
  },
  common: {
    label: "Writing Assistant",
    icon: <MessageSquare size={14} />,
    iconBg: "bg-indigo-500/10 dark:bg-indigo-400/10",
    badgeBg: "bg-indigo-100 dark:bg-indigo-950/50",
    badgeText: "text-indigo-700 dark:text-indigo-300",
  },
  assistant: {
    label: "Writing Assistant",
    icon: <MessageSquare size={14} />,
    iconBg: "bg-indigo-500/10 dark:bg-indigo-400/10",
    badgeBg: "bg-indigo-100 dark:bg-indigo-950/50",
    badgeText: "text-indigo-700 dark:text-indigo-300",
  },
};

const DEFAULT_TYPE_CONFIG: TypeConfig = {
  label: "",
  icon: <FileText size={14} />,
  iconBg: "bg-surface-hover",
  badgeBg: "bg-surface-hover",
  badgeText: "text-muted",
};

export function ArticleCard({
  article,
  onEdit,
  onDelete,
  onRename,
  onPost,
  isAuthenticated = false,
}: ArticleCardProps) {
  const t = useTranslations("collection");
  const tCommon = useTranslations("common");
  const tArticle = useTranslations("article");

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusLabel = () => {
    return article.status === "posted" ? t("published") : t("draft");
  };

  const typeKey = (article.article_type_name || "").toLowerCase();
  const typeConfig = TYPE_CONFIG[typeKey] ?? {
    ...DEFAULT_TYPE_CONFIG,
    label: article.article_type_name || "",
  };

  const handleDownload = useCallback(
    async (format: "pdf" | "docx") => {
      let rawContent = article.content || "";
      let title = article.title;

      try {
        const response = await api.get(`/api/articles/${article.id}`);
        const detail = response.data?.result || response.data;
        if (detail?.content !== undefined) rawContent = detail.content || "";
        if (detail?.title !== undefined) title = detail.title;
      } catch {
        // fall back to data already in memory
      }

      if (!rawContent && !title) return;

      const isHtml = rawContent.trim().startsWith("<");

      let html: string;
      if (!rawContent) {
        html = `<h1>${title || "Article"}</h1>`;
      } else if (isHtml) {
        html = rawContent;
      } else {
        const escapeHtml = (value: string) =>
          value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        let formatted = escapeHtml(rawContent);

        const articleType = (
          article.article_type_name || ""
        ).toLowerCase();

        if (articleType === "paraphrase") {
          formatted = formatted.replace(
            /\*\*(.+?)\*\*/g,
            '<span style="background-color:rgba(239,68,68,0.2);font-weight:600;">$1</span>',
          );
          formatted = formatted.replace(
            /\*(.+?)\*/g,
            '<span style="background-color:rgba(255,191,0,0.2);font-weight:600;">$1</span>',
          );
        } else if (articleType === "humanize") {
          formatted = formatted.replace(
            /\*\*(.+?)\*\*/g,
            '<span style="background-color:rgba(255,191,0,0.2);font-weight:600;">$1</span>',
          );
        } else {
          formatted = formatted.replace(
            /\*\*(.+?)\*\*/g,
            '<span style="text-decoration:underline;text-decoration-color:#FFBF00;text-decoration-thickness:2px;text-underline-offset:2px;font-weight:600;">$1</span>',
          );
        }

        const titleHtml = title
          ? `<h1>${escapeHtml(title)}</h1>`
          : "";

        const lines = formatted.split("\n");
        const htmlParts: string[] = [];
        let paraLines: string[] = [];

        const flushParagraph = () => {
          const text = paraLines
            .map((l) => l.trim())
            .filter(Boolean)
            .join("<br/>");
          if (text) htmlParts.push(`<p>${text}</p>`);
          paraLines = [];
        };

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            flushParagraph();
            continue;
          }
          if (trimmed.startsWith("### ")) {
            paraLines.push(trimmed.slice(4));
          } else if (trimmed.startsWith("## ")) {
            paraLines.push(trimmed.slice(3));
          } else if (trimmed.startsWith("# ")) {
            paraLines.push(trimmed.slice(2));
          } else {
            paraLines.push(trimmed);
          }
        }
        flushParagraph();

        const paragraphs = htmlParts.join("");

        html = titleHtml + (paragraphs || `<p>${formatted}</p>`);
      }

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-99999px";
      container.style.top = "0";
      container.style.width = "800px";
      container.innerHTML = html;

      document.body.appendChild(container);

      const toastId = toast.loading(
        format === "pdf"
          ? tArticle("generatingPdf")
          : tArticle("generatingDocx"),
      );

      try {
        const filename = sanitizeFilename(title || "article");
        await downloadContent({
          element: container,
          filename,
          format,
        });
        toast.success(tArticle("successDownload"), { id: toastId });
      } catch (error) {
        console.error("Failed to download article from collection:", error);
        toast.error(tArticle("errorDownload"), { id: toastId });
      } finally {
        document.body.removeChild(container);
      }
    },
    [article.id, article.content, article.title, tArticle],
  );

  const dropdownItems: DropdownItem[] = [
    ...(isAuthenticated
      ? [
        {
          label: tCommon("edit"),
          icon: <Edit2 className="w-4 h-4" />,
          onClick: () => onEdit(article),
        },
        {
          label: t("rename"),
          icon: <CaseSensitive className="w-4 h-4" />,
          onClick: () => onRename(article),
        },
      ]
      : []),
    {
      label: t("downloadPdf"),
      icon: <Download className="w-4 h-4" />,
      onClick: () => void handleDownload("pdf"),
    },
    {
      label: t("downloadDoc"),
      icon: <FileText className="w-4 h-4" />,
      onClick: () => void handleDownload("docx"),
    },
    ...(isAuthenticated && onPost && POSTABLE_TYPES.has(typeKey)
      ? [
        {
          label: tArticle("post"),
          icon: <Send className="w-4 h-4" />,
          onClick: () => onPost(article),
        },
      ]
      : []),
    ...(isAuthenticated
      ? [
        {
          label: tCommon("delete"),
          icon: <Trash2 className="w-4 h-4" />,
          onClick: () => onDelete(article),
          variant: "danger" as const,
        },
      ]
      : []),
  ];

  return (
    <div className="group flex items-center justify-between p-4 bg-surface border border-border rounded-lg hover:border-primary/30 transition-all duration-200">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${typeConfig.iconBg}`}
        >
          <span className={typeConfig.badgeText}>{typeConfig.icon}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-foreground truncate">
              {article.title || "Untitled"}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${typeConfig.badgeBg} ${typeConfig.badgeText}`}
            >
              {typeConfig.label || typeKey}
            </span>

            <span className="text-border text-xs">·</span>
            <span className="text-xs text-muted">{formatDate(article.created_at)}</span>
            <span className="text-border text-xs">·</span>
            <span
              className={`text-xs font-medium ${article.active ? "text-green-500" : "text-yellow-500"}`}
            >
              {getStatusLabel()}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Dropdown
          trigger={
            <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-muted" />
            </button>
          }
          items={dropdownItems}
          align="right"
        />
      </div>
    </div>
  );
}
