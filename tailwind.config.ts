import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: "#1F3A2E", 700: "#2A4A3B", 600: "#355C49" },
        sage: { DEFAULT: "#8FA98A", 200: "#D5E0D0", 100: "#E8EFE4" },
        cream: { DEFAULT: "#F6F1E7", 50: "#FBF8F2", 200: "#EDE5D6" },
        clay: { DEFAULT: "#C46A4A", 200: "#F0D3C6" },
        ochre: { DEFAULT: "#D4A04C" },
        ink: { DEFAULT: "#1B1F1C", 500: "#5B635D", 400: "#848C86" },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
export default config;
