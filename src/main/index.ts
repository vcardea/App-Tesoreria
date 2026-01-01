import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
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
import { logSystem } from "./logger";

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

let win: BrowserWindow | null = null;
let splash: BrowserWindow | null = null;
const iconPath = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.cwd(), "public/icon.png")
  : path.join(__dirname, "../../dist/icon.png");

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
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
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
  logSystem("INFO", "--- APPLICAZIONE AVVIATA ---");
  updateSplash(30, "Verifica Backup & Database...");
  setTimeout(() => {
    if (!initDB()) {
      logSystem("ERROR", "InitDB fallito");
      dialog.showErrorBox("Errore", "Impossibile inizializzare il database.");
      app.quit();
    } else {
      updateSplash(60, "Caricamento Interfaccia...");
      createMainWindow();
    }
  }, 1000);

  // --- HANDLERS CON LOGGING ---
  ipcMain.handle("log-ui-action", (e, msg) =>
    logSystem("ACTION", `[UI] ${msg}`)
  );

  ipcMain.handle("quit-app", () => {
    logSystem("INFO", "Richiesta chiusura app");
    if (win) win.hide();
    if (!splash || splash.isDestroyed()) createSplashWindow();
    else splash.show();
    updateSplash(50, "Salvataggio dati in corso...");
    setTimeout(() => {
      updateSplash(90, "Chiusura connessioni...");
      closeDB();
      setTimeout(() => app.quit(), 1000);
    }, 1000);
  });

  ipcMain.handle("get-backups", () => getBackupsList());
  ipcMain.handle("open-backup-folder", () => openBackupFolder());

  ipcMain.handle("restore-backup", (e, filename) => {
    logSystem("ACTION", `Tentativo ripristino backup: ${filename}`);
    if (restoreBackup(filename)) {
      logSystem("INFO", "Ripristino riuscito, riavvio app...");
      app.relaunch();
      app.exit(0);
    } else {
      logSystem("ERROR", "Ripristino fallito");
    }
    return false;
  });

  // DB Handlers
  ipcMain.handle("get-situazione", () => getSituazioneGlobale());
  ipcMain.handle("add-movimento-fondo", (e, d) =>
    addMovimentoFondo(d.importo, d.descrizione)
  );
  ipcMain.handle("get-movimenti-fondo", () => getMovimentiFondo());
  ipcMain.handle("get-membri", () => getMembri());
  ipcMain.handle("add-membro", (e, m) => addMembro(m));
  ipcMain.handle("delete-membro", (e, id) => deleteMembro(id));
  ipcMain.handle("create-acquisto", (e, d) => createAcquisto(d.nome, d.prezzo));
  ipcMain.handle("get-acquisti", (e, a) => getAcquisti(a));
  ipcMain.handle("get-quote", (e, id) => getQuoteAcquisto(id));
  ipcMain.handle("update-quota", (e, d) => updateQuota(d.id, d.qta, d.versato));
  ipcMain.handle("completa-acquisto", (e, id) => setAcquistoCompletato(id));

  ipcMain.handle("select-file", async () => {
    const res = await dialog.showOpenDialog(win!, {
      properties: ["openFile"],
      filters: [{ name: "Estratto Conto PDF", extensions: ["pdf"] }],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle("analyze-pdf", async (e, p) => {
    logSystem("INFO", `Analisi PDF richiesta: ${p}`);
    try {
      return await parseBankStatement(p, getMembri());
    } catch (err: any) {
      logSystem("ERROR", "Errore parsing PDF", err.message);
      throw err;
    }
  });
}

function createMainWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#0f172a",
    show: false,
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
  setTimeout(() => {
    updateSplash(10, "Avvio sistema...");
    setupApp();
  }, 500);
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
