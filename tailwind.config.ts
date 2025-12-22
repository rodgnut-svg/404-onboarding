import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f9f9f9",
        foreground: "#111111",
        muted: {
          DEFAULT: "#6B6B6B",
          foreground: "#6B6B6B",
        },
        border: "rgba(17,17,17,0.08)",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#111111",
        },
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "transparent",
          foreground: "#111111",
        },
        accent: {
          DEFAULT: "#0EA5E9",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia"],
      },
      boxShadow: {
        subtle: "0 2px 12px rgba(0, 0, 0, 0.05)",
        button: "0 2px 8px rgba(37, 99, 235, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;

