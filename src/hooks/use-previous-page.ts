"use client";

import { useEffect, useCallback, useMemo } from "react";
import { useRouter } from "@/i18n/routing";

const STORAGE_KEY = "previous_page_stack";
const MAX_STACK_SIZE = 20;

function getStack(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushToStack(path: string) {
  const stack = getStack();
  if (stack[stack.length - 1] === path) return;
  stack.push(path);
  if (stack.length > MAX_STACK_SIZE) stack.shift();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
}

/**
 * Tracks the previous page pathname on every navigation.
 * Call `usePreviousPageTracker()` once in the app layout to enable tracking.
 */
export function usePreviousPageTracker() {
  useEffect(() => {
    const current = window.location.pathname + window.location.search;

    const handleBeforeNavigate = () => {
      pushToStack(window.location.pathname + window.location.search);
    };

    window.addEventListener("beforeunload", handleBeforeNavigate);

    let lastPath = current;
    const interval = setInterval(() => {
      const now = window.location.pathname + window.location.search;
      if (now !== lastPath) {
        pushToStack(lastPath);
        lastPath = now;
      }
    }, 200);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeNavigate);
      clearInterval(interval);
    };
  }, []);
}

interface UseGoBackOptions {
  /**
   * A regex pattern to skip over matching pages in the history stack.
   */
  skipPattern?: RegExp;

  /**
   * A function called with the resolved previous page path.
   * Return a different path to override the destination,
   * or return the path as-is for default behavior.
   *
   * @example
   * useGoBack("/ai-tools", {
   *   resolve: (prev) => {
   *     if (prev.startsWith("/ai-tools/writing-assistant")) return "/collection";
   *     return prev;
   *   }
   * })
   */
  resolve?: (previousPath: string) => string;
}

/**
 * Returns a `goBack` function that navigates to the previously tracked page.
 * Falls back to `fallback` (default: "/dashboard").
 *
 * @param fallback - The path to navigate to if no previous page is found.
 * @param options.skipPattern - A regex to skip matching entries in the history stack.
 * @param options.resolve - A function to override the destination based on the previous path.
 */
export function useGoBack(fallback = "/dashboard", options?: UseGoBackOptions) {
  const router = useRouter();
  const skipPattern = useMemo(() => options?.skipPattern, [options?.skipPattern]);
  const resolve = options?.resolve;

  const goBack = useCallback(() => {
    const stack = getStack();
    const stripLocale = (path: string) =>
      path.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, "") || "/";

    let target: string | null = null;

    while (stack.length > 0) {
      const candidate = stack.pop()!;
      const stripped = stripLocale(candidate);

      if (!skipPattern || !skipPattern.test(stripped)) {
        target = stripped;
        break;
      }
    }

    const destination = target
      ? (resolve ? resolve(target) : target)
      : fallback;

    router.push(destination as any);
  }, [router, fallback, skipPattern, resolve]);

  return goBack;
}
