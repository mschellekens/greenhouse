import type { Config } from "tailwindcss";

// Brand palette (spec section 2). Darker "-ink" variants are used only where
// small text needs WCAG AA contrast on ivory; the brand hexes stay the source.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: { DEFAULT: "#F7F6F0", 50: "#FBFAF6" },
        forest: { DEFAULT: "#23382F", 700: "#2E4A3E", 600: "#3A5A4C" },
        sage: { DEFAULT: "#829985", 100: "#E6ECE5", 200: "#CCD7CC", ink: "#5B6E5E" },
        leaf: { DEFAULT: "#5E9070", ink: "#4A7A5C" },
        ochre: { DEFAULT: "#D9AF69", ink: "#87652A" },
        terracotta: { DEFAULT: "#C97862", ink: "#A65A45", 100: "#F3E1DA" },
        stone: { DEFAULT: "#ECEDE5", 300: "#DCDED3" },
        muted: { DEFAULT: "#788077", strong: "#646B63" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
