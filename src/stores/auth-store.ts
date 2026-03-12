"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import api from "@/lib/api";
import { useArticleStore } from "@/stores/article-store";
import type {
  User,
  LoginPayload,
  RegisterPayload,
  AuthResponse,
} from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasFetched: boolean;
  _hasHydrated: boolean;
  fetchUser: () => Promise<void>;
  refetchUser: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      hasFetched: false,
      _hasHydrated: false,

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      fetchUser: async () => {
        if (get().hasFetched) {
          return;
        }

        set({ isLoading: true });

        try {
          const res = await api.get("/api/users");
          set({
            user: res.data.result || res.data.data || res.data.user || res.data,
            isAuthenticated: true,
            isLoading: false,
            hasFetched: true,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            hasFetched: true,
          });
        }
      },

      refetchUser: async () => {
        set({ hasFetched: false, isLoading: true });

        try {
          const res = await api.get("/api/users");
          set({
            user: res.data.result || res.data.data || res.data.user || res.data,
            isAuthenticated: true,
            isLoading: false,
            hasFetched: true,
          });
        } catch {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            hasFetched: true,
          });
        }
      },

      login: async (payload: LoginPayload) => {
        const res = await api.post("/api/auth/login", payload);
        const data: AuthResponse = res.data;

        if (data.requires_2fa) {
          return data;
        }

        useArticleStore.getState().disconnectSocket();
        useArticleStore.setState({ generations: {}, articleDraft: {} });
        Cookies.set("access_token", data.key!.access_token, {
          path: "/",
          expires: 1,
          sameSite: "lax",
        });

        set({
          user: data.user || null,
          isAuthenticated: true,
          isLoading: false,
          hasFetched: true,
        });
        return data;
      },

      register: async (payload: RegisterPayload) => {
        const res = await api.post("/api/auth/register", payload);
        const data: AuthResponse = res.data;
        useArticleStore.getState().disconnectSocket();
        useArticleStore.setState({ generations: {}, articleDraft: {} });
        Cookies.set("access_token", data.key!.access_token, {
          path: "/",
          expires: 1,
          sameSite: "lax",
        });

        set({
          user: data.user || null,
          isAuthenticated: true,
          isLoading: false,
          hasFetched: true,
        });
        return data;
      },

      logout: async () => {
        try {
          await api.post("/api/auth/logout");
        } catch {
          // Still clear local state and cookies even if backend call fails
        } finally {
          Cookies.remove("access_token", { path: "/", sameSite: "lax" });
          Cookies.remove("refresh_token", { path: "/", sameSite: "lax" });
          if (typeof window !== "undefined") {
            const keysToKeep = ["erza-theme"];
            const allKeys = Object.keys(localStorage);
            for (const key of allKeys) {
              if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
              }
            }
          }
          set({
            user: null,
            isAuthenticated: false,
            hasFetched: false,
          });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
