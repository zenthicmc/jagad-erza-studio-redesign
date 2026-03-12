"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useAuth } from "@/hooks/use-auth";
import { useAuthStore } from "@/stores/auth-store";
import NotificationDropdown from "@/components/features/notification/notification-dropdown";
import {
  Menu,
  Search,
  Bell,
  LogOut,
  LogIn,
  User,
  CreditCard,
  Palette,
  Monitor,
  HelpCircle,
  MessageSquare,
  FileText,
  FolderOpen,
  Sparkles,
  Home,
  PenTool,
  Wand2,
  CheckCheck,
  ScanSearch,
  Command,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Modal, Button } from "@/components/ui";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface SearchItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: string;
}

export default function AppHeader() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const notificationError = useNotificationStore((s) => s.error);
  const isAuthError = useNotificationStore((s) => s.isAuthError);
  const clearError = useNotificationStore((s) => s.clearError);
  const initSocket = useNotificationStore((s) => s.initSocket);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  const router = useRouter();
  const tAuth = useTranslations("auth");
  const tNav = useTranslations("nav");
  const tAiTools = useTranslations("aiTools.tools");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initNotifications = async () => {
      try {
        await fetchNotifications();
        await initSocket();
      } catch (error) {
        console.error("Failed to initialize notifications:", error);
      }
    };

    initNotifications();

    return () => {
      const disconnect = useNotificationStore.getState().disconnect;
      disconnect();
    };
  }, [initSocket, fetchNotifications]);

  useEffect(() => {
    if (isAuthError) {
      console.error(
        "Authentication error in notifications:",
        notificationError,
      );
      clearError();
      router.push("/signin");
    }
  }, [isAuthError, notificationError, clearError, router]);

  const handleSignOut = async () => {
    await useAuthStore.getState().logout();
    setShowLogoutModal(false);
    router.push("/signin");
  };

  const { user } = useAuthStore();

  const initials = user?.full_name
    ? user.full_name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "U";

  const searchableItems: SearchItem[] = useMemo(
    () => [
      { label: tNav("home"), href: "/dashboard", icon: <Home size={16} />, section: tNav("mainMenu") },
      { label: tNav("chat"), href: "/ai-chat", icon: <MessageSquare size={16} />, section: tNav("mainMenu") },
      { label: tNav("article"), href: "/article", icon: <FileText size={16} />, section: tNav("mainMenu") },
      { label: tNav("listicle"), href: "/article/listicle", icon: <FileText size={16} />, section: tNav("article") },
      { label: tNav("longform"), href: "/article/longform", icon: <FileText size={16} />, section: tNav("article") },
      { label: tNav("news"), href: "/article/news", icon: <FileText size={16} />, section: tNav("article") },
      { label: tNav("faq"), href: "/article/faq", icon: <FileText size={16} />, section: tNav("article") },
      { label: tNav("collection"), href: "/collection", icon: <FolderOpen size={16} />, section: tNav("library") },
      { label: tNav("profile"), href: "/settings/profile", icon: <User size={16} />, section: tNav("settings") },
      { label: tNav("appearance"), href: "/appearance", icon: <Palette size={16} />, section: tNav("settings") },
      { label: tNav("plansBilling"), href: "/plans-billing", icon: <CreditCard size={16} />, section: tNav("settings") },
      { label: tNav("sessions"), href: "/sessions", icon: <Monitor size={16} />, section: tNav("settings") },
      { label: tNav("help"), href: "/help", icon: <HelpCircle size={16} />, section: tNav("settings") },
      { label: tAiTools("writingAssistant.title"), href: "/ai-tools/writing-assistant", icon: <PenTool size={16} />, section: tNav("aiTools") },
      { label: tAiTools("humanize.title"), href: "/ai-tools/humanize", icon: <Wand2 size={16} />, section: tNav("aiTools") },
      { label: tAiTools("proofread.title"), href: "/ai-tools/proofread", icon: <CheckCheck size={16} />, section: tNav("aiTools") },
      { label: tAiTools("grammarCorrection.title"), href: "/ai-tools/grammar-correction", icon: <PenTool size={16} />, section: tNav("aiTools") },
      { label: tAiTools("aiDetector.title"), href: "/ai-tools/ai-detector", icon: <ScanSearch size={16} />, section: tNav("aiTools") },
      { label: tAiTools("paraphrase.title"), href: "/ai-tools/paraphrase", icon: <Sparkles size={16} />, section: tNav("aiTools") },
    ],
    [tNav, tAiTools],
  );

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchableItems.filter((item) =>
      item.label.toLowerCase().includes(q),
    );
  }, [searchQuery, searchableItems]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    for (const item of filteredResults) {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    }
    return groups;
  }, [filteredResults]);

  const handleSearchSelect = useCallback(
    (href: string) => {
      router.push(href);
      setSearchQuery("");
      setShowResults(false);
      setActiveIndex(-1);
      searchInputRef.current?.blur();
    },
    [router],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowResults(false);
        setActiveIndex(-1);
        searchInputRef.current?.blur();
        return;
      }
      if (!filteredResults.length) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredResults.length - 1,
        );
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSearchSelect(filteredResults[activeIndex].href);
      }
    },
    [filteredResults, activeIndex, handleSearchSelect],
  );

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 right-0 z-30 h-[var(--header-height)] bg-surface/80 backdrop-blur-xl border-b border-border flex items-center px-4 gap-4 transition-sidebar ${sidebarOpen
          ? "left-[var(--sidebar-width)]"
          : "left-[var(--sidebar-collapsed-width)]"
          }`}
      >
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-surface-hover text-muted transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="flex-1 max-w-md" ref={searchRef}>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              ref={searchInputRef}
              type="search"
              name="app-nav-search"
              role="searchbox"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
                setActiveIndex(-1);
              }}
              onFocus={() => searchQuery.trim() && setShowResults(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder={tNav("searchPlaceholder")}
              autoComplete="off"
              className="w-full bg-background border border-border rounded-lg py-2 pl-10 pr-12 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/25 transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-surface text-[10px] text-muted font-medium">
              <Command size={10} />
              K
            </kbd>

            {showResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl shadow-black/10 py-1 z-50 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                {filteredResults.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted">
                    {tNav("noResults")}
                  </div>
                ) : (
                  Object.entries(groupedResults).map(([section, items]) => (
                    <div key={section}>
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                        {section}
                      </div>
                      {items.map((item) => {
                        const flatIndex = filteredResults.indexOf(item);
                        return (
                          <button
                            key={item.href}
                            onClick={() => handleSearchSelect(item.href)}
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${flatIndex === activeIndex
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-surface-hover"
                              }`}
                          >
                            <span className="text-muted">{item.icon}</span>
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle
            className="p-2.5 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground"
            iconSize={18}
          />

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2.5 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-accent text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            <NotificationDropdown
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>

          <LanguageSwitcher
            className="p-2.5 rounded-xl hover:bg-surface-hover text-muted hover:text-foreground"
            iconSize={18}
            showLabel={true}
          />

          <div className="relative" ref={userMenuRef}>
            {!isAuthLoading && !isAuthenticated ? (
              <Link href="/signin">
                <Button
                  variant="primary"
                  size="sm"
                  className="px-3 py-1.5"
                  icon={<LogIn size={14} />}
                >
                  Sign In
                </Button>
              </Link>
            ) : (
              <>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="ml-2 w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold hover:bg-primary/30 transition-colors overflow-hidden"
                >
                  {user?.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt={user.full_name || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl shadow-black/10 py-1 z-50">
                    {[
                      { href: "/settings/profile", icon: <User size={16} />, label: tNav("profile") },
                      { href: "/settings/integration", icon: <CreditCard size={16} />, label: tNav("integration") },
                      { href: "/plans-billing", icon: <CreditCard size={16} />, label: tNav("plansBilling") },
                      { href: "/help", icon: <HelpCircle size={16} />, label: tNav("help") },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors no-underline"
                      >
                        <span className="text-muted">{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setShowLogoutModal(true);
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors w-full"
                    >
                      <LogOut size={16} />
                      {tAuth("signOut")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title={tAuth("signOut")}
        description={tAuth("signOutDesc")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowLogoutModal(false)}>
              {tAuth("btn_cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleSignOut}
              icon={<LogOut size={16} />}
            >
              {tAuth("signOut")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          {tAuth("signOutWarning")}
        </p>
      </Modal>
    </>
  );
}
