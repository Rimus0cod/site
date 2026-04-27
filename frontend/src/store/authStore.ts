import { create } from "zustand";
import type { AdminUser } from "../lib/types";

interface AuthStoreState {
  admin: AdminUser | null;
  setSession: (payload: { admin: AdminUser }) => void;
  setAdmin: (admin: AdminUser) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  admin: null,
  setSession: ({ admin }) => set({ admin }),
  setAdmin: (admin) => set((state) => ({ ...state, admin })),
  clearSession: () => set({ admin: null }),
}));
