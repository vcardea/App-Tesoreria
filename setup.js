const fs = require('fs');
const path = require('path');

console.log("🚀 INIZIO SETUP AUTOMATICO...");

const createFile = (filePath, content) => {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content.trim());
    console.log(`✅ Creato: ${filePath}`);
};

// 1. VITE CONFIG
createFile('vite.config.ts', `
import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: { entry: 'src/main/index.ts' },
      preload: { input: 'src/main/preload.ts' },
      renderer: {},
    }),
  ],
  root: 'src/renderer',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: { '@shared': path.join(__dirname, 'src/shared') }
  }
})
`);

// 2. TYPESCRIPT CONFIG
createFile('tsconfig.json', `
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": false,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@shared/*": ["src/shared/*"] }
  },
  "include": ["src"]
}
`);

// 3. TAILWIND
createFile('tailwind.config.js', `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/index.html", "./src/renderer/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
`);
createFile('postcss.config.js', `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }`);

// 4. BACKEND (ELECTRON)
createFile('src/main/index.ts', `
import { app, BrowserWindow } from 'electron';
import path from 'path';

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
`);

createFile('src/main/preload.ts', `
import { contextBridge } from 'electron';
contextBridge.exposeInMainWorld('api', { status: 'ok' });
`);

// 5. FRONTEND (REACT)
createFile('src/renderer/index.html', `
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <title>Cassiere App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
`);

createFile('src/renderer/main.tsx', `
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
`);

createFile('src/renderer/App.tsx', `
import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center p-10 bg-gray-800 rounded-xl shadow-xl border border-gray-700">
        <h1 className="text-4xl font-bold text-green-500 mb-4">Cassiere App</h1>
        <p className="text-xl">Sistema Operativo.</p>
        <p className="text-sm text-gray-400 mt-4">Node v22 + Electron + React + SQLite</p>
      </div>
    </div>
  );
}
export default App;
`);

createFile('src/renderer/index.css', `@tailwind base;\n@tailwind components;\n@tailwind utilities;`);
createFile('src/shared/types.ts', `export interface Test { status: string; }`);
createFile('db/schema.sql', `-- Schema DB`);

console.log("\n✅ TUTTO PRONTO. Esegui: npm run dev");
