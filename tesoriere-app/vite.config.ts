import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Entry point del backend
        entry: "src/main/index.ts",
      },
      preload: {
        // Entry point del preload
        input: "src/main/preload.ts",
      },
      renderer: {},
    }),
  ],
  // QUESTA È LA RIGA FONDAMENTALE CHE MANCAVA:
  root: "src/renderer",

  build: {
    outDir: "../../dist", // Diciamo alla build di uscire dalla cartella renderer
    emptyOutDir: true,
  },
});
