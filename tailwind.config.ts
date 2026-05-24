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
    },
  },
  plugins: [],
};

export default config;
