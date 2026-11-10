import { defineConfig } from "vitest/config";
import path from "path";
export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});
