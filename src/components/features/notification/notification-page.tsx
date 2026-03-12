"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification } from "@/stores/notification-store";
import { useArticleStore } from "@/stores/article-store";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle2,
  Zap,
  Filter,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Button } from "@/components/ui";

export default function NotificationPage() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const error = useNotificationStore((s) => s.error);
  const isAuthError = useNotificationStore((s) => s.isAuthError);
  const generations = useArticleStore((s) => s.generations);
  const fetchArticle = useArticleStore((s) => s.fetchArticle);
  const t = useTranslations("notification");
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread" | string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);

  useEffect(() => {
    fetchNotifications(1, 100, {
      onSuccess: () => setIsLoading(false),
      onError: () => setIsLoading(false),
    });
  }, [fetchNotifications]);

  const notificationList = useMemo(() => {
    let filtered = Object.values(notifications);

    if (filter === "unread") {
      filtered = filtered.filter((n) => !n.read);
    } else if (filter !== "all") {
      filtered = filtered.filter((n) => n.type === filter);
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return Object.values(notifications).filter((n) => !n.read).length;
  }, [notifications]);

  const notificationTypes = useMemo(() => {
    const types = new Set(
      Object.values(notifications)
        .map((n) => n.type)
        .filter((t): t is string => t != null)
    );
    return Array.from(types);
  }, [notifications]);

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markAsRead(id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.interaction_type === "click" && notification.target_type === "article" && notification.target_id) {
      if (!notification.read) markAsRead(notification.id);

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
    switch (type.toLowerCase()) {
      case "success":
        return <CheckCircle2 size={20} className="text-green-500" />;
      case "error":
        return <AlertCircle size={20} className="text-red-500" />;
      case "warning":
        return <AlertCircle size={20} className="text-yellow-500" />;
      case "info":
        return <Info size={20} className="text-blue-500" />;
      default:
        return <Zap size={20} className="text-primary" />;
    }
  };

  const getNotificationBgColor = (type: string, read: boolean) => {
    const opacity = read ? "5" : "10";
    switch (type.toLowerCase()) {
      case "success":
        return `bg-green-500/${opacity}`;
      case "error":
        return `bg-red-500/${opacity}`;
      case "warning":
        return `bg-yellow-500/${opacity}`;
      case "info":
        return `bg-blue-500/${opacity}`;
      default:
        return `bg-primary/${opacity}`;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bell size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t("title")}
                </h1>
                <p className="text-sm text-muted">
                  {t("subtitle", { count: unreadCount })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  onClick={() => markAllAsRead()}
                  icon={<CheckCheck size={16} />}
                  size="sm"
                  variant="outline"
                >
                  {t("markAllRead")}
                </Button>
              )}
              {Object.values(notifications).length > 0 && (
                <Button
                  onClick={() => setIsClearAllOpen(true)}
                  icon={<Trash2 size={16} />}
                  size="sm"
                  variant="outline"
                >
                  {t("clearAll")}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-6 flex-wrap">
            <Button
              onClick={() => setFilter("all")}
              icon={<Inbox size={14} />}
              size="sm"
              variant={filter === "all" ? "primary" : "outline"}
            >
              {t("all")} ({Object.values(notifications).length})
            </Button>
            <Button
              onClick={() => setFilter("unread")}
              icon={<Filter size={14} />}
              size="sm"
              variant={filter === "unread" ? "primary" : "outline"}
            >
              {t("unread")} ({unreadCount})
            </Button>
            {notificationTypes.map((type) => (
              <Button
                key={type}
                onClick={() => setFilter(type)}
                icon={getNotificationIcon(type)}
                size="sm"
                variant={filter === type ? "primary" : "outline"}
              >
                {type} (
                {
                  Object.values(notifications).filter((n) => n.type === type)
                    .length
                }
                )
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">{t("loading")}</span>
            </div>
          </div>
        ) : error && !isAuthError ? (
          <div className="bg-surface border border-border rounded-lg p-8">
            <div className="flex items-start gap-4 max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertCircle size={24} className="text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Connection Error
                </h3>
                <p className="text-sm text-muted mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        ) : notificationList.length === 0 ? (
          <div className="bg-surface border border-border rounded-lg p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-surface-hover flex items-center justify-center mx-auto mb-4">
              <Bell size={32} className="text-muted" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("noNotifications")}
            </h3>
            <p className="text-sm text-muted">{t("noNotificationsDesc")}</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            {notificationList.map((notification, index) => (
              <div
                key={notification.id}
                className={`group relative px-6 py-4 hover:bg-surface-hover transition-colors${notification.interaction_type === "click" && notification.target_type && notification.target_id ? " cursor-pointer" : ""} ${index !== 0 ? "border-t border-border/50" : ""
                  } ${!notification.read ? "bg-primary/5" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getNotificationBgColor(
                      notification.type ?? "info",
                      notification.read ?? false,
                    )}`}
                  >
                    {getNotificationIcon(notification.type ?? "info")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <h3
                            className={`text-base font-semibold ${notification.read
                              ? "text-muted"
                              : "text-foreground"
                              }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p
                          className={`text-sm mt-1 ${notification.read ? "text-muted/70" : "text-muted"
                            }`}
                        >
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <button
                            onClick={(e) => handleMarkAsRead(e, notification.id)}
                            className="p-2 rounded-lg hover:bg-surface text-muted hover:text-primary transition-all"
                            title={t("markAsRead")}
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="p-2 rounded-lg hover:bg-surface text-muted hover:text-red-500 transition-all"
                          title={t("delete")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {notification.progress != null && (
                      <div className="mt-2 mb-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted">
                            {notification.progress}%{" "}
                            {notification.progress >= 100
                              ? "- Success"
                              : "- In Progress"}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-border overflow-hidden">
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

                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span>
                        {formatDistanceToNow(
                          new Date(notification.created_at),
                          {
                            addSuffix: true,
                          },
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        {format(
                          new Date(notification.created_at),
                          "MMM dd, yyyy 'at' HH:mm",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isClearAllOpen}
        onClose={() => setIsClearAllOpen(false)}
        onConfirm={() => {
          clearAll();
          setIsClearAllOpen(false);
        }}
        title={t("clearAllTitle")}
        description={t("clearAllConfirm")}
        confirmLabel={t("clearAll")}
        cancelLabel={t("clearAllCancel")}
        variant="danger"
      />
    </div>
  );
}
