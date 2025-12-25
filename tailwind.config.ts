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
        background: "#FFFFFF",
        foreground: "#1a1a1a",
        muted: {
          DEFAULT: "#737373",
          foreground: "#737373",
        },
        border: "rgba(0, 0, 0, 0.06)",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1a1a1a",
        },
        primary: {
          DEFAULT: "#3b82f6",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#FAFAFA",
          foreground: "#1a1a1a",
        },
        accent: {
          DEFAULT: "#06b6d4",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia"],
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)",
        button: "0 2px 8px rgba(59, 130, 246, 0.2)",
        card: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)",
      },
      borderRadius: {
        card: "16px",
        button: "12px",
      },
    },
  },
  plugins: [],
};

export default config;

