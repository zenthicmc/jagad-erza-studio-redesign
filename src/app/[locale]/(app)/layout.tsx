"use client";

import { useEffect } from "react";
import Cookies from "js-cookie";
import AppSidebar from "@/components/layouts/app-sidebar";
import AppHeader from "@/components/layouts/app-header";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "@/i18n/routing";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const hydrate = useUIStore((s) => s.hydrate);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasFetched = useAuthStore((s) => s.hasFetched);
  const refetchUser = useAuthStore((s) => s.refetchUser);
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!_hasHydrated) return;
    const token = Cookies.get("access_token");
    if (token && !user?.email) {
      refetchUser();
    }
  }, [_hasHydrated, user, refetchUser]);

  useEffect(() => {
    if (!_hasHydrated || !hasFetched) return;
    if (user === null || !isAuthenticated) {
      router.replace("/signin");
    }
  }, [_hasHydrated, hasFetched, user, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <AppHeader />
      <main
        className={`pt-[var(--header-height)] min-h-screen transition-sidebar ${sidebarOpen
          ? "ml-[var(--sidebar-width)]"
          : "ml-[var(--sidebar-collapsed-width)]"
          }`}
      >
        {children}
      </main>
    </div>
  );
}
