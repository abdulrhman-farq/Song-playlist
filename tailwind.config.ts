import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#050505",
          deep: "#0a0a0a",
          panel: "#121212",
          surface: "#181818",
          raised: "#242424",
          hover: "#2a2a2a",
        },
        line: {
          subtle: "rgba(255, 255, 255, 0.06)",
          soft: "rgba(255, 255, 255, 0.10)",
          gold: "rgba(212, 175, 55, 0.35)",
        },
        gold: {
          50: "#fdf6dd",
          100: "#f8e6a8",
          200: "#eed172",
          300: "#e2bb42",
          400: "#d4af37",
          500: "#b8941d",
          600: "#94730f",
          700: "#735809",
        },
        emerald: {
          accent: "#22c55e",
          glow: "rgba(34, 197, 94, 0.18)",
        },
        ink: {
          50: "#fafafa",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
        },
      },
      fontFamily: {
        display: ["var(--font-cormorant)", '"Cormorant Garamond"', "Georgia", "serif"],
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        arabic: ["var(--font-tajawal)", '"Tajawal"', '"Markazi Text"', "sans-serif"],
        cinzel: ["var(--font-cinzel)", "Cinzel", "serif"],
        italiana: ["var(--font-italiana)", "Italiana", "serif"],
        amiri: ["var(--font-amiri)", "Amiri", "serif"],
        markazi: ["var(--font-markazi)", '"Markazi Text"', "serif"],
      },
      boxShadow: {
        card: "0 10px 30px -10px rgba(0,0,0,0.7)",
        gold: "0 18px 40px -16px rgba(212,175,55,0.45)",
      },
      backgroundImage: {
        "hero-warm":
          "radial-gradient(ellipse at 0% 0%, rgba(212,175,55,0.22), transparent 55%), radial-gradient(ellipse at 100% 0%, rgba(34,197,94,0.10), transparent 60%), linear-gradient(180deg, #242424 0%, #121212 70%)",
        "app-vignette":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,197,94,0.06), transparent 60%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(212,175,55,0.05), transparent 60%), linear-gradient(180deg, #050505 0%, #0a0a0a 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
