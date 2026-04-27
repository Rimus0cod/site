import { createJSONStorage, type StateStorage } from "zustand/middleware";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const sessionTokenStorage = createJSONStorage(() =>
  typeof window === "undefined" ? noopStorage : window.sessionStorage,
);
