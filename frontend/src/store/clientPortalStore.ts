import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sessionTokenStorage } from "./sessionTokenStorage";

interface ManagedBookingAccess {
  bookingId: string;
  token: string;
  savedAt: string;
}

interface ClientPortalState {
  recentAccess: ManagedBookingAccess[];
  saveAccess: (payload: { bookingId: string; token: string }) => void;
  removeAccess: (bookingId: string) => void;
  getAccessToken: (bookingId: string) => string | undefined;
}

export const useClientPortalStore = create<ClientPortalState>()(
  persist(
    (set, get) => ({
      recentAccess: [],
      saveAccess: ({ bookingId, token }) => {
        const next = [
          { bookingId, token, savedAt: new Date().toISOString() },
          ...get().recentAccess.filter((item) => item.bookingId !== bookingId),
        ].slice(0, 3);

        set({ recentAccess: next });
      },
      removeAccess: (bookingId) =>
        set({
          recentAccess: get().recentAccess.filter((item) => item.bookingId !== bookingId),
        }),
      getAccessToken: (bookingId) =>
        get().recentAccess.find((item) => item.bookingId === bookingId)?.token,
    }),
    {
      name: "barberbook-client-portal",
      storage: sessionTokenStorage,
    },
  ),
);
