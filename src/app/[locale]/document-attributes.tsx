"use client";

import { useEffect } from "react";

export function DocumentAttributes({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    const saved = localStorage.getItem("erza-theme") as "light" | "dark" | null;
    document.documentElement.setAttribute("data-theme", saved || "dark");
  }, [locale]);
  return null;
}
