import { create } from "zustand";

let hasAttachedResizeListener = false;
let lastIsMobile: boolean | null = null;

interface UIState {
  sidebarOpen: boolean;
  rightbarOpen: boolean;
  mobileMenuOpen: boolean;

  theme: "light" | "dark";
  _hydrated: boolean;

  hydrate: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleRightbar: () => void;
  setRightbarOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  rightbarOpen: false,
  mobileMenuOpen: false,
  theme: "dark",
  _hydrated: false,

  hydrate: () => {
    const saved = localStorage.getItem("erza-theme") as "light" | "dark" | null;
    const theme = saved || "dark";
    document.documentElement.setAttribute("data-theme", theme);

    const isMobile = window.innerWidth < 768;
    lastIsMobile = isMobile;

    set({
      theme,
      _hydrated: true,
      sidebarOpen: !isMobile,
    });

    if (!hasAttachedResizeListener) {
      hasAttachedResizeListener = true;
      window.addEventListener("resize", () => {
        const nowIsMobile = window.innerWidth < 768;
        if (lastIsMobile === nowIsMobile) return;
        lastIsMobile = nowIsMobile;

        set({
          sidebarOpen: !nowIsMobile,
        });
      });
    }
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleRightbar: () => set((s) => ({ rightbarOpen: !s.rightbarOpen })),
  setRightbarOpen: (open) => set({ rightbarOpen: open }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setTheme: (theme) => {
    localStorage.setItem("erza-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((s) => {
      const newTheme = s.theme === "dark" ? "light" : "dark";
      localStorage.setItem("erza-theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      return { theme: newTheme };
    }),
}));
