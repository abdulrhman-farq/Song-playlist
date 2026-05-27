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
          gold: "rgba(216, 146, 116, 0.35)",
          peach: "rgba(216, 146, 116, 0.35)",
        },
        // Single monochrome accent — peach pulled from the bride's
        // logo. `gold.*` kept as alias so older Tailwind utility
        // classes (`bg-gold-400`, etc.) still paint correctly.
        gold: {
          50: "#fde6d4",
          100: "#fde6d4",
          200: "#f7d6c0",
          300: "#ecb89a",
          400: "#d89274",
          500: "#b06b4a",
          600: "#8e5538",
          700: "#5c3623",
        },
        peach: {
          100: "#fde6d4",
          200: "#f7d6c0",
          300: "#ecb89a",
          400: "#d89274",
          500: "#b06b4a",
          600: "#8e5538",
          glow: "rgba(216, 146, 116, 0.28)",
        },
        // Emerald aliased to deep peach so any leftover utility
        // classes don't introduce a foreign hue.
        emerald: {
          accent: "#b06b4a",
          glow: "rgba(216, 146, 116, 0.14)",
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
        gold: "0 18px 40px -16px rgba(216,146,116,0.45)",
        peach: "0 18px 40px -16px rgba(216,146,116,0.45)",
      },
      backgroundImage: {
        "hero-warm":
          "radial-gradient(ellipse at 0% 0%, rgba(216,146,116,0.22), transparent 55%), radial-gradient(ellipse at 100% 0%, rgba(216,146,116,0.12), transparent 60%), linear-gradient(180deg, #242424 0%, #121212 70%)",
        "app-vignette":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(216,146,116,0.08), transparent 60%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(216,146,116,0.06), transparent 60%), linear-gradient(180deg, #050505 0%, #0a0a0a 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
