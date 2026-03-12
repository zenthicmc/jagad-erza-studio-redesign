/**
 * Global navigation guard.
 *
 * Pages that need to block navigation (e.g. ai-chat while streaming)
 * register a guard function. Any component that triggers navigation
 * (e.g. LanguageSwitcher) can call `checkNavigationGuard()` first.
 *
 * If the guard returns `false`, navigation should be aborted.
 * The guard itself is responsible for showing a warning UI.
 */

type GuardFn = () => boolean;

let _guard: GuardFn | null = null;

/**
 * Register a navigation guard. Returns an unregister function.
 * Only one guard is active at a time (last one wins).
 */
export function setNavigationGuard(fn: GuardFn): () => void {
  _guard = fn;
  return () => {
    if (_guard === fn) _guard = null;
  };
}

/**
 * Check the current navigation guard.
 * Returns `true` if navigation is allowed, `false` if blocked.
 */
export function checkNavigationGuard(): boolean {
  if (!_guard) return true;
  return _guard();
}
