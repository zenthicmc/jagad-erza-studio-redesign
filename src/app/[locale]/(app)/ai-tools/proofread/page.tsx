"use client";

import { ArrowLeft, CheckCheck, Clock } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export default function ProofreadPage() {
  const router = useRouter();
  const t = useTranslations("nav");

  return (
    <div className="flex flex-col h-full p-6">
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-8 w-fit"
      >
        <ArrowLeft size={16} />
        {t("home")}
      </button>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
          <CheckCheck size={32} className="text-primary" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("proofreader")}
          </h1>
          <p className="text-muted text-sm max-w-sm">
            This feature is currently under development and will be available
            soon.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface border border-border text-muted text-sm">
          <Clock size={14} />
          Coming Soon
        </div>
      </div>
    </div>
  );
}
