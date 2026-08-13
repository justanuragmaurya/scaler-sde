import { create } from "zustand";
import { api, getAccessToken, setAccessToken } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthState = {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  bootstrap: async () => {
    try {
      if (!getAccessToken()) {
        const data = await api.refresh();
        setAccessToken(data.access_token);
        set({ user: data.user, hydrated: true });
        return;
      }
      const user = await api.me();
      set({ user, hydrated: true });
    } catch {
      setAccessToken(null);
      set({ user: null, hydrated: true });
    }
  },
  logout: async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    set({ user: null });
  },
}));
