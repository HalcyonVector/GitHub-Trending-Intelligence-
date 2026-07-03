import type { Config } from "tailwindcss";

/**
 * Styling for this app lives primarily in globals.css as CSS-variable-driven
 * editorial component classes (dusk/paper themes). Tailwind is kept for layout
 * utilities and font-family bindings to the next/font CSS variables.
 */
const config: Config = {
  darkMode: ["selector", '[data-theme="dusk"]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        fg: "var(--fg)",
        dim: "var(--dim)",
        ember: "var(--ember)",
        rule: "var(--rule)",
        gain: "var(--gain)",
        loss: "var(--loss)",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
