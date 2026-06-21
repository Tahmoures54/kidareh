/**
 * Vitest Configuration - Unit Testing
 * @version 2.0.0
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@pages": path.resolve(__dirname, "./src/pages"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@context": path.resolve(__dirname, "./src/context"),
      "@data": path.resolve(__dirname, "./src/data"),
    },
  },

  test: {
    /* ================================================================
       Basic Configuration
       ================================================================ */
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "build"],

    /* ================================================================
       Performance
       ================================================================ */
    threads: true,
    isolate: true,
    bail: 1,
    restoreMocks: true,

    /* ================================================================
       Coverage Configuration
       ================================================================ */
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      lines: 50,
      functions: 50,
      branches: 50,
      statements: 50,
      exclude: [
        "node_modules/",
        "src/test/",
        "dist/",
        "**/*.d.ts",
        "**/index.ts",
        "**/*.config.ts"
      ],
    },

    /* ================================================================
       Timeout Configuration
       ================================================================ */
    testTimeout: 10000,
  },
});