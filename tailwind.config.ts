import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#fdf8ec",
          100: "#faedc8",
          200: "#f5dc92",
          300: "#efc759",
          400: "#e7b134",
          500: "#d39520",
          600: "#b6741b",
          700: "#92541b",
          800: "#79431d",
          900: "#67381d",
        },
        cream: {
          50: "#fbf8f1",
          100: "#f3ecdb",
          200: "#e7d8b6",
          300: "#d6bd86",
        },
        ink: {
          900: "#0c0a07",
          800: "#161310",
          700: "#211c17",
          600: "#3a3127",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia"],
        arabic: ["var(--font-arabic)", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        gold: "0 10px 40px -10px rgba(211, 149, 32, 0.45)",
      },
      backgroundImage: {
        "luxury-gradient":
          "radial-gradient(circle at 20% 20%, rgba(231, 177, 52, 0.10), transparent 45%), radial-gradient(circle at 80% 0%, rgba(231, 177, 52, 0.08), transparent 35%), linear-gradient(180deg, #0c0a07 0%, #161310 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
