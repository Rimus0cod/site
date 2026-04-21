import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AdminUser } from "../lib/types";

interface AuthStoreState {
  accessToken: string | null;
  admin: AdminUser | null;
  setSession: (payload: { accessToken: string; admin: AdminUser }) => void;
  setAdmin: (admin: AdminUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      accessToken: null,
      admin: null,
      setSession: ({ accessToken, admin }) => set({ accessToken, admin }),
      setAdmin: (admin) => set((state) => ({ ...state, admin })),
      clearSession: () => set({ accessToken: null, admin: null }),
    }),
    {
      name: "barberbook-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
