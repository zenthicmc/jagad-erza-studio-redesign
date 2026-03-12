"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification } from "@/stores/notification-store";
import { useArticleStore } from "@/stores/article-store";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  AlertCircle,
  Info,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({
  isOpen,
  onClose,
}: NotificationDropdownProps) {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const error = useNotificationStore((s) => s.error);
  const isAuthError = useNotificationStore((s) => s.isAuthError);
  const generations = useArticleStore((s) => s.generations);
  const fetchArticle = useArticleStore((s) => s.fetchArticle);
  const t = useTranslations("notification");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const notificationList = useMemo(() => {
    return Object.values(notifications).sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return Object.values(notifications).filter((n) => !n.read).length;
  }, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    markAsRead(id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification(id);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.interaction_type === "click" && notification.target_type === "article" && notification.target_id) {
      if (!notification.read) markAsRead(notification.id);
      onClose();

      const existing = generations[notification.target_id];
      if (existing?.article_type_name) {
        router.push(`/article/${existing.article_type_name.toLowerCase()}/${notification.target_id}`);
      } else {
        fetchArticle(notification.target_id, {
          onSuccess: (article: any) => {
            const type = (article.article_type_name || "listicle").toLowerCase();
            router.push(`/article/${type}/${notification.target_id}`);
          },
          onError: () => {
            router.push(`/article/listicle/${notification.target_id}`);
          },
        });
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    const value = (type || "").toLowerCase();
    switch (value) {
      case "success":
        return <CheckCircle2 size={16} className="text-green-500" />;
      case "error":
        return <AlertCircle size={16} className="text-red-500" />;
      case "warning":
        return <AlertCircle size={16} className="text-yellow-500" />;
      case "info":
        return <Info size={16} className="text-blue-500" />;
      default:
        return <Zap size={16} className="text-primary" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-[340px] bg-background border border-border rounded-2xl shadow-xl shadow-black/15 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50"
    >
      <div className="px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell size={18} className="text-foreground" />
            {t("title")}
          </h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                title={t("markAllRead")}
              >
                <CheckCheck size={11} />
                {t("markAllRead")}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
              title={t("close")}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto bg-surface/40">
        {error && !isAuthError && (
          <div className="flex items-start gap-3 py-3 px-4 bg-red-500/5 border-b border-red-500/30">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-red-600 font-semibold">
                Connection Error
              </p>
              <p className="text-[11px] text-red-500/80 mt-1">{error}</p>
            </div>
          </div>
        )}
        {notificationList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 bg-background">
            <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center mb-3">
              <Bell size={24} className="text-muted" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {t("noNotifications")}
            </p>
            <p className="text-xs text-muted text-center max-w-xs">
              {t("noNotificationsDesc")}
            </p>
          </div>
        ) : (
          notificationList.map((notification) => {
            const hasActiveProgress =
              notification.progress != null && notification.progress < 100;
            const isComplete =
              notification.progress != null && notification.progress >= 100;

            return (
              <div
                key={notification.id}
                className={`group px-4 py-3 border-b border-border/60 last:border-b-0 transition-colors bg-background hover:bg-surface-hover${notification.interaction_type === "click" && notification.target_type && notification.target_id ? " cursor-pointer" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 text-muted">
                    {getNotificationIcon(notification.type || "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        className={`text-[13px] font-semibold ${notification.read ? "text-muted" : "text-foreground"
                          }`}
                      >
                        {notification.title}
                      </h4>
                      <span className="text-[10px] text-muted whitespace-nowrap">
                        {formatDistanceToNow(
                          new Date(notification.created_at),
                          {
                            addSuffix: true,
                          },
                        )}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-[11px] leading-snug ${notification.read ? "text-muted/80" : "text-muted"
                        }`}
                    >
                      {notification.message}
                    </p>

                    {notification.progress != null && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-muted">
                            {notification.progress}%{" "}
                            {notification.progress >= 100
                              ? "- Success"
                              : "- In Progress"}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${notification.progress >= 100
                              ? "bg-green-500"
                              : "bg-primary notification-progress-shimmer"
                              }`}
                            style={{
                              width: `${Math.min(notification.progress, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      {!notification.read && (
                        <button
                          onClick={(e) => handleMarkAsRead(e, notification.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-primary/80 hover:text-primary"
                          title={t("markAsRead")}
                        >
                          <Check size={11} />
                          {t("markAsRead")}
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDelete(e, notification.id)}
                        className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-muted hover:text-red-500"
                        title={t("delete")}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {notificationList.length > 0 && (
        <Link
          href="/notification"
          className="block px-4 py-3 text-center text-xs font-medium text-primary hover:bg-primary/5 transition-colors border-t border-border no-underline"
          onClick={onClose}
        >
          {t("viewAll")}
        </Link>
      )}
    </div>
  );
}
