"use client";

import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import {
  FileText,
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
  PenLine,
  CheckCheck,
  UserCheck,
  RefreshCw,
  SpellCheck,
  ScanSearch,
  AlignLeft,
  LayoutList,
  Newspaper,
  HelpCircle,
} from "lucide-react";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user } = useAuthStore();

  const firstName = user?.full_name?.split(" ")[0] || "User";

  const stats = [
    {
      key: "articlesGenerated",
      value: "24",
      icon: <FileText size={20} />,
      trend: "+12%",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      key: "wordsWritten",
      value: "18.5K",
      icon: <TrendingUp size={20} />,
      trend: "+8%",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      key: "creditsUsed",
      value: "350",
      icon: <Zap size={20} />,
      trend: "-5%",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      key: "timeSaved",
      value: "12h",
      icon: <Clock size={20} />,
      trend: "+20%",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  const articleTypes = [
    {
      key: "listicle",
      href: "/article/listicle",
      icon: <LayoutList size={20} />,
      gradient: "from-emerald-500/20 to-emerald-600/5",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
    {
      key: "longform",
      href: "/article/longform",
      icon: <AlignLeft size={20} />,
      gradient: "from-teal-500/20 to-teal-600/5",
      iconColor: "text-teal-400",
      iconBg: "bg-teal-500/10",
    },
    {
      key: "news",
      href: "/article/news",
      icon: <Newspaper size={20} />,
      gradient: "from-cyan-500/20 to-cyan-600/5",
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10",
    },
    {
      key: "faq",
      href: "/article/faq",
      icon: <HelpCircle size={20} />,
      gradient: "from-sky-500/20 to-sky-600/5",
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/10",
    },
  ];

  const aiToolsList = [
    {
      key: "writingAssistant",
      href: "/ai-tools/writing-assistant",
      icon: <PenLine size={20} />,
      gradient: "from-violet-500/20 to-violet-600/5",
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10",
    },
    {
      key: "proofread",
      href: "/ai-tools/proofread",
      icon: <CheckCheck size={20} />,
      gradient: "from-fuchsia-500/20 to-fuchsia-600/5",
      iconColor: "text-fuchsia-400",
      iconBg: "bg-fuchsia-500/10",
    },
    {
      key: "humanize",
      href: "/ai-tools/humanize",
      icon: <UserCheck size={20} />,
      gradient: "from-pink-500/20 to-pink-600/5",
      iconColor: "text-pink-400",
      iconBg: "bg-pink-500/10",
    },
    {
      key: "paraphrase",
      href: "/ai-tools/paraphrase",
      icon: <RefreshCw size={20} />,
      gradient: "from-rose-500/20 to-rose-600/5",
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10",
    },
    {
      key: "grammarCorrection",
      href: "/ai-tools/grammar-correction",
      icon: <SpellCheck size={20} />,
      gradient: "from-orange-500/20 to-orange-600/5",
      iconColor: "text-orange-400",
      iconBg: "bg-orange-500/10",
    },
    {
      key: "aiDetector",
      href: "/ai-tools/ai-detector",
      icon: <ScanSearch size={20} />,
      gradient: "from-red-500/20 to-red-600/5",
      iconColor: "text-red-400",
      iconBg: "bg-red-500/10",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-6xl mx-auto w-full">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {t("greeting", { name: firstName })} 👋
        </h1>
        <p className="text-sm text-muted mt-1.5">
          {t("subtitle")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="relative overflow-hidden p-5 rounded-lg border border-border bg-surface hover:border-border/80 transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <span
                className={`text-xs font-medium ${stat.trend.startsWith("+")
                  ? "text-emerald-400"
                  : "text-red-400"
                  }`}
              >
                {stat.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted mt-0.5">
              {t(`stats.${stat.key}`)}
            </p>
          </div>
        ))}
      </div>

      {/* Article Types */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {t("articleTypesSection")}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {articleTypes.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group relative p-4 rounded-lg border border-border bg-surface hover:border-primary/30 transition-all no-underline overflow-hidden"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative flex items-center gap-3">
                <div className={`p-2 rounded-lg ${item.iconBg} ${item.iconColor} shrink-0`}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {t(`articleTypes.${item.key}.title`)}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">
                    {t(`articleTypes.${item.key}.desc`)}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className="text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all ml-auto shrink-0"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* AI Tools */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {t("aiToolsSection")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiToolsList.map((tool) => (
            <Link
              key={tool.key}
              href={tool.href}
              className="group relative p-4 rounded-lg border border-border bg-surface hover:border-primary/30 transition-all no-underline overflow-hidden"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative flex items-center gap-3">
                <div className={`p-2 rounded-lg ${tool.iconBg} ${tool.iconColor} shrink-0`}>
                  {tool.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {t(`aiToolsItems.${tool.key}.title`)}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 line-clamp-1">
                    {t(`aiToolsItems.${tool.key}.desc`)}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className="text-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all ml-auto shrink-0"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
