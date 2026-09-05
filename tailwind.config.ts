import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
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
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        muted: "var(--muted)",
        border: "var(--border)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sarabun)",
          "var(--font-geist)",
          "var(--font-noto-sans-thai)",
          '"Sarabun"',
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
      borderRadius: {
        lg: "0.9rem",
        md: "0.65rem",
        sm: "0.45rem",
      },
    },
  },
  plugins: [],
};

export default config;
