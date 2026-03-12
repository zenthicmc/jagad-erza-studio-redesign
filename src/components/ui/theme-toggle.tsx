"use client";

import { Moon, Sun } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  iconSize?: number;
}

export function ThemeToggle({ className, iconSize = 18 }: ThemeToggleProps) {
  const { theme, toggleTheme } = useUIStore();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "transition-colors flex items-center justify-center",
        className
      )}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
    </button>
  );
}
