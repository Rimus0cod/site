import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ManagedBookingAccess {
  bookingId: string;
  token: string;
  savedAt: string;
}

interface ClientPortalState {
  recentAccess: ManagedBookingAccess[];
  saveAccess: (payload: { bookingId: string; token: string }) => void;
  removeAccess: (bookingId: string) => void;
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
    }),
    {
      name: "barberbook-client-portal",
    },
  ),
);
