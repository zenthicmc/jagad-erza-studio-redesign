"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Languages, Check } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter as useIntlRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { checkNavigationGuard } from "@/lib/navigation-guard";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

interface LanguageSwitcherProps {
  className?: string;
  iconSize?: number;
  showLabel?: boolean;
  dropDirection?: "up" | "down";
}

export function LanguageSwitcher({
  className,
  iconSize = 18,
  showLabel = false,
  dropDirection = "down",
}: LanguageSwitcherProps) {
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const intlRouter = useIntlRouter();
  const langMenuRef = useRef<HTMLDivElement>(null);

  const handleChangeLanguage = useCallback(
    async (targetLocale: "en" | "id") => {
      if (targetLocale === locale) {
        setShowLanguageMenu(false);
        return;
      }

      if (!checkNavigationGuard()) {
        setShowLanguageMenu(false);
        return;
      }

      const qs = searchParams.toString();
      const fullPath = qs ? `${pathname}?${qs}` : pathname;

      intlRouter.replace(fullPath, { locale: targetLocale });
      setShowLanguageMenu(false);

      const token = Cookies.get("access_token");
      if (token) {
        try {
          await api.post("/api/user-languages", { locale: targetLocale });
        } catch {
          toast.error("Failed to update language preference");
        }
      }
    },
    [intlRouter, locale, pathname, searchParams],
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(e.target as Node)
      ) {
        setShowLanguageMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={langMenuRef}>
      <button
        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
        className={cn(
          "transition-colors flex items-center justify-center gap-2",
          className
        )}
        aria-label="Change language"
      >
        <Languages size={iconSize} />
        {showLabel && (
          <span className="text-xs font-bold uppercase">{locale}</span>
        )}
      </button>

      {showLanguageMenu && (
        <div
          className={cn(
            "absolute min-w-[12rem] bg-surface/90 backdrop-blur-xl border border-border rounded-xl shadow-xl shadow-black/10 py-1.5 z-50 overflow-hidden",
            dropDirection === "up" ? "bottom-full mb-2 right-0" : "top-full mt-2 right-0"
          )}
        >
          {[
            { id: "id", label: "Bahasa Indonesia" },
            { id: "en", label: "English" },
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => {
                handleChangeLanguage(lang.id as "en" | "id");
              }}
              className="flex items-center justify-between w-full px-4 py-2 text-sm transition-colors hover:bg-surface-hover/80"
            >
              <span
                className={
                  locale === lang.id
                    ? "text-primary font-medium text-left"
                    : "text-foreground text-left"
                }
              >
                {lang.label}
              </span>
              {locale === lang.id && (
                <Check size={14} className="text-primary flex-shrink-0 ml-3" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
