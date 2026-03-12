import Cookies from "js-cookie";
import { create } from "zustand";
import type { StateCreator } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PersistOptions } from "zustand/middleware";
import api from "@/lib/api";
import toast from "react-hot-toast";
import enMessages from "@/messages/en.json";
import idMessages from "@/messages/id.json";

const ARTICLE_STORE_KEY = "article-store";
const MAX_PERSISTED_GENERATIONS = 50;
const MAX_PERSISTED_DRAFTS = 20;

function createSafeStorage(storage: Storage): Storage {
  return {
    getItem(name: string) {
      try {
        return storage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem(name: string, value: string) {
      try {
        storage.setItem(name, value);
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          console.warn(
            "[article-store] localStorage quota exceeded; persistence skipped for this update.",
          );
        }
      }
    },
    removeItem(name: string) {
      try {
        storage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
    get length() {
      return storage.length;
    },
    key(i: number) {
      return storage.key(i);
    },
    clear() {
      storage.clear();
    },
  };
}

type ArticlePersist = (
  config: StateCreator<ArticleState>,
  options: PersistOptions<ArticleState>,
) => StateCreator<ArticleState>;

const articlePersist = persist as unknown as ArticlePersist;

export interface ArticleImage {
  url: string;
  source_name: string;
  source_url: string;
}

export interface ArticleReference {
  title: string;
  url: string;
}

export interface ArticleGeneration {
  id: string;
  status: string;
  content?: string;
  title?: string;
  topics?: string[];
  images?: ArticleImage[];
  references?: ArticleReference[];
  article_type_name?: string;
  article_collection_id?: string;
  created_at?: string;
  modified_at?: string;
  active?: boolean;
}

interface ArticleState {
  generations: Record<string, ArticleGeneration>;
  articleDraft: Record<string, string>;

  socket: WebSocket | null;
  connectionPromise: Promise<WebSocket> | null;

  initSocket: () => Promise<WebSocket>;
  disconnectSocket: () => void;


  generate: (
    payload: Record<string, unknown>,
    callbacks: {
      onSuccess: (res: Record<string, unknown>) => void;
      onError: (err: unknown) => void;
    },
  ) => Promise<void>;
  regenerate: (
    articleId: string,
    callbacks?: {
      onSuccess?: (res: unknown) => void;
      onError?: (err: unknown) => void;
    },
  ) => Promise<void>;
  reloadImage: (
    articleId: string,
    callbacks?: {
      onSuccess?: (res: ArticleImage[]) => void;
      onError?: (err: unknown) => void;
    },
  ) => Promise<void>;

  syncArticles: (
    type?: string | null,
    callbacks?: {
      onSuccess?: (res: ArticleGeneration[]) => void;
      onError?: (err: unknown) => void;
    },
  ) => void;
  fetchArticle: (
    id: string,
    callbacks?: {
      onSuccess?: (res: ArticleGeneration) => void;
      onError?: (err: unknown) => void;
    },
  ) => Promise<void>;
  saveArticle: (
    id: string,
    content: string,
    callbacks?: {
      onSuccess?: (res: unknown) => void;
      onError?: (err: unknown) => void;
    },
  ) => Promise<void>;
  removeArticle: (id: string) => void;
  removeArticleImage: (articleId: string, imageUrl: string) => void;

  collectionVersion: number;
  triggerCollectionUpdate: () => void;

  setArticleDraft: (id: string, content: string) => void;
  clearArticleDraft: (id: string) => void;
}

export const useArticleStore = create<ArticleState>()(
  articlePersist(
    (set, get) => ({
      generations: {},
      articleDraft: {},

      socket: null,
      connectionPromise: null,

      initSocket: async () => {
        const { socket, connectionPromise } = get();

        if (socket?.readyState === WebSocket.OPEN) return socket;
        if (connectionPromise) return connectionPromise;

        const connect = async (): Promise<WebSocket> => {
          try {
            await api.get("/api/test");
          } catch {
            /* ignore */
          }

          const locale = Cookies.get("NEXT_LOCALE") || "id";
          const language = locale === "en" ? "en-US" : "id-ID";
          const token = Cookies.get("access_token");

          // const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
          // const host = baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
          const wsUrl = `wss://api.dev.erza.ai/ws/articles?Accept-Language=${language}&access_token=${token}&tz_offset=${new Date().getTimezoneOffset()}`; // hardcode dulu
          const ws = new WebSocket(wsUrl);

          return new Promise<WebSocket>((resolve, reject) => {
            ws.onopen = () => {
              set({ socket: ws, connectionPromise: null });
              resolve(ws);
            };

            ws.onmessage = (event: MessageEvent) => {
              try {
                const response = JSON.parse(event.data as string);
                if (response?.errors) return;

                const eventType = response.event;
                const result = response.result;

                if (eventType === "error") {
                  const _locale = Cookies.get("NEXT_LOCALE") || "id";
                  const _msg = (_locale === "en" ? enMessages : idMessages).article.form.eventError;
                  toast.error(_msg);

                  set((s) => {
                    const updated = { ...s.generations };
                    for (const [id, gen] of Object.entries(updated)) {
                      const status = (gen.status || "").toLowerCase();
                      if (["pending", "in_progress"].includes(status)) {
                        updated[id] = { ...gen, status: "failed" };
                      }
                    }
                    return { generations: updated };
                  });
                  return;
                }

                if (eventType === "task_accepted" && result?.articles) {
                  const entries: Record<string, ArticleGeneration> = {};
                  const current = get().generations;

                  (result.articles as ArticleGeneration[]).forEach((item) => {
                    const existing = current[item.id];
                    entries[item.id] = {
                      ...existing,
                      ...item,
                      status: item.status || "pending",
                      created_at: item.created_at || existing?.created_at || new Date().toISOString(),
                      images: existing?.images || [],
                      references: existing?.references || [],
                    };
                  });

                  set((s) => ({
                    generations: { ...s.generations, ...entries },
                  }));
                  return;
                }

                if (eventType === "task_progress" && result?.target_id) {
                  set((s) => {
                    const existing = s.generations[result.target_id] || {};
                    return {
                      generations: {
                        ...s.generations,
                        [result.target_id]: {
                          ...existing,
                          id: result.target_id,
                          status: "in_progress",
                        },
                      },
                    };
                  });
                  return;
                }

                if (eventType === "task_completed" && result?.target_id) {
                  set((s) => {
                    const existing = s.generations[result.target_id] || {};
                    return {
                      generations: {
                        ...s.generations,
                        [result.target_id]: {
                          ...existing,
                          id: result.target_id,
                          status: "done",
                          title: result.title ?? existing.title,
                        },
                      },
                    };
                  });

                  setTimeout(() => get().fetchArticle(result.target_id), 500);
                  return;
                }

                const update =
                  response.articles ||
                  response.result ||
                  (response.id ? response : null);

                if (update?.id) {
                  set((s) => {
                    const existing = s.generations[update.id] || {};
                    return {
                      generations: {
                        ...s.generations,
                        [update.id]: {
                          ...existing,
                          ...update,
                          images:
                            update.images?.length > 0
                              ? update.images
                              : existing.images || [],
                          references:
                            update.references?.length > 0
                              ? update.references
                              : existing.references || [],
                        },
                      },
                    };
                  });
                }
              } catch {
                /* ignore parse errors */
              }
            };

            ws.onclose = () => {
              set({ socket: null, connectionPromise: null });
            };

            ws.onerror = (err) => {
              reject(err);
            };
          });
        };

        try {
          const promise = connect();
          set({ connectionPromise: promise });
          return promise;
        } catch (error) {
          set({ connectionPromise: null });
          throw error;
        }
      },

      disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
          socket.close();
          set({ socket: null, connectionPromise: null });
        }
      },


      generate: async (payload, { onSuccess, onError }) => {

        try {
          if (!get().socket || get().socket?.readyState !== WebSocket.OPEN) {
            await get().initSocket();
          }

          const ws = get().socket;
          if (!ws) return;

          const listener = (event: MessageEvent) => {
            const response = JSON.parse(event.data as string);

            if (response?.errors || response?.error) {
              ws.removeEventListener("message", listener);
              onError(response?.errors || response?.error);
              return;
            }

            if (response?.event === "task_accepted" && response?.result) {
              const articleId = response.result.articles?.[0]?.id;

              if (articleId) {
                set((s) => ({
                  generations: {
                    ...s.generations,
                    [articleId]: {
                      ...(s.generations[articleId] || {}),
                      id: articleId,
                      status: "pending",
                      topics: Array.isArray(payload.topics)
                        ? (payload.topics as string[])
                        : [payload.topics as string],
                      article_type_name:
                        (payload.article_type as string) || "listicle",
                      created_at: new Date().toISOString(),
                    },
                  },
                }));
              }

              ws.removeEventListener("message", listener);
              onSuccess(response);
              return;
            }
          };

          ws.addEventListener("message", listener);
          ws.send(JSON.stringify({ type: "create", data: payload }));

          setTimeout(() => ws.removeEventListener("message", listener), 15000);
        } catch (e) {
          onError(e);
        }
      },

      regenerate: async (articleId, callbacks) => {

        try {
          if (!get().socket || get().socket?.readyState !== WebSocket.OPEN) {
            await get().initSocket();
          }

          const ws = get().socket;
          if (!ws) return;

          set((s) => {
            const existing = s.generations[articleId];
            if (!existing) return s;
            return {
              generations: {
                ...s.generations,
                [articleId]: {
                  ...existing,
                  status: "pending",
                  modified_at: new Date().toISOString(),
                },
              },
            };
          });

          const listener = (event: MessageEvent) => {
            const response = JSON.parse(event.data as string);

            if (response?.errors) {
              ws.removeEventListener("message", listener);

              set((s) => {
                const existing = s.generations[articleId];
                if (!existing) return s;
                return {
                  generations: {
                    ...s.generations,
                    [articleId]: { ...existing, status: "done" },
                  },
                };
              });
              callbacks?.onError?.(response.errors);
              return;
            }

            if (response?.event === "task_accepted") {
              ws.removeEventListener("message", listener);
              callbacks?.onSuccess?.(response);
              return;
            }
          };

          ws.addEventListener("message", listener);
          ws.send(
            JSON.stringify({
              type: "regenerate",
              data: { article_id: articleId },
            }),
          );

          setTimeout(() => ws.removeEventListener("message", listener), 15000);
        } catch (e) {
          callbacks?.onError?.(e);
        }
      },

      reloadImage: async (articleId, callbacks) => {

        try {
          if (!get().socket || get().socket?.readyState !== WebSocket.OPEN) {
            await get().initSocket();
          }

          const ws = get().socket;
          if (!ws) return;

          const listener = (event: MessageEvent) => {
            const response = JSON.parse(event.data as string);
            const images = response.result?.images;

            if (response?.errors) {
              ws.removeEventListener("message", listener);
              callbacks?.onError?.(response.errors);
              return;
            }

            if (images && images.length > 0) {
              set((s) => {
                const existing = s.generations[articleId];
                if (!existing) return s;
                return {
                  generations: {
                    ...s.generations,
                    [articleId]: { ...existing, images },
                  },
                };
              });
              ws.removeEventListener("message", listener);
              callbacks?.onSuccess?.(images);
            }
          };

          ws.addEventListener("message", listener);
          ws.send(
            JSON.stringify({
              type: "reload_images",
              data: { article_id: articleId },
            }),
          );

          setTimeout(() => ws.removeEventListener("message", listener), 15000);
        } catch (e) {
          callbacks?.onError?.(e);
        }
      },

      syncArticles: async (type = null, callbacks) => {
        try {
          const params: Record<string, unknown> = {
            page: 1,
            limit: 50,
            sort_by: "created_at",
            sort_dir: "desc",
          };
          if (type) params.article_type = type;

          const response = await api.get("/api/articles", { params });
          const articles = response.data?.result?.articles;

          if (articles && Array.isArray(articles)) {
            const entries: Record<string, ArticleGeneration> = {};
            const current = get().generations;

            articles.forEach((item: ArticleGeneration) => {
              const existing = current[item.id];
              entries[item.id] = {
                id: item.id,
                status: item.status,
                content: item.content || existing?.content,
                title: item.title,
                topics: item.topics || [],
                images:
                  item.images && item.images.length > 0
                    ? item.images
                    : existing?.images || [],
                references:
                  item.references && item.references.length > 0
                    ? item.references
                    : existing?.references || [],
                article_type_name: item.article_type_name,
                created_at: item.created_at,
                modified_at: item.modified_at,
                active: item.active,
              };
            });

            set((s) => {
              const inFlight: Record<string, ArticleGeneration> = {};
              for (const [id, gen] of Object.entries(s.generations)) {
                const status = (gen.status || "").toLowerCase();
                if (["pending", "in_progress", "processing"].includes(status) && !entries[id]) {
                  inFlight[id] = gen;
                }
              }
              return { generations: { ...s.generations, ...inFlight, ...entries } };
            });

            callbacks?.onSuccess?.(Object.values(entries));
          }
        } catch (error) {
          console.error("Failed to sync articles", error);
          callbacks?.onError?.(error);
        }
      },

      fetchArticle: async (id, callbacks) => {
        try {
          const response = await api.get(`/api/articles/${id}`);
          const article = response.data?.result || response.data;

          if (article?.id) {
            set((s) => {
              const existing = s.generations[article.id];
              const merged = {
                ...(existing || {}),
                ...article,
                status: article.status || "done",
              };
              if (
                (!merged.images || merged.images.length === 0) &&
                existing?.images?.length
              ) {
                merged.images = existing.images;
              }
              return {
                generations: {
                  ...s.generations,
                  [article.id]: merged,
                },
              };
            });
            callbacks?.onSuccess?.(article);
          } else {
            throw new Error("Article not found");
          }
        } catch (error) {
          callbacks?.onError?.(error);
        }
      },

      saveArticle: async (id, content, callbacks) => {
        try {
          const response = await api.patch(`/api/articles/${id}`, { content });
          if (response.data) {
            const result = response.data?.result || response.data;
            const modified_at = result?.modified_at || result?.updated_at || new Date().toISOString();
            set((s) => ({
              generations: {
                ...s.generations,
                [id]: { ...(s.generations[id] || {}), content, modified_at },
              },
            }));
            callbacks?.onSuccess?.(response.data);
          }
        } catch (error) {
          callbacks?.onError?.(error);
        }
      },

      removeArticle: (id) => {
        set((s) => {
          const next = { ...s.generations };
          delete next[id];
          return { generations: next };
        });
      },

      removeArticleImage: (articleId, imageUrl) => {
        set((s) => {
          const gen = s.generations[articleId];
          if (!gen?.images?.length) return s;
          const filtered = gen.images.filter((img) => img.url !== imageUrl);
          if (filtered.length === gen.images.length) return s;
          return {
            generations: {
              ...s.generations,
              [articleId]: { ...gen, images: filtered },
            },
          };
        });
      },

      collectionVersion: 0,
      triggerCollectionUpdate: () =>
        set((s) => ({ collectionVersion: s.collectionVersion + 1 })),

      setArticleDraft: (id, content) =>
        set((s) => ({
          articleDraft: { ...s.articleDraft, [id]: content },
        })),
      clearArticleDraft: (id) =>
        set((s) => {
          const next = { ...s.articleDraft };
          delete next[id];
          return { articleDraft: next };
        }),
    }),
    {
      name: ARTICLE_STORE_KEY,
      storage: createJSONStorage(() =>
        createSafeStorage(
          typeof localStorage !== "undefined" ? localStorage : ({} as Storage),
        ),
      ),
      partialize: (state) => {
        const gens = state.generations;
        const entries = Object.values(gens)
          .sort((a, b) => {
            const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tB - tA;
          })
          .slice(0, MAX_PERSISTED_GENERATIONS)
          .map((g) => ({
            id: g.id,
            status: g.status,
            title: g.title,
            topics: g.topics,
            article_type_name: g.article_type_name,
            created_at: g.created_at,
            active: g.active,
            // Omit content, images, references to avoid quota
          }));

        const generationMap: Record<string, ArticleGeneration> = {};
        entries.forEach((g) => {
          generationMap[g.id] = g as ArticleGeneration;
        });

        const draftEntries = Object.entries(state.articleDraft).slice(
          0,
          MAX_PERSISTED_DRAFTS,
        );
        const articleDraft = Object.fromEntries(draftEntries);

        return {
          generations: generationMap,
          articleDraft,
        } as unknown as ArticleState;
      },
    },
  ),
);
