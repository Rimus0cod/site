import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "rgb(var(--color-ink) / <alpha-value>)",
          sand: "rgb(var(--color-sand) / <alpha-value>)",
          clay: "rgb(var(--color-clay) / <alpha-value>)",
          olive: "rgb(var(--color-olive) / <alpha-value>)",
          cream: "rgb(var(--color-cream) / <alpha-value>)",
          panel: "rgb(var(--color-panel) / <alpha-value>)",
          line: "rgb(var(--color-line) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        body: ['"Manrope"', '"Segoe UI"', "sans-serif"],
      },
      boxShadow: {
        card: "0 24px 60px rgba(15, 16, 20, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
