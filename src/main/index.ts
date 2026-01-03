import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import {
  initDB,
  closeDB,
  getSituazioneGlobale,
  getMembri,
  addMembro,
  updateMembro,
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
  updateAcquisto,
  deleteAcquisto,
} from "./db";
import { parseBankStatement, parseMembersList } from "./excel_parser"; // Nuovo import
import { logSystem, openSystemLog } from "./logger";

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
  logSystem("INFO", "--- STARTUP ---");
  updateSplash(30, "Inizializzazione Database...");

  setTimeout(() => {
    if (!initDB()) {
      if (splash) splash.setAlwaysOnTop(false);
      dialog.showErrorBox("Errore", "Impossibile caricare il database.");
      app.quit();
    } else {
      updateSplash(100, "Pronto!");
      createMainWindow();
    }
  }, 1000);

  // Handlers
  ipcMain.handle("log-ui-action", (e, msg) =>
    logSystem("ACTION", `[UI] ${msg}`)
  );
  ipcMain.handle("open-log-file", () => openSystemLog());
  ipcMain.handle("quit-app", () => {
    if (win) win.hide();
    updateSplash(50, "Salvataggio...");
    closeDB();
    setTimeout(() => app.quit(), 500);
  });
  ipcMain.handle("get-backups", () => getBackupsList());
  ipcMain.handle("open-backup-folder", () => openBackupFolder());
  ipcMain.handle("restore-backup", (e, filename) => {
    logSystem("ACTION", `Restore richiesto: ${filename}`);
    const success = restoreBackup(filename);
    if (success) {
      logSystem("INFO", "Restore riuscito, riavvio.");
      app.relaunch();
      app.exit(0);
    } else {
      logSystem("ERROR", "Restore fallito (check log)");
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
  ipcMain.handle("update-membro", (e, d) => updateMembro(d.id, d.membro));
  ipcMain.handle("delete-membro", (e, id) => deleteMembro(id));

  // ACQUISTI UPDATED
  ipcMain.handle("create-acquisto", (e, d) =>
    createAcquisto(d.nome, d.prezzo, d.acconto)
  );
  ipcMain.handle("update-acquisto", (e, d) =>
    updateAcquisto(d.id, d.nome, d.prezzo, d.acconto)
  );
  ipcMain.handle("delete-acquisto", (e, id) => deleteAcquisto(id));
  ipcMain.handle("get-acquisti", () => getAcquisti());
  ipcMain.handle("get-quote", (e, id) => getQuoteAcquisto(id));
  ipcMain.handle("update-quota", (e, d) => updateQuota(d.id, d.qta, d.versato));
  ipcMain.handle("completa-acquisto", (e, id) => setAcquistoCompletato(id));

  // File Handlers
  ipcMain.handle("select-file", async () => {
    const res = await dialog.showOpenDialog(win!, {
      properties: ["openFile"],
      filters: [{ name: "Excel/CSV", extensions: ["xlsx", "xls", "csv"] }],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle("analyze-excel-bank", async (e, p) =>
    parseBankStatement(p, getMembri())
  );

  ipcMain.handle("import-membri-excel", async (e, p) => {
    logSystem("INFO", `Importazione membri da: ${p}`);
    const members = await parseMembersList(p);
    let count = 0;
    for (const m of members) {
      const res = addMembro(m);
      if (res.changes > 0) count++;
    }
    return count;
  });
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
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
