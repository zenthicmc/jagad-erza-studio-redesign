"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/routing";
import { useUIStore } from "@/stores/ui-store";
import {
  MessageSquare,
  FileText,
  FolderOpen,
  ChevronLeft,
  Sparkles,
  Home,
  CheckCheck,
  Wand2,
  RefreshCw,
  SpellCheck,
  PenTool,
  ScanSearch,
} from "lucide-react";

interface NavItem {
  key: string;
  href: string;
  icon: React.ReactNode;
  section?: string;
}

export default function AppSidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const navItems: NavItem[] = [
    {
      key: "home",
      href: "/dashboard",
      icon: <Home size={20} />,
    },
    {
      key: "chat",
      href: "/ai-chat",
      icon: <MessageSquare size={20} />,
      section: "aiToolsMenu",
    },
    {
      key: "article",
      href: "/article",
      icon: <FileText size={20} />,
    },
    {
      key: "writingAssistant",
      href: "/ai-tools/writing-assistant",
      icon: <PenTool size={20} />,
    },
    {
      key: "proofreader",
      href: "/ai-tools/proofread",
      icon: <CheckCheck size={20} />,
    },
    {
      key: "humanizer",
      href: "/ai-tools/humanize",
      icon: <Wand2 size={20} />,
    },
    {
      key: "paraphraser",
      href: "/ai-tools/paraphrase",
      icon: <RefreshCw size={20} />,
    },
    {
      key: "grammarChecker",
      href: "/ai-tools/grammar-correction",
      icon: <SpellCheck size={20} />,
    },
    {
      key: "aiDetector",
      href: "/ai-tools/ai-detector",
      icon: <ScanSearch size={20} />,
    },
    {
      key: "collection",
      href: "/collection",
      icon: <FolderOpen size={20} />,
      section: "library",
    },
  ];

  const isActive = (href: string) => {
    const cleanPath = pathname.replace(/^\/(en|id)/, "");
    return cleanPath === href || cleanPath.startsWith(href + "/");
  };

  let currentSection = "";

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-surface border-r border-border transition-sidebar flex flex-col ${
        sidebarOpen
          ? "w-[var(--sidebar-width)]"
          : "w-[var(--sidebar-collapsed-width)]"
      }`}
    >
      <div className="flex items-center h-[var(--header-height)] px-4 border-b border-border flex-shrink-0">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-primary via-primary-dark to-primary-dark flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-lg font-bold text-foreground tracking-tight">
              Erza
            </span>
          )}
        </Link>

        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="ml-auto p-1.5 rounded-lg hover:bg-surface-hover text-muted transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item) => {
          const showSection = item.section && item.section !== currentSection;
          if (item.section) currentSection = item.section;

          return (
            <React.Fragment key={item.key}>
              {showSection && sidebarOpen && (
                <div className="px-3 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  {t(item.section!)}
                </div>
              )}
              {showSection && !sidebarOpen && (
                <div className="my-2 mx-3 border-t border-border" />
              )}
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all no-underline mb-0.5 ${isActive(item.href)
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
                  } ${!sidebarOpen ? "justify-center px-0" : ""}`}
                title={!sidebarOpen ? t(item.key) : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {sidebarOpen && <span>{t(item.key)}</span>}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {sidebarOpen ? (
        <div className="p-3 shrink-0">
          <div className="bg-surface border border-border rounded-2xl p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted">{t("activePlan")}</span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                <span>👑</span>
                Basic
              </span>
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold text-foreground">150</span>
              <p className="text-sm text-muted mt-0.5">{t("creditsRemaining")}</p>
            </div>

            <Link
              href="/plans-billing"
              className="block w-full text-center bg-gradient-to-r from-primary via-primary-dark to-primary-dark text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:opacity-90 transition-all no-underline"
            >
              {t("upgradePlan")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-2 shrink-0 flex justify-center">
          <Link
            href="/plans-billing"
            className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors no-underline"
            title={t("upgradePlan")}
          >
            <span className="text-base">👑</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
