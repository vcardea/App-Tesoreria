import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import {
  initDB,
  closeDB,
  getSituazioneGlobale,
  getMembri,
  addMembro,
  updateMembro,
  deleteMembro,
  deleteAllMembri,
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
  toggleDashboardVisibility,
  deleteMovimentoFondo,
  triggerManualBackup,
  resetAnnualData, // <--- NUOVI IMPORT
} from "./db";
import { parseBankStatement, parseMembersList } from "./excel_parser";
import { logSystem, openSystemLog } from "./logger";

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
let win: BrowserWindow | null = null;
let splash: BrowserWindow | null = null;

const iconPath = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.cwd(), "public/icon.png")
  : path.join(__dirname, "../../dist/icon.png");

function createSplashWindow() {
  splash = new BrowserWindow({
    width: 450,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    icon: iconPath,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });
  const splashPath = process.env.VITE_DEV_SERVER_URL
    ? path.join(process.cwd(), "public/splash.html")
    : path.join(__dirname, "../../dist/splash.html");
  splash.loadFile(splashPath);
}

function showExitSplash() {
  if (splash && !splash.isDestroyed()) splash.show();
  else createSplashWindow();
  setTimeout(() => {
    if (splash && !splash.isDestroyed())
      splash.webContents
        .executeJavaScript(
          `if(window.updateProgress) window.updateProgress(100, "Salvataggio e Chiusura...")`,
        )
        .catch(() => {});
  }, 500);
}

async function setupApp() {
  createSplashWindow();
  await new Promise((r) => setTimeout(r, 500));
  if (splash && !splash.isDestroyed())
    splash.webContents
      .executeJavaScript(
        `if(window.updateProgress) window.updateProgress(20, "Connessione Database...")`,
      )
      .catch(() => {});
  if (!initDB()) {
    dialog.showErrorBox(
      "Errore Critico",
      "Impossibile inizializzare il Database.",
    );
    app.quit();
    return;
  }
  if (splash && !splash.isDestroyed())
    splash.webContents
      .executeJavaScript(
        `if(window.updateProgress) window.updateProgress(60, "Caricamento Interfaccia...")`,
      )
      .catch(() => {});
  createMainWindow();
}

function createMainWindow() {
  const preloadPath = path.join(__dirname, "../preload/preload.js");
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: "#0f172a",
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  if (process.env.VITE_DEV_SERVER_URL)
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, "../../dist/index.html"));
  win.once("ready-to-show", () => {
    if (splash && !splash.isDestroyed())
      splash.webContents
        .executeJavaScript(
          `if(window.updateProgress) window.updateProgress(100, "Avvio completato")`,
        )
        .catch(() => {});
    setTimeout(() => {
      if (splash && !splash.isDestroyed()) splash.destroy();
      splash = null;
      win?.show();
    }, 500);
  });

  ipcMain.handle("get-situazione", () => getSituazioneGlobale());
  ipcMain.handle("add-movimento-fondo", (e, data) =>
    addMovimentoFondo(data.importo, data.descrizione),
  );
  ipcMain.handle("get-movimenti-fondo", () => getMovimentiFondo());
  ipcMain.handle("toggle-dashboard-visibility", (e, uid) =>
    toggleDashboardVisibility(uid),
  );
  ipcMain.handle("delete-movimento-fondo", (e, id) => deleteMovimentoFondo(id));

  ipcMain.handle("trigger-manual-backup", () => triggerManualBackup()); // <--- NUOVO
  ipcMain.handle("reset-annual-data", () => resetAnnualData()); // <--- NUOVO

  ipcMain.handle("get-membri", () => getMembri());
  ipcMain.handle("add-membro", (e, m) => addMembro(m));
  ipcMain.handle("update-membro", (e, { id, membro }) =>
    updateMembro(id, membro),
  );
  ipcMain.handle("delete-membro", (e, id) => deleteMembro(id));
  ipcMain.handle("delete-all-membri", () => deleteAllMembri());

  ipcMain.handle("create-acquisto", (e, d) =>
    createAcquisto(
      d.nome,
      d.prezzo,
      d.acconto,
      d.targetMemberIds,
      d.tipo,
      d.date,
    ),
  );
  ipcMain.handle("update-acquisto", (e, d) =>
    updateAcquisto(
      d.id,
      d.nome,
      d.prezzo,
      d.acconto,
      d.targetMemberIds,
      d.date,
    ),
  );

  ipcMain.handle("delete-acquisto", (e, id) => deleteAcquisto(id));
  ipcMain.handle("get-acquisti", () => getAcquisti());
  ipcMain.handle("get-quote", (e, id) => getQuoteAcquisto(id));
  ipcMain.handle("update-quota", (e, { id, qta, versato }) =>
    updateQuota(id, qta, versato),
  );
  ipcMain.handle("completa-acquisto", (e, id) => setAcquistoCompletato(id));
  ipcMain.handle("log-ui-action", (e, msg) => logSystem("ACTION", msg));
  ipcMain.handle("open-log-file", () => openSystemLog());
  ipcMain.handle("get-backups", () => getBackupsList());
  ipcMain.handle("open-backup-folder", () => openBackupFolder());
  ipcMain.handle("restore-backup", async (e, filename) => {
    closeDB();
    const success = restoreBackup(filename);
    if (success) {
      initDB();
      win?.reload();
      return true;
    }
    return false;
  });
  ipcMain.handle("quit-app", () => {
    if (win) win.hide();
    showExitSplash();
    closeDB();
    setTimeout(() => {
      app.quit();
    }, 2000);
  });

  ipcMain.handle("export-debtors", async (e, { acquistoNome, debtors }) => {
    const res = await dialog.showSaveDialog(win!, {
      title: "Esporta Morosi",
      defaultPath: `Morosi_${acquistoNome.replace(/[^a-zA-Z0-9]/g, "").trim()}.xlsx`,
      filters: [{ name: "Excel File", extensions: ["xlsx"] }],
    });
    if (res.canceled || !res.filePath) return false;
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(debtors);
      ws["!cols"] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Morosi");
      fs.writeFileSync(
        res.filePath,
        XLSX.write(wb, { bookType: "xlsx", type: "buffer" }),
      );
      return true;
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle("export-membri", async () => {
    const res = await dialog.showSaveDialog(win!, {
      title: "Esporta Membri",
      defaultPath: `Lista_Membri_${new Date().toISOString().split("T")[0]}.xlsx`,
      filters: [{ name: "Excel File", extensions: ["xlsx"] }],
    });
    if (res.canceled || !res.filePath) return false;
    try {
      const membri = getMembri();
      const exportData = membri.map((m: any) => ({
        Cognome: m.cognome,
        Nome: m.nome,
        Matricola: m.matricola,
      }));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, ws, "Membri");
      fs.writeFileSync(
        res.filePath,
        XLSX.write(wb, { bookType: "xlsx", type: "buffer" }),
      );
      return true;
    } catch (err: any) {
      throw new Error(err.message);
    }
  });

  ipcMain.handle("select-file", async () => {
    const res = await dialog.showOpenDialog(win!, {
      properties: ["openFile"],
      filters: [{ name: "Excel/CSV", extensions: ["xlsx", "xls", "csv"] }],
    });
    return res.canceled ? null : res.filePaths[0];
  });
  ipcMain.handle("analyze-excel-bank", async (e, p) =>
    parseBankStatement(p, getMembri()),
  );
  ipcMain.handle("import-membri-excel", async (e, p) => {
    const members = await parseMembersList(p);
    let count = 0;
    for (const m of members) {
      if (addMembro(m).changes > 0) count++;
    }
    return count;
  });
}

app.whenReady().then(setupApp);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
