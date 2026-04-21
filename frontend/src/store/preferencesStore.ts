import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppLanguage = "uk" | "en";
export type AppTheme = "light" | "dark";

interface PreferencesState {
  language: AppLanguage;
  theme: AppTheme;
  setLanguage: (language: AppLanguage) => void;
  toggleLanguage: () => void;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      language: "uk",
      theme: "light",
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set({ language: get().language === "uk" ? "en" : "uk" }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
    }),
    {
      name: "barberbook-preferences",
    },
  ),
);
