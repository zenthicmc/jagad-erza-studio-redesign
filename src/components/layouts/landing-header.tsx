"use client";

import { Link } from "@/i18n/routing";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "../ui/language-switcher";
import { ThemeToggle } from "../ui/theme-toggle";
import { useState, useEffect } from "react";

export default function LandingHeader() {
  const { isAuthenticated, isLoading } = useAuth();
  const tLanding = useTranslations("landing");
  const tAuth = useTranslations("auth");

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-sm shadow-primary/5' : 'bg-transparent py-2'}`}>
      <div className="max-w-7xl mx-auto px-6 h-[var(--header-height)] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(177,243,21,0.3)]">
            <Sparkles size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">
            Erza <span className="text-primary tracking-normal">Studio</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="#features"
            className="text-sm font-medium text-muted hover:text-foreground transition-colors no-underline"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm font-medium text-muted hover:text-foreground transition-colors no-underline"
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            className="text-sm font-medium text-muted hover:text-foreground transition-colors no-underline"
          >
            Blog
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-muted hover:text-foreground transition-colors no-underline"
          >
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle
            className="p-2.5 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
            iconSize={18}
          />

          <LanguageSwitcher
            className="p-2.5 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors hidden sm:flex"
            iconSize={18}
            showLabel={false}
          />
          {!isLoading && isAuthenticated ? (
            <Link
              href="/article"
              className="px-5 py-2.5 text-sm font-medium text-bg rounded-xl bg-primary hover:bg-primary-light transition-colors no-underline shadow-[0_0_15px_rgba(177,243,21,0.2)]"
            >
              {tLanding("goToApp")}
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm font-medium text-muted hover:text-foreground transition-colors no-underline hidden sm:block"
              >
                {tAuth("signIn")}
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 text-sm font-medium text-bg rounded-xl bg-primary hover:bg-primary-light transition-colors no-underline shadow-[0_0_15px_rgba(177,243,21,0.2)]"
              >
                {tLanding("getStarted")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
