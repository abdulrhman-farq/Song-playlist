import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FAF5EC",
        ivory: "#F4ECDF",
        ivoryDeep: "#EBE0CE",
        champagne: "#E5D5BC",
        champagne2: "#D9C5A5",
        peachSoft: "#F2D4BE",
        peach: "#E9B89A",
        peachDeep: "#D89274",
        rose: "#C97B5B",
        blush: "#F6DDCB",
        ink: "#3A2C20",
        brown: "#6B4A35",
        brownSoft: "#8C6A4F",
        taupe: "#A38A72",
        gold: "#B8956A",
        goldDeep: "#957251",
        goldSoft: "#D9BE96",
      },
      fontFamily: {
        italiana: ["Italiana", "serif"],
        cinzel: ["Cinzel", "serif"],
        cormorant: ['"Cormorant Garamond"', "serif"],
        amiri: ["Amiri", "serif"],
        markazi: ['"Markazi Text"', "Amiri", "serif"],
      },
      // Spacing scale — aligns with --space-* tokens.
      // Tailwind's defaults (1=4, 2=8, 3=12, 4=16, 6=24, 8=32, 12=48)
      // already match this scale, but we declare it explicitly so the
      // tokens stay the single source of truth.
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        12: "var(--space-12)",
      },
    },
  },
  plugins: [],
};

export default config;
