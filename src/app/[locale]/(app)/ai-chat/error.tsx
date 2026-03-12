"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, RefreshCw } from "lucide-react";

export default function AiChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    console.error("[AI Chat Error]", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
        <Sparkles size={32} className="text-red-500" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          {t("chat.errorTitle", { defaultMessage: "Something went wrong" })}
        </h2>
        <p className="text-sm text-muted max-w-md">
          {t("chat.errorDescription", {
            defaultMessage:
              "An unexpected error occurred. Please try again.",
          })}
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity text-sm font-medium"
      >
        <RefreshCw size={14} />
        {t("chat.tryAgain", { defaultMessage: "Try again" })}
      </button>
    </div>
  );
}
