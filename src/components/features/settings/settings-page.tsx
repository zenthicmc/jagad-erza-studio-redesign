"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  User,
  Shield,
  CreditCard,
  Coins,
  Puzzle,
} from "lucide-react";
import { useRouter } from "@/i18n/routing";

export type SettingsTab =
  | "profile"
  | "security"
  | "planBilling"
  | "creditBalance"
  | "integration";

interface TabItem {
  key: SettingsTab;
  icon: React.ReactNode;
  labelKey: string;
  descKey: string;
  href: string;
}

interface SettingsPageProps {
  activeTab: SettingsTab;
  children: React.ReactNode;
}

export default function SettingsPage({ activeTab, children }: SettingsPageProps) {
  const t = useTranslations("settings");
  const router = useRouter();

  const tabs: TabItem[] = [
    {
      key: "profile",
      icon: <User size={18} />,
      labelKey: "tabs.profile",
      descKey: "tabs.profileDesc",
      href: "/settings/profile",
    },
    {
      key: "security",
      icon: <Shield size={18} />,
      labelKey: "tabs.security",
      descKey: "tabs.securityDesc",
      href: "/settings/security",
    },
    {
      key: "planBilling",
      icon: <CreditCard size={18} />,
      labelKey: "tabs.planBilling",
      descKey: "tabs.planBillingDesc",
      href: "/settings/plan-billing",
    },
    {
      key: "creditBalance",
      icon: <Coins size={18} />,
      labelKey: "tabs.creditBalance",
      descKey: "tabs.creditBalanceDesc",
      href: "/settings/credit-balance",
    },
    {
      key: "integration",
      icon: <Puzzle size={18} />,
      labelKey: "tabs.integration",
      descKey: "tabs.integrationDesc",
      href: "/settings/integration",
    },
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-[280px] shrink-0">
            <div className="lg:sticky lg:top-[calc(var(--header-height)+2rem)]">
              <h1 className="text-xl font-bold text-foreground">
                {t("title")}
              </h1>
              <p className="text-sm text-muted mt-0.5 mb-5">
                {t("subtitle")}
              </p>

              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => router.push(tab.href)}
                    className={`w-full group flex items-center gap-3 py-3 rounded-lg text-left transition-all ${activeTab === tab.key
                      ? "text-primary"
                      : "text-foreground"
                      }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${activeTab === tab.key
                        ? "bg-primary/20 text-primary"
                        : "bg-surface-hover text-muted group-hover:bg-primary/10 group-hover:text-primary"
                        }`}
                    >
                      {tab.icon}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium leading-tight ${activeTab === tab.key
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary group-hover:cursor-pointer"
                          }`}
                      >
                        {t(tab.labelKey)}
                      </p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {t(tab.descKey)}
                      </p>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
