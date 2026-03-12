"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ChatHistorySidebar from "@/components/chat/chat-history-sidebar";
import { chatService } from "@/lib/chat-service";
import { setNavigationGuard } from "@/lib/navigation-guard";
import {
  ChatLayoutProvider,
  useChatLayout,
} from "@/contexts/chat-layout-context";
import { useChatStore } from "@/stores/chat-store";
import { Modal, Button } from "@/components/ui";

function AiChatLayoutContent({ children }: { children: React.ReactNode }) {
  const { isSidebarCollapsed, toggleSidebar } = useChatLayout();
  const router = useRouter();
  const t = useTranslations("chat");

  const streamingChatIds = useChatStore((s) => s.streamingChatIds);
  const pendingMessages = useChatStore((s) => s.pendingMessages);
  const isProcessing = streamingChatIds.size > 0 || pendingMessages.size > 0;

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Register a global navigation guard so LanguageSwitcher (and any other
  // programmatic navigation) can check before triggering a page refresh.
  const guardCallback = useCallback(() => {
    const store = useChatStore.getState();
    const processing =
      store.streamingChatIds.size > 0 || store.pendingMessages.size > 0;
    if (processing) {
      setShowLeaveModal(true);
      return false; // block navigation
    }
    return true; // allow
  }, []);

  useEffect(() => {
    const unregister = setNavigationGuard(guardCallback);
    return unregister;
  }, [guardCallback]);

  // Keep ChatService's router reference up to date
  useEffect(() => {
    chatService.setRouter(router);
  }, [router]);

  // Block browser reload / tab close (Bug #12 fix: covers pendingMessages too)
  useEffect(() => {
    if (!isProcessing) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing]);

  // Intercept in-app link clicks that navigate away from /ai-chat
  useEffect(() => {
    if (!isProcessing) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href") || "";
      const isExternal = anchor.target === "_blank" || href.startsWith("http");
      const isInsideChat = href.includes("/ai-chat");
      if (isExternal || isInsideChat) return;

      e.preventDefault();
      e.stopPropagation();
      setPendingHref(href);
      setShowLeaveModal(true);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isProcessing]);

  const handleConfirmLeave = () => {
    setShowLeaveModal(false);
    if (pendingHref) {
      router.push(pendingHref);
      setPendingHref(null);
    }
  };

  const handleCancelLeave = () => {
    setShowLeaveModal(false);
    setPendingHref(null);
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-height))]">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>

      <ChatHistorySidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <Modal
        isOpen={showLeaveModal}
        onClose={handleCancelLeave}
        title={t("leaveWarningTitle")}
        size="sm"
        showClose={false}
        closeOnBackdrop={false}
        footer={
          <>
            <Button variant="ghost" onClick={handleCancelLeave}>
              {t("leaveWarningCancel")}
            </Button>
            <Button variant="danger" onClick={handleConfirmLeave}>
              {t("leaveWarningConfirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t("leaveWarningDescription")}</p>
      </Modal>
    </div>
  );
}

export default function AiChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const locale = (params?.locale as string) || "id-ID";

  useEffect(() => {
    chatService.init(locale);
  }, [locale]);

  return (
    <ChatLayoutProvider>
      <AiChatLayoutContent>{children}</AiChatLayoutContent>
    </ChatLayoutProvider>
  );
}
