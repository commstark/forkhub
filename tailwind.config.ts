import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        fadeOut: {
          "0%":   { opacity: "1" },
          "70%":  { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-out": "fadeOut 1.5s ease-in-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
