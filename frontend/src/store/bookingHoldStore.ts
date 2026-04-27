import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sessionTokenStorage } from "./sessionTokenStorage";

interface ManagedHoldAccess {
  holdId: string;
  token: string;
  savedAt: string;
}

interface BookingHoldStoreState {
  recentHoldAccess: ManagedHoldAccess[];
  saveHoldAccess: (payload: { holdId: string; token: string }) => void;
  removeHoldAccess: (holdId: string) => void;
  getHoldToken: (holdId: string) => string | undefined;
}

export const useBookingHoldStore = create<BookingHoldStoreState>()(
  persist(
    (set, get) => ({
      recentHoldAccess: [],
      saveHoldAccess: ({ holdId, token }) => {
        const next = [
          { holdId, token, savedAt: new Date().toISOString() },
          ...get().recentHoldAccess.filter((item) => item.holdId !== holdId),
        ].slice(0, 5);

        set({ recentHoldAccess: next });
      },
      removeHoldAccess: (holdId) =>
        set({
          recentHoldAccess: get().recentHoldAccess.filter((item) => item.holdId !== holdId),
        }),
      getHoldToken: (holdId) =>
        get().recentHoldAccess.find((item) => item.holdId === holdId)?.token,
    }),
    {
      name: "barberbook-hold-access",
      storage: sessionTokenStorage,
    },
  ),
);
