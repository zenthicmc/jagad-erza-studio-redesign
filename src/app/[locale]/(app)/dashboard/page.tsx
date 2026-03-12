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
  Sparkles,
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
      border: "border-blue-500/20",
      glow: "shadow-blue-500/10",
    },
    {
      key: "wordsWritten",
      value: "18.5K",
      icon: <TrendingUp size={20} />,
      trend: "+8%",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      glow: "shadow-emerald-500/10",
    },
    {
      key: "creditsUsed",
      value: "350",
      icon: <Zap size={20} />,
      trend: "-5%",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      glow: "shadow-amber-500/10",
    },
    {
      key: "timeSaved",
      value: "12h",
      icon: <Clock size={20} />,
      trend: "+20%",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
      glow: "shadow-purple-500/10",
    },
  ];

  const articleTypes = [
    {
      key: "listicle",
      href: "/article/listicle",
      icon: <LayoutList size={22} />,
      gradient: "from-emerald-500/20 to-emerald-600/5",
      gradientAlways: "from-emerald-500/10 to-transparent",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/15",
      accentLine: "bg-emerald-400",
    },
    {
      key: "longform",
      href: "/article/longform",
      icon: <AlignLeft size={22} />,
      gradient: "from-teal-500/20 to-teal-600/5",
      gradientAlways: "from-teal-500/10 to-transparent",
      iconColor: "text-teal-400",
      iconBg: "bg-teal-500/15",
      accentLine: "bg-teal-400",
    },
    {
      key: "news",
      href: "/article/news",
      icon: <Newspaper size={22} />,
      gradient: "from-cyan-500/20 to-cyan-600/5",
      gradientAlways: "from-cyan-500/10 to-transparent",
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/15",
      accentLine: "bg-cyan-400",
    },
    {
      key: "faq",
      href: "/article/faq",
      icon: <HelpCircle size={22} />,
      gradient: "from-sky-500/20 to-sky-600/5",
      gradientAlways: "from-sky-500/10 to-transparent",
      iconColor: "text-sky-400",
      iconBg: "bg-sky-500/15",
      accentLine: "bg-sky-400",
    },
  ];

  const aiToolsList = [
    {
      key: "writingAssistant",
      href: "/ai-tools/writing-assistant",
      icon: <PenLine size={20} />,
      gradient: "from-violet-500/20 to-violet-600/5",
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/15",
      badge: "Popular",
      badgeColor: "bg-violet-500/15 text-violet-400",
    },
    {
      key: "proofread",
      href: "/ai-tools/proofread",
      icon: <CheckCheck size={20} />,
      gradient: "from-fuchsia-500/20 to-fuchsia-600/5",
      iconColor: "text-fuchsia-400",
      iconBg: "bg-fuchsia-500/15",
      badge: null,
      badgeColor: "",
    },
    {
      key: "humanize",
      href: "/ai-tools/humanize",
      icon: <UserCheck size={20} />,
      gradient: "from-pink-500/20 to-pink-600/5",
      iconColor: "text-pink-400",
      iconBg: "bg-pink-500/15",
      badge: null,
      badgeColor: "",
    },
    {
      key: "paraphrase",
      href: "/ai-tools/paraphrase",
      icon: <RefreshCw size={20} />,
      gradient: "from-rose-500/20 to-rose-600/5",
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/15",
      badge: null,
      badgeColor: "",
    },
    {
      key: "grammarCorrection",
      href: "/ai-tools/grammar-correction",
      icon: <SpellCheck size={20} />,
      gradient: "from-orange-500/20 to-orange-600/5",
      iconColor: "text-orange-400",
      iconBg: "bg-orange-500/15",
      badge: null,
      badgeColor: "",
    },
    {
      key: "aiDetector",
      href: "/ai-tools/ai-detector",
      icon: <ScanSearch size={20} />,
      gradient: "from-red-500/20 to-red-600/5",
      iconColor: "text-red-400",
      iconBg: "bg-red-500/15",
      badge: null,
      badgeColor: "",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-6xl mx-auto w-full">

      {/* ── Greeting Hero ── */}
      <div className="relative mb-8 rounded-2xl overflow-hidden border border-border bg-surface">
        {/* Subtle radial glow from top-left */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        {/* Decorative dots grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, #91CB0A 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative px-6 py-6 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <Sparkles size={11} />
                Erza Studio
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("greeting", { name: firstName })} 👋
            </h1>
            <p className="text-sm text-muted mt-1.5 max-w-md">
              {t("subtitle")}
            </p>
          </div>
          {/* Decorative icon cluster */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sparkles size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className={`relative overflow-hidden p-5 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-all group`}
          >
            {/* Subtle top-edge accent */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] opacity-60`} />
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${stat.bg} border border-border`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  stat.trend.startsWith("+")
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-red-400 bg-red-500/10"
                }`}
              >
                {stat.trend}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted mt-0.5">
              {t(`stats.${stat.key}`)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Article Types ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h2 className="text-base font-semibold text-foreground">
            {t("articleTypesSection")}
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {articleTypes.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group relative p-4 rounded-xl border border-border bg-surface hover:border-primary/30 transition-all no-underline overflow-hidden"
            >
              {/* Always-visible subtle gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.gradientAlways} opacity-100 transition-opacity`}
              />
              {/* Hover gradient (stronger) */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              {/* Left accent line */}
              <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${item.accentLine} opacity-50 group-hover:opacity-100 transition-opacity`} />
              <div className="relative flex flex-col gap-3">
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t(`articleTypes.${item.key}.title`)}
                  </h3>
                  <p className="text-xs text-muted mt-0.5 line-clamp-2">
                    {t(`articleTypes.${item.key}.desc`)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted group-hover:text-primary transition-colors">
                  <span>Start writing</span>
                  <ArrowRight
                    size={12}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── AI Tools ── */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <h2 className="text-base font-semibold text-foreground">
            {t("aiToolsSection")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiToolsList.map((tool) => (
            <Link
              key={tool.key}
              href={tool.href}
              className="group relative p-4 rounded-xl border border-border bg-surface hover:border-primary/30 transition-all no-underline overflow-hidden"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div className="relative flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${tool.iconBg} ${tool.iconColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  {tool.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {t(`aiToolsItems.${tool.key}.title`)}
                    </h3>
                    {tool.badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${tool.badgeColor}`}>
                        {tool.badge}
                      </span>
                    )}
                  </div>
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
