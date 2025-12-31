
import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // Ora il percorso è semplice e diretto
        entry: 'src/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main', // Output esplicito
            rollupOptions: {
                output: { entryFileNames: 'index.js' }
            }
          }
        }
      },
      preload: {
        input: 'src/main/preload.ts',
        vite: {
            build: {
                outDir: 'dist-electron/preload',
                rollupOptions: {
                    output: { entryFileNames: 'preload.js' }
                }
            }
        }
      },
      renderer: {},
    }),
  ],
  // NON CAMBIAMO LA ROOT. Rimaniamo nella cartella base.
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
        // Diciamo a Vite dove trovare l'HTML
        input: 'src/renderer/index.html',
    }
  }
})
