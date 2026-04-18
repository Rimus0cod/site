import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#12100d",
          sand: "#efe3d2",
          clay: "#cb8f54",
          olive: "#576246",
          cream: "#fff8ef",
        },
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["Trebuchet MS", "Verdana", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 40px rgba(18, 16, 13, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;

