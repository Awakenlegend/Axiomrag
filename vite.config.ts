import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: `${rootDir}/client`,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": `${rootDir}/client/src`,
      "@shared": `${rootDir}/shared`,
    },
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
});
