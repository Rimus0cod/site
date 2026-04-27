import { create } from "zustand";
import type { ClientUser } from "../lib/types";

interface ClientSessionState {
  client: ClientUser | null;
  setClient: (client: ClientUser) => void;
  clearClient: () => void;
}

export const useClientSessionStore = create<ClientSessionState>((set) => ({
  client: null,
  setClient: (client) => set({ client }),
  clearClient: () => set({ client: null }),
}));
