import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#14352A",
          light: "#1E4A3A",
          mist: "#E9F0EA",
        },
        brass: {
          DEFAULT: "#B08A3E",
          soft: "#D9C08A",
        },
        ink: "#22282C",
        paper: "#FFFFFF",
      },
      fontFamily: {
        sans: [
          "var(--font-noto-sans-thai)",
          '"Noto Sans Thai"',
          '"Leelawadee UI"',
          "Tahoma",
          "system-ui",
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
