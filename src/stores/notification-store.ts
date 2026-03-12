import Cookies from "js-cookie";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;

  read?: boolean;
  type?: string;

  active?: boolean;
  interaction_type?: string;
  target_type?: string;
  target_id?: string;
  modified_at?: string;
  created_by?: string;
  modified_by?: string;
  data?: Record<string, any>;

  progress?: number;
}

interface NotificationState {
  notifications: Record<string, Notification>;

  socket: WebSocket | null;
  connectionPromise: Promise<WebSocket> | null;
  reconnectAttempts: number;
  reconnectTimeout: NodeJS.Timeout | null;
  heartbeatInterval: NodeJS.Timeout | null;
  isReconnecting: boolean;

  unreadCount: number;

  error: string | null;
  isAuthError: boolean;

  initSocket: () => Promise<WebSocket>;
  disconnect: () => void;
  clearError: () => void;
  fetchNotifications: (
    page?: number,
    limit?: number,
    callbacks?: {
      onSuccess?: (notifications: Notification[]) => void;
      onError?: (err: unknown) => void;
    },
  ) => Promise<void>;
  markAsRead: (
    id: string,
    callbacks?: {
      onSuccess?: () => void;
      onError?: (err: unknown) => void;
    },
  ) => Promise<void>;
  markAllAsRead: (callbacks?: {
    onSuccess?: () => void;
    onError?: (err: unknown) => void;
  }) => Promise<void>;
  deleteNotification: (
    id: string,
    callbacks?: {
      onSuccess?: () => void;
      onError?: (err: unknown) => void;
    },
  ) => Promise<void>;
  clearAll: () => void;
  updateUnreadCount: () => void;
}

const progressTimers = new Map<string, NodeJS.Timeout>();

function startProgressTimer(
  notificationId: string,
  get: () => NotificationState,
  set: (fn: (state: NotificationState) => Partial<NotificationState>) => void,
) {
  if (progressTimers.has(notificationId)) return;

  const interval = setInterval(() => {
    const current = get().notifications[notificationId];
    const currentProgress = current?.progress ?? 0;

    if (currentProgress >= 80) {
      clearInterval(interval);
      progressTimers.delete(notificationId);
      return;
    }

    const increment = Math.random() * 6 + 2;
    const nextProgress = Math.min(Math.round(currentProgress + increment), 80);

    set((state) => ({
      notifications: {
        ...state.notifications,
        [notificationId]: {
          ...state.notifications[notificationId],
          progress: nextProgress,
        },
      },
    }));
  }, 2500);

  progressTimers.set(notificationId, interval);
}

function stopProgressTimer(notificationId: string) {
  const timer = progressTimers.get(notificationId);
  if (timer) {
    clearInterval(timer);
    progressTimers.delete(notificationId);
  }
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: {},
      socket: null,
      connectionPromise: null,
      reconnectAttempts: 0,
      reconnectTimeout: null,
      heartbeatInterval: null,
      isReconnecting: false,
      unreadCount: 0,
      error: null,
      isAuthError: false,

      clearError: () => {
        set({ error: null, isAuthError: false });
      },

      disconnect: () => {
        const { socket, reconnectTimeout, heartbeatInterval } = get();

        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }

        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }

        if (socket) {
          socket.onclose = null;
          socket.onerror = null;
          socket.onmessage = null;
          socket.onopen = null;

          if (
            socket.readyState === WebSocket.OPEN ||
            socket.readyState === WebSocket.CONNECTING
          ) {
            socket.close(1000, "Client disconnect");
          }
        }

        set({
          socket: null,
          connectionPromise: null,
          reconnectTimeout: null,
          heartbeatInterval: null,
          isReconnecting: false,
        });
      },

      initSocket: async (): Promise<WebSocket> => {
        const { socket, connectionPromise, isAuthError, reconnectAttempts } = get();

        if (socket?.readyState === WebSocket.OPEN || connectionPromise) {
          return connectionPromise || Promise.resolve(socket as WebSocket);
        }

        if (isAuthError || reconnectAttempts >= 5) {
          return Promise.reject(new Error("Connection blocked"));
        }

        const connect = async (): Promise<WebSocket> => {
          try {
            const token = Cookies.get("access_token");
            if (!token) throw new Error("No token");

            const params = new URLSearchParams({
              "Accept-Language": "en-US",
              "access_token": token,
              "tz_offset": new Date().getTimezoneOffset().toString(),
            });

            const ws = new WebSocket(
              `wss://api.dev.erza.ai/ws/notifications?${params.toString()}`,
            );

            return new Promise<WebSocket>((resolve, reject) => {
              const connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                  ws.onclose = null;
                  ws.close();
                  set({ connectionPromise: null });
                  reject(new Error("Timeout"));
                }
              }, 10000);

              ws.onopen = () => {
                clearTimeout(connectionTimeout);

                const { heartbeatInterval: oldHeartbeat } = get();
                if (oldHeartbeat) clearInterval(oldHeartbeat);

                const heartbeat = setInterval(() => {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send("ping");
                  } else {
                    clearInterval(heartbeat);
                  }
                }, 30000);

                set({
                  socket: ws,
                  connectionPromise: null,
                  heartbeatInterval: heartbeat,
                  reconnectAttempts: 0,
                  isReconnecting: false,
                });
                resolve(ws);
              };

              ws.onmessage = (event: MessageEvent) => {
                let payload: any;
                try {
                  payload = JSON.parse(event.data as string);
                } catch {
                  return;
                }

                if (!payload) return;

                if (payload.errors || payload.error) {
                  const errorMsg =
                    payload.errors?.[0]?.message ||
                    payload.error?.message ||
                    payload.message ||
                    "Unknown error";
                  set({ error: errorMsg });
                  return;
                }

                const normalizeNotification = (
                  item: any,
                  defaultType: string,
                ): Notification | null => {
                  if (!item || !item.id) return null;
                  return {
                    id: item.id,
                    title: item.title ?? "",
                    message: item.message ?? "",
                    created_at: item.created_at ?? new Date().toISOString(),
                    read: item.read ?? false,
                    type: item.type ?? defaultType,
                    active: item.active,
                    interaction_type: item.interaction_type,
                    target_type: item.target_type,
                    target_id: item.target_id,
                    modified_at: item.modified_at,
                    created_by: item.created_by,
                    modified_by: item.modified_by,
                    data: item.data,
                  };
                };

                const evt: string | undefined = payload.event;
                const result = payload.result;

                if (result?.notifications && Array.isArray(result.notifications)) {
                  const newEntries: Record<string, Notification> = {};
                  (result.notifications as any[]).forEach((raw) => {
                    const normalized = normalizeNotification(raw, "info");
                    if (normalized) {
                      newEntries[normalized.id] = normalized;
                    }
                  });

                  if (Object.keys(newEntries).length > 0) {
                    set((state) => ({
                      notifications: {
                        ...state.notifications,
                        ...newEntries,
                      },
                    }));
                    get().updateUnreadCount();
                  }
                  return;
                }

                if (
                  evt === "task_progress" ||
                  evt === "task_completed"
                ) {
                  const defaultType =
                    evt === "task_completed" ? "success" : "info";
                  const normalized = normalizeNotification(result, defaultType);
                  if (!normalized) return;

                  if (evt === "task_completed") {
                    stopProgressTimer(normalized.id);

                    set((state) => {
                      const existing = state.notifications[normalized.id];
                      return {
                        notifications: {
                          ...state.notifications,
                          [normalized.id]: {
                            ...existing,
                            ...normalized,
                            progress: 100,
                          },
                        },
                      };
                    });
                  } else {
                    set((state) => {
                      const existing = state.notifications[normalized.id];
                      return {
                        notifications: {
                          ...state.notifications,
                          [normalized.id]: {
                            ...existing,
                            ...normalized,
                            progress: existing?.progress ?? 0,
                          },
                        },
                      };
                    });

                    startProgressTimer(normalized.id, get, set);
                  }

                  get().updateUnreadCount();
                  return;
                }
              };

              ws.onclose = (event: CloseEvent) => {
                const { heartbeatInterval } = get();
                if (heartbeatInterval) clearInterval(heartbeatInterval);

                set({ socket: null, connectionPromise: null, heartbeatInterval: null });

                if (event.code === 1006) {
                  console.warn("Connection lost (1006). Likely heartbeat timeout.");
                }

                if (event.code === 1000 || event.code === 1001 || [4401, 4403].includes(event.code)) return;

                const delay = Math.min(1000 * Math.pow(2, get().reconnectAttempts), 30000);
                set({ reconnectAttempts: get().reconnectAttempts + 1, isReconnecting: true });
                setTimeout(() => get().initSocket().catch(() => { }), delay);
              };

              ws.onerror = () => {
                set({ connectionPromise: null });
                reject();
              };
            });
          } catch (error) {
            set({ connectionPromise: null });
            throw error;
          }
        };

        const promise = connect();
        set({ connectionPromise: promise });
        return promise;
      },

      fetchNotifications: async (page = 1, limit = 50, callbacks) => {
        try {
          const socket = await get().initSocket();

          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "get_all",
                data: {
                  pagination: {
                    limit,
                    page,
                    sort_by: "created_at",
                    sort_dir: "DESC",
                  },
                  filter: {
                    active: true,
                    interaction_type: "",
                  },
                },
              }),
            );

            callbacks?.onSuccess?.([]);
          }
        } catch (error) {
          console.error("Failed to fetch notifications", error);
          callbacks?.onError?.(error);
        }
      },

      markAsRead: async (id, callbacks) => {
        try {
          const socket = await get().initSocket();

          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "read",
                data: { id },
              }),
            );

            set((state) => ({
              notifications: {
                ...state.notifications,
                [id]: { ...state.notifications[id], read: true },
              },
            }));

            get().updateUnreadCount();
            callbacks?.onSuccess?.();
          }
        } catch (error) {
          console.error("Failed to mark notification as read", error);
          callbacks?.onError?.(error);
        }
      },

      markAllAsRead: async (callbacks) => {
        try {
          const socket = await get().initSocket();

          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "read_all",
                data: {},
              }),
            );

            set((state) => {
              const updated: Record<string, Notification> = {};
              Object.keys(state.notifications).forEach((key) => {
                updated[key] = { ...state.notifications[key], read: true };
              });
              return { notifications: updated };
            });

            get().updateUnreadCount();
            callbacks?.onSuccess?.();
          }
        } catch (error) {
          console.error("Failed to mark all as read", error);
          callbacks?.onError?.(error);
        }
      },

      deleteNotification: async (id, callbacks) => {
        try {
          const socket = await get().initSocket();

          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                type: "delete",
                id: id,
              }),
            );

            set((state) => {
              const updated = { ...state.notifications };
              delete updated[id];
              return { notifications: updated };
            });

            get().updateUnreadCount();
            callbacks?.onSuccess?.();
          }
        } catch (error) {
          console.error("Failed to delete notification", error);
          callbacks?.onError?.(error);
        }
      },

      clearAll: () => {
        set({ notifications: {}, unreadCount: 0 });
      },

      updateUnreadCount: () => {
        const count = Object.values(get().notifications).filter(
          (n) => !n.read,
        ).length;
        set({ unreadCount: count });
      },
    }),
    {
      name: "notification-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notifications: state.notifications,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setTimeout(() => {
          const store = useNotificationStore;
          const notifications = store.getState().notifications;
          Object.values(notifications).forEach((n) => {
            if (n.progress != null && n.progress < 100) {
              startProgressTimer(
                n.id,
                () => store.getState(),
                (fn) => store.setState(fn(store.getState())),
              );
            }
          });
        }, 0);
      },
    },
  ),
);
