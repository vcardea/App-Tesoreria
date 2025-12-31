import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "src/main/index.ts",
        vite: {
          build: {
            outDir: "dist-electron/main",
            rollupOptions: {
              // QUI IL TRUCCO: Lasciamo esterno SOLO better-sqlite3
              // pdf-parse verrà inglobato nel file finale, risolvendo l'errore "Cannot find module"
              external: ["better-sqlite3"],
            },
          },
        },
      },
      preload: {
        input: "src/main/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron/preload",
            rollupOptions: {
              external: ["better-sqlite3"],
            },
          },
        },
      },
      renderer: {},
    }),
  ],
});
