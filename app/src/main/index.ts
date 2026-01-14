import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import fs from "fs"; // Assicurati che questo ci sia!
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
} from "./db";
import { parseBankStatement, parseMembersList } from "./excel_parser";
import { logSystem, openSystemLog } from "./logger";

process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

let win: BrowserWindow | null = null;
let splash: BrowserWindow | null = null;

const iconPath = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.cwd(), "public/icon.png")
  : path.join(__dirname, "../../dist/icon.png");

function getPreloadPath() {
  return path.join(
    __dirname,
    process.env.VITE_DEV_SERVER_URL
      ? "../preload/preload.js"
      : "../preload/preload.js"
  );
}

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

  // CARICAMENTO FILE ESTERNO PER EVITARE SIDEBAR
  const splashPath = process.env.VITE_DEV_SERVER_URL
    ? path.join(process.cwd(), "public/splash.html")
    : path.join(__dirname, "../../dist/splash.html");

  splash.loadFile(splashPath);
}

function showExitSplash() {
  if (splash && !splash.isDestroyed()) {
    splash.show();
  } else {
    createSplashWindow();
  }
  if (splash && !splash.isDestroyed()) {
    // Eseguiamo script solo quando il file è caricato
    splash.webContents.once("did-finish-load", () => {
      splash?.webContents.executeJavaScript(
        `if(window.updateProgress) window.updateProgress(100, "Salvataggio e Chiusura...")`
      );
    });
    // Tentativo immediato se già caricato
    splash.webContents
      .executeJavaScript(
        `if(window.updateProgress) window.updateProgress(100, "Salvataggio e Chiusura...")`
      )
      .catch(() => {});
  }
}

async function setupApp() {
  createSplashWindow();

  await new Promise((r) => setTimeout(r, 500));
  splash?.webContents
    .executeJavaScript(
      `if(window.updateProgress) window.updateProgress(20, "Connessione Database...")`
    )
    .catch(() => {});

  const dbOk = initDB();

  if (!dbOk) {
    dialog.showErrorBox(
      "Errore Critico",
      "Impossibile inizializzare il Database.\nControlla i permessi della cartella."
    );
    app.quit();
    return;
  }

  splash?.webContents
    .executeJavaScript(
      `if(window.updateProgress) window.updateProgress(60, "Caricamento Interfaccia...")`
    )
    .catch(() => {});
  createMainWindow();
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
    splash?.webContents
      .executeJavaScript(
        `if(window.updateProgress) window.updateProgress(100, "Avvio completato")`
      )
      .catch(() => {});
    setTimeout(() => {
      splash?.destroy();
      splash = null;
      win?.show();
    }, 500);
  });

  // --- HANDLERS ---

  ipcMain.handle("get-situazione", () => getSituazioneGlobale());
  ipcMain.handle("add-movimento-fondo", (e, data) =>
    addMovimentoFondo(data.importo, data.descrizione)
  );
  ipcMain.handle("get-movimenti-fondo", () => getMovimentiFondo());

  ipcMain.handle("get-membri", () => getMembri());
  ipcMain.handle("add-membro", (e, m) => addMembro(m));
  ipcMain.handle("update-membro", (e, { id, membro }) =>
    updateMembro(id, membro)
  );
  ipcMain.handle("delete-membro", (e, id) => deleteMembro(id));
  ipcMain.handle("delete-all-membri", () => deleteAllMembri());

  ipcMain.handle("create-acquisto", (e, d) =>
    createAcquisto(d.nome, d.prezzo, d.acconto)
  );
  ipcMain.handle("update-acquisto", (e, d) =>
    updateAcquisto(d.id, d.nome, d.prezzo, d.acconto)
  );
  ipcMain.handle("delete-acquisto", (e, id) => deleteAcquisto(id));
  ipcMain.handle("get-acquisti", () => getAcquisti());
  ipcMain.handle("get-quote", (e, id) => getQuoteAcquisto(id));
  ipcMain.handle("update-quota", (e, { id, qta, versato }) =>
    updateQuota(id, qta, versato)
  );
  ipcMain.handle("completa-acquisto", (e, id) => setAcquistoCompletato(id));

  ipcMain.handle("log-ui-action", (e, msg) => logSystem("ACTION", msg));
  ipcMain.handle("open-log-file", () => openSystemLog());
  ipcMain.handle("get-backups", () => getBackupsList());
  ipcMain.handle("open-backup-folder", () => openBackupFolder());

  // --- RESTORE BACKUP CON SOFT RELOAD (FIX DEFINITIVO) ---
  ipcMain.handle("restore-backup", async (e, filename) => {
    logSystem("ACTION", `Richiesto ripristino backup: ${filename}`);

    // 1. Chiudiamo esplicitamente la connessione al DB attuale
    closeDB();

    // 2. Eseguiamo la copia del file (funzione sincrona in db.ts)
    // Nota: restoreBackup in db.ts gestisce già la copia fisica
    const success = restoreBackup(filename);

    if (success) {
      logSystem(
        "INFO",
        "Backup ripristinato su disco. Riavvio connessione DB..."
      );

      // 3. Rinizializziamo il DB (riapre la connessione al nuovo file)
      const dbOk = initDB();

      if (dbOk) {
        // 4. Invece di app.relaunch(), ricarichiamo solo la finestra!
        // Questo resetta l'interfaccia React e carica i nuovi dati.
        win?.reload();
        return true;
      } else {
        logSystem(
          "ERROR",
          "Impossibile reinizializzare il DB dopo il restore."
        );
        return false;
      }
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

  // --- EXPORT DEBTORS FIX (METODO BUFFER) ---
  ipcMain.handle("export-debtors", async (e, { acquistoNome, debtors }) => {
    const res = await dialog.showSaveDialog(win!, {
      title: "Esporta Morosi",
      // Rimuoviamo caratteri non validi per Windows
      defaultPath: `Morosi_${acquistoNome
        .replace(/[^a-zA-Z0-9à-ùÀ-Ù\s_-]/g, "")
        .trim()
        .replace(/\s+/g, "_")}.xlsx`,
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

      // 1. Crea il buffer in memoria (Questo non fallisce mai per permessi)
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

      // 2. Scrivi il file su disco usando FS nativo
      fs.writeFileSync(res.filePath, buffer);

      return true;
    } catch (err: any) {
      console.error("Errore export excel:", err);

      if (err.code === "EBUSY") {
        throw new Error(`IL FILE È GIÀ APERTO!\nChiudi Excel e riprova.`);
      }
      if (err.code === "EPERM" || err.code === "EACCES") {
        throw new Error(
          `PERMESSO NEGATO.\nWindows ha bloccato il salvataggio in questa cartella.\nProva a salvare sul Desktop.`
        );
      }
      throw new Error(`Errore tecnico: ${err.message}`);
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

app.whenReady().then(setupApp);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
