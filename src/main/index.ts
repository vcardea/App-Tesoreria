import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { spawn, ChildProcess, exec } from "child_process";
import path from "path";
import fs from "fs";
import {
  initDB,
  closeDB,
  getSituazioneGlobale,
  getMembri,
  addMembro,
  deleteMembro,
  createAcquisto,
  getAcquisti,
  getQuoteAcquisto,
  updateQuota,
  setAcquistoCompletato,
  addMovimentoFondo,
  getMovimentiFondo,
  getBackupsList,
  restoreBackup,
  openBackupFolder,
} from "./db";
import { parseBankStatement } from "./pdf_parser";
import { logSystem, openSystemLog } from "./logger";

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

let win: BrowserWindow | null = null;
let splash: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;

const iconPath = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.cwd(), "public/icon.png")
  : path.join(__dirname, "../../dist/icon.png");

// --- MOTORE PYTHON ---
function startPythonEngine() {
  // Se esiste già e non è morto, non fare nulla
  if (pythonProcess && !pythonProcess.killed) return;

  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  const rootDir = process.cwd();

  const pythonExe = isDev
    ? path.join(rootDir, "python_engine", "venv", "Scripts", "python.exe")
    : path.join(process.resourcesPath, "python_engine", "python.exe");

  const mainPy = isDev
    ? path.join(rootDir, "python_engine", "main.py")
    : path.join(process.resourcesPath, "python_engine", "main.py");

  if (!fs.existsSync(pythonExe) || !fs.existsSync(mainPy)) return;

  pythonProcess = spawn(
    pythonExe,
    [
      "-u",
      "-m",
      "uvicorn",
      "main:app",
      "--host",
      "127.0.0.1",
      "--port",
      "8000",
    ],
    {
      cwd: path.dirname(mainPy),
      windowsHide: true,
    }
  );

  // Log essenziali
  pythonProcess.stdout?.on("data", (d) => {
    if (d.toString().trim()) logSystem("INFO", `[PY]: ${d.toString().trim()}`);
  });
  pythonProcess.stderr?.on("data", (d) => {
    const m = d.toString().trim();
    if (m && !m.includes("INFO:")) logSystem("ERROR", `[PY]: ${m}`);
  });
}

function killPythonByType() {
  if (pythonProcess) {
    if (process.platform === "win32") {
      // Tenta uccisione silenziosa, se fallisce amen
      try {
        exec(`taskkill /F /T /PID ${pythonProcess.pid}`);
      } catch (e) {}
    } else {
      pythonProcess.kill();
    }
    pythonProcess = null;
  }
}

function getPreloadPath() {
  const p = path.join(
    __dirname,
    process.env.VITE_DEV_SERVER_URL ? "preload.js" : "../preload/preload.js"
  );
  return fs.existsSync(p)
    ? p
    : path.resolve(
        __dirname,
        process.env.VITE_DEV_SERVER_URL ? "../preload/preload.js" : "preload.js"
      );
}

function updateSplash(percent: number, text: string) {
  if (splash && !splash.isDestroyed())
    splash.webContents.executeJavaScript(
      `window.updateProgress(${percent}, "${text}")`
    );
}

function createSplashWindow() {
  splash = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    center: true,
    backgroundColor: "#0f172a",
    icon: iconPath,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  const splashFile = process.env.VITE_DEV_SERVER_URL
    ? path.join(process.cwd(), "public/splash.html")
    : path.join(__dirname, "../../dist/splash.html");
  splash.loadFile(splashFile);
}

function setupApp() {
  startPythonEngine();
  updateSplash(30, "Database...");

  setTimeout(() => {
    if (!initDB()) {
      if (splash) splash.setAlwaysOnTop(false);
      dialog.showErrorBox("Errore", "Impossibile caricare il database.");
      app.quit();
    } else {
      updateSplash(80, "Interfaccia...");
      createMainWindow();
    }
  }, 1500);

  ipcMain.handle("log-ui-action", (e, msg) =>
    logSystem("ACTION", `[UI] ${msg}`)
  );
  ipcMain.handle("open-log-file", () => openSystemLog());

  ipcMain.handle("quit-app", () => {
    if (win) win.hide();
    updateSplash(50, "Chiusura...");
    closeDB();
    killPythonByType();
    setTimeout(() => app.quit(), 500);
  });

  ipcMain.handle("get-backups", () => getBackupsList());
  ipcMain.handle("open-backup-folder", () => openBackupFolder());

  // --- RESTORE BACKUP PULITO ---
  // Rimosso qualsiasi riferimento a forceKillPython o await complessi
  ipcMain.handle("restore-backup", (e, filename) => {
    logSystem("ACTION", `Restore richiesto: ${filename}`);

    // Esegue il restore a livello DB (chiude db, cancella file, copia backup)
    const success = restoreBackup(filename);

    if (success) {
      logSystem("INFO", "Restore completato. Riavvio forzato.");

      // Relaunch immediato
      app.relaunch();
      // Exit immediato (0 = successo). Non aspettiamo nulla.
      // Questo impedisce a qualsiasi altro codice di provare a cercare processi morti.
      app.exit(0);
    } else {
      logSystem("ERROR", "Restore fallito.");
    }
    return success;
  });

  // DB API
  ipcMain.handle("get-situazione", () => getSituazioneGlobale());
  ipcMain.handle("add-movimento-fondo", (e, d) =>
    addMovimentoFondo(d.importo, d.descrizione)
  );
  ipcMain.handle("get-movimenti-fondo", () => getMovimentiFondo());
  ipcMain.handle("get-membri", () => getMembri());
  ipcMain.handle("add-membro", (e, m) => addMembro(m));
  ipcMain.handle("delete-membro", (e, id) => deleteMembro(id));
  ipcMain.handle("create-acquisto", (e, d) => createAcquisto(d.nome, d.prezzo));
  ipcMain.handle("get-acquisti", () => getAcquisti());
  ipcMain.handle("get-quote", (e, id) => getQuoteAcquisto(id));
  ipcMain.handle("update-quota", (e, d) => updateQuota(d.id, d.qta, d.versato));
  ipcMain.handle("completa-acquisto", (e, id) => setAcquistoCompletato(id));
  ipcMain.handle("select-file", async () => {
    const res = await dialog.showOpenDialog(win!, {
      properties: ["openFile"],
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    return res.canceled ? null : res.filePaths[0];
  });
  ipcMain.handle("analyze-pdf", async (e, p) =>
    parseBankStatement(p, getMembri())
  );
}

function createMainWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: "#0f172a",
    icon: iconPath,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  if (process.env.VITE_DEV_SERVER_URL)
    win.loadURL(process.env.VITE_DEV_SERVER_URL + "src/renderer/index.html");
  else win.loadFile(path.join(__dirname, "../../dist/index.html"));
  win.once("ready-to-show", () => {
    updateSplash(100, "Pronto!");
    setTimeout(() => {
      if (splash) splash.close();
      if (win) win.show();
    }, 500);
  });
}

app.whenReady().then(() => {
  createSplashWindow();
  setTimeout(setupApp, 500);
});

// Importante: Rimuovere logica async/await qui per il restore.
// Lasciamo solo la pulizia base in uscita normale.
app.on("window-all-closed", () => {
  killPythonByType();
  if (process.platform !== "darwin") app.quit();
});
