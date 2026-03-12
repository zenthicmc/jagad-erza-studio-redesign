"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/routing";

const STORAGE_KEY = "back_navigation_origin";

interface BackNavigationEntry {
  /** The page the user came FROM (the page that should be returned to). */
  origin: string;
  /** The page the user navigated TO (the destination that owns this entry). */
  destination: string;
}

function readEntry(): BackNavigationEntry | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackNavigationEntry;
  } catch {
    return null;
  }
}

function writeEntry(entry: BackNavigationEntry) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

function clearEntry() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Strip the locale prefix (e.g. /en, /id) from a path so comparisons
 * work regardless of locale.
 */
function stripLocale(path: string): string {
  return path.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, "") || "/";
}

/**
 * Navigate to `destination` and record the current page as the origin
 * so the destination can show a back button pointing back here.
 *
 * Call this instead of `router.push()` whenever you want the destination
 * to know where it came from.
 *
 * @example
 * // In collection-page.tsx
 * navigateWithOrigin(router, `/ai-tools/paraphrase/${id}`);
 */
export function navigateWithOrigin(
  router: { push: (href: string, ...args: any[]) => void },
  destination: string
) {
  const origin = stripLocale(
    window.location.pathname + window.location.search
  );
  const dest = stripLocale(destination);

  writeEntry({ origin, destination: dest });
  router.push(destination as any);
}

function resolveInitial(
  pattern: RegExp,
  strippedPath: string,
  fallback?: string
): { canGoBack: boolean; originPath: string | null } {
  if (typeof window === "undefined") {
    return { canGoBack: fallback !== undefined, originPath: null };
  }
  const entry = readEntry();
  if (
    entry &&
    pattern.test(entry.destination) &&
    pattern.test(strippedPath)
  ) {
    return { canGoBack: true, originPath: entry.origin };
  }
  return { canGoBack: fallback !== undefined, originPath: null };
}

/**
 * Hook used on a destination page (e.g. Humanizer, Paraphraser, Writing Assistant).
 *
 * Returns:
 * - `canGoBack` — true when a valid origin entry exists, OR when `fallback` is provided.
 * - `goBack()` — navigate back to the origin (or fallback) and clear the entry.
 * - `originPath` — the raw origin path string (useful for display).
 *
 * **Auto-clear rules (prevents stale entries):**
 * - When the user navigates away from the destination to any page that is
 *   NOT the recorded origin (e.g. sidebar click), the entry is cleared.
 *
 * @param currentDestinationPattern  A regex that matches the URL(s) of the current page.
 * @param fallback  Optional. When provided, the back button always shows and
 *   navigates to origin if available, otherwise to this fallback path.
 *
 * @example
 * // AI tool — only show back when coming from a collection
 * const { canGoBack, goBack } = useBackNavigation(/^\/ai-tools\/humanize/);
 *
 * @example
 * // Article — always show back, go to collection if available, else /article
 * const { canGoBack, goBack } = useBackNavigation(/^\/article\/.+/, "/article");
 */
export function useBackNavigation(currentDestinationPattern: RegExp, fallback?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const strippedPath = stripLocale(pathname);

  const [{ canGoBack, originPath }] = useState(
    () => resolveInitial(currentDestinationPattern, strippedPath, fallback)
  );

  // Auto-clear (storage only): if the user navigates away from this destination
  // to a page that is NOT the recorded origin, remove the stale sessionStorage
  // entry. No React state is updated here — the component is unmounting/leaving
  // the page, so stale state values don't matter.
  useEffect(() => {
    const entry = readEntry();
    if (!entry) return;

    const onThisPage = currentDestinationPattern.test(strippedPath);
    const onOriginPage = stripLocale(entry.origin) === strippedPath;

    if (!onThisPage && !onOriginPage) {
      clearEntry();
    }
  }, [strippedPath, currentDestinationPattern]);

  const goBack = useCallback(() => {
    const entry = readEntry();
    clearEntry();
    const destination = entry?.origin ?? fallback ?? "/dashboard";
    router.push(destination as any);
  }, [router, fallback]);

  return { canGoBack, goBack, originPath };
}
