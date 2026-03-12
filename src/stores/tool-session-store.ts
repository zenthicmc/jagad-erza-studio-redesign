import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ToolSession {
  tool: string;
  articleId?: string;
  inputText: string;
  outputText: string;
  writingStyle?: string;
  language?: string;
  createdAt: string;
}

interface ToolSessionState {
  sessions: Record<string, ToolSession>;
  setSession: (tool: string, session: Omit<ToolSession, "tool">) => void;
  clearSession: (tool: string) => void;
}

export const useToolSessionStore = create<ToolSessionState>()(
  persist(
    (set) => ({
      sessions: {},
      setSession: (tool, session) =>
        set((state) => ({
          sessions: {
            ...state.sessions,
            [tool]: { ...session, tool },
          },
        })),
      clearSession: (tool) =>
        set((state) => {
          const next = { ...state.sessions };
          delete next[tool];
          return { sessions: next };
        }),
    }),
    {
      name: "tool-session-store",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

