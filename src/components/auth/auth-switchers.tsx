"use client";

import React from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export function AuthSwitchers() {

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
      <LanguageSwitcher
        className="p-3 rounded-full bg-surface shadow-lg border border-border hover:bg-surface-hover text-muted hover:text-foreground"
        iconSize={20}
        dropDirection="up"
      />
      <ThemeToggle
        className="p-3 rounded-full bg-surface shadow-lg border border-border hover:bg-surface-hover text-muted hover:text-foreground"
        iconSize={20}
      />
    </div>
  );
}
