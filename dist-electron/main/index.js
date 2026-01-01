"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const logPath = path.join(electron.app.getPath("userData"), "system.log");
if (!fs.existsSync(logPath)) {
  fs.writeFileSync(
    logPath,
    `--- LOG INIZIATO IL ${(/* @__PURE__ */ new Date()).toLocaleString()} ---
`
  );
}
function logSystem(level, message, data) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  let logLine = `[${timestamp}] [${level}] ${message}`;
  if (data) {
    try {
      logLine += ` | DATA: ${JSON.stringify(data)}`;
    } catch (e) {
      logLine += ` | DATA: [Circular/Unserializable]`;
    }
  }
  logLine += "\n";
  try {
    fs.appendFileSync(logPath, logLine);
    console.log(logLine.trim());
  } catch (e) {
    console.error("Fallimento scrittura log:", e);
  }
}
const userDataPath = electron.app.getPath("userData");
const dbPath = path.join(userDataPath, "tesoriere.db");
const backupDir = path.join(userDataPath, "backups");
if (!fs.existsSync(userDataPath))
  fs.mkdirSync(userDataPath, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
let db;
function performBackup() {
  if (!fs.existsSync(dbPath)) return;
  try {
    const now = /* @__PURE__ */ new Date();
    const timestamp = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0") + "_" + String(now.getHours()).padStart(2, "0") + "-" + String(now.getMinutes()).padStart(2, "0") + "-" + String(now.getSeconds()).padStart(2, "0");
    const backupName = `backup_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupName);
    fs.copyFileSync(dbPath, backupPath);
    logSystem("INFO", `Backup creato: ${backupName}`);
    cleanOldBackups();
  } catch (e) {
    logSystem("ERROR", "Errore creazione backup", e);
  }
}
function cleanOldBackups() {
  try {
    const files = fs.readdirSync(backupDir).filter((f) => f.startsWith("backup_") && f.endsWith(".db"));
    files.sort().reverse();
    if (files.length > 10) {
      const toDelete = files.slice(10);
      toDelete.forEach((f) => {
        fs.unlinkSync(path.join(backupDir, f));
        logSystem("INFO", `Backup ruotato (eliminato): ${f}`);
      });
    }
  } catch (e) {
    logSystem("ERROR", "Errore pulizia backup", e);
  }
}
function openBackupFolder() {
  electron.shell.openPath(backupDir);
}
function getBackupsList() {
  try {
    return fs.readdirSync(backupDir).filter((f) => f.endsWith(".db")).sort().reverse().map((f) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { name: f, date: stat.mtime, size: stat.size };
    });
  } catch (e) {
    return [];
  }
}
function restoreBackup(filename) {
  try {
    if (db && db.open) db.close();
    const source = path.join(backupDir, filename);
    if (!fs.existsSync(source)) throw new Error("File backup non trovato");
    fs.copyFileSync(source, dbPath);
    logSystem("ACTION", `Database ripristinato da: ${filename}`);
    return true;
  } catch (e) {
    logSystem("ERROR", "Fallimento ripristino backup", e);
    return false;
  }
}
function initDB() {
  try {
    performBackup();
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(
      `CREATE TABLE IF NOT EXISTS membri (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, cognome TEXT NOT NULL, matricola TEXT);`
    );
    db.exec(
      `CREATE TABLE IF NOT EXISTS acquisti (id INTEGER PRIMARY KEY AUTOINCREMENT, nome_acquisto TEXT NOT NULL, prezzo_unitario REAL NOT NULL, completato BOOLEAN DEFAULT 0, data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP);`
    );
    db.exec(
      `CREATE TABLE IF NOT EXISTS quote_membri (id INTEGER PRIMARY KEY AUTOINCREMENT, acquisto_id INTEGER NOT NULL, membro_id INTEGER NOT NULL, quantita INTEGER DEFAULT 1, importo_versato REAL DEFAULT 0, FOREIGN KEY (acquisto_id) REFERENCES acquisti(id) ON DELETE CASCADE, FOREIGN KEY (membro_id) REFERENCES membri(id) ON DELETE CASCADE);`
    );
    db.exec(
      `CREATE TABLE IF NOT EXISTS fondo_cassa (id INTEGER PRIMARY KEY AUTOINCREMENT, importo REAL NOT NULL, descrizione TEXT, data DATETIME DEFAULT CURRENT_TIMESTAMP);`
    );
    logSystem("DB", "Database inizializzato correttamente");
    return true;
  } catch (error) {
    logSystem("ERROR", "Errore critico inizializzazione DB", error);
    return false;
  }
}
function closeDB() {
  if (db && db.open) {
    db.close();
    logSystem("DB", "Database chiuso");
  }
}
function getSituazioneGlobale() {
  try {
    const entrate = db.prepare(
      `SELECT (COALESCE((SELECT SUM(importo_versato) FROM quote_membri), 0) + COALESCE((SELECT SUM(importo) FROM fondo_cassa), 0)) as total`
    ).get();
    const uscite = db.prepare(
      `SELECT SUM(q.quantita * a.prezzo_unitario) as total FROM quote_membri q JOIN acquisti a ON q.acquisto_id = a.id WHERE a.completato = 1`
    ).get();
    const vincolati = db.prepare(
      `SELECT SUM(q.importo_versato) as total FROM quote_membri q JOIN acquisti a ON q.acquisto_id = a.id WHERE a.completato = 0`
    ).get();
    return {
      fondo_cassa_reale: (entrate.total || 0) - (uscite.total || 0),
      fondi_vincolati: vincolati.total || 0,
      disponibile_effettivo: (entrate.total || 0) - (uscite.total || 0) - (vincolati.total || 0)
    };
  } catch (e) {
    logSystem("ERROR", "getSituazioneGlobale", e);
    return {
      fondo_cassa_reale: 0,
      fondi_vincolati: 0,
      disponibile_effettivo: 0
    };
  }
}
function addMovimentoFondo(importo, descrizione) {
  logSystem("ACTION", `Movimento Fondo: ${importo}€ - ${descrizione}`);
  return db.prepare("INSERT INTO fondo_cassa (importo, descrizione) VALUES (?, ?)").run(importo, descrizione);
}
function getMovimentiFondo(limit = 50) {
  return db.prepare("SELECT * FROM fondo_cassa ORDER BY data DESC LIMIT ?").all(limit);
}
function getMembri() {
  return db.prepare("SELECT * FROM membri ORDER BY cognome ASC").all();
}
function addMembro(m) {
  logSystem("ACTION", "Aggiunta membro", m);
  const matr = m.matricola && m.matricola.trim() !== "" ? m.matricola : null;
  return db.prepare("INSERT INTO membri (nome, cognome, matricola) VALUES (?, ?, ?)").run(m.nome, m.cognome, matr);
}
function deleteMembro(id) {
  logSystem("ACTION", `Eliminazione membro ID: ${id}`);
  return db.prepare("DELETE FROM membri WHERE id = ?").run(id);
}
function createAcquisto(nome, prezzo) {
  logSystem("ACTION", `Nuovo acquisto: ${nome} a ${prezzo}€`);
  const trx = db.transaction(() => {
    const info = db.prepare(
      "INSERT INTO acquisti (nome_acquisto, prezzo_unitario) VALUES (?, ?)"
    ).run(nome, prezzo);
    const id = info.lastInsertRowid;
    db.prepare(
      `INSERT INTO quote_membri (acquisto_id, membro_id, quantita, importo_versato) SELECT ?, id, 1, 0 FROM membri`
    ).run(id);
    return id;
  });
  return trx();
}
function getAcquisti(soloAttivi = false) {
  const f = soloAttivi ? "WHERE completato = 0" : "";
  return db.prepare(`SELECT * FROM acquisti ${f} ORDER BY data_creazione DESC`).all();
}
function getQuoteAcquisto(id) {
  return db.prepare(
    `SELECT q.*, m.nome, m.cognome, m.matricola FROM quote_membri q JOIN membri m ON q.membro_id = m.id WHERE q.acquisto_id = ? ORDER BY m.cognome ASC`
  ).all(id);
}
function updateQuota(id, q, v) {
  return db.prepare(
    "UPDATE quote_membri SET quantita = ?, importo_versato = ? WHERE id = ?"
  ).run(q, v, id);
}
function setAcquistoCompletato(id) {
  logSystem("ACTION", `Acquisto completato ID: ${id}`);
  return db.prepare("UPDATE acquisti SET completato = 1 WHERE id = ?").run(id);
}
let pdfLib;
try {
  const rawLib = require("pdf-parse");
  pdfLib = typeof rawLib === "function" ? rawLib : rawLib.default;
} catch (e) {
  console.error("Errore require pdf-parse:", e);
  throw new Error("Libreria PDF non trovata nel bundle.");
}
const normalize = (s) => s ? s.toUpperCase().replace(/\s+/g, " ").replace(/[^A-Z0-9., ]/g, "").trim() : "";
async function parseBankStatement(filePath, membri) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfLib(dataBuffer);
    const text = data.text;
    console.log("--- DEBUG TESTO PDF ---");
    console.log(text.substring(0, 300) + "...");
    console.log("-----------------------");
    const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 3);
    const matches = [];
    const moneyRegex = /[\d.,]+[.,]\d{2}/;
    for (let i = 0; i < lines.length; i++) {
      const currentLine = normalize(lines[i]);
      const moneyMatch = currentLine.match(moneyRegex);
      if (!moneyMatch) continue;
      let importoClean = moneyMatch[0];
      if (importoClean.includes(",")) {
        importoClean = importoClean.replace(/\./g, "").replace(",", ".");
      }
      const importo = parseFloat(importoClean);
      if (isNaN(importo)) continue;
      const prev1 = i > 0 ? normalize(lines[i - 1]) : "";
      const prev2 = i > 1 ? normalize(lines[i - 2]) : "";
      const context = `${prev2} ${prev1} ${currentLine}`;
      for (const m of membri) {
        const nome = normalize(m.nome);
        const cognome = normalize(m.cognome);
        const matricola = m.matricola ? normalize(m.matricola) : "###IGNORE###";
        let found = false;
        let confidenza = "";
        if (matricola !== "###IGNORE###" && context.includes(matricola)) {
          found = true;
          confidenza = "Matricola";
        } else if (context.includes(nome) && context.includes(cognome)) {
          found = true;
          confidenza = "Nominativo";
        }
        if (found) {
          matches.push({
            linea_originale: lines[i].trim(),
            // La riga originale per riferimento visivo
            membro_id: m.id,
            nome_trovato: `${m.cognome} ${m.nome}`,
            importo_trovato: importo,
            confidenza
          });
          break;
        }
      }
    }
    return matches;
  } catch (error) {
    console.error("ERRORE PARSER:", error);
    throw new Error(
      "Errore lettura PDF. Il file potrebbe essere illeggibile o protetto."
    );
  }
}
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
let win = null;
let splash = null;
const iconPath = process.env.VITE_DEV_SERVER_URL ? path.join(process.cwd(), "public/icon.png") : path.join(__dirname, "../../dist/icon.png");
function getPreloadPath() {
  const p = path.join(
    __dirname,
    process.env.VITE_DEV_SERVER_URL ? "preload.js" : "../preload/preload.js"
  );
  return fs.existsSync(p) ? p : path.resolve(
    __dirname,
    process.env.VITE_DEV_SERVER_URL ? "../preload/preload.js" : "preload.js"
  );
}
function updateSplash(percent, text) {
  if (splash && !splash.isDestroyed())
    splash.webContents.executeJavaScript(
      `window.updateProgress(${percent}, "${text}")`
    );
}
function createSplashWindow() {
  splash = new electron.BrowserWindow({
    width: 400,
    height: 300,
    transparent: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    backgroundColor: "#0f172a",
    icon: iconPath,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  const splashFile = process.env.VITE_DEV_SERVER_URL ? path.join(process.cwd(), "public/splash.html") : path.join(__dirname, "../../dist/splash.html");
  splash.loadFile(splashFile);
}
function setupApp() {
  logSystem("INFO", "--- APPLICAZIONE AVVIATA ---");
  updateSplash(30, "Verifica Backup & Database...");
  setTimeout(() => {
    if (!initDB()) {
      logSystem("ERROR", "InitDB fallito");
      electron.dialog.showErrorBox("Errore", "Impossibile inizializzare il database.");
      electron.app.quit();
    } else {
      updateSplash(60, "Caricamento Interfaccia...");
      createMainWindow();
    }
  }, 1e3);
  electron.ipcMain.handle(
    "log-ui-action",
    (e, msg) => logSystem("ACTION", `[UI] ${msg}`)
  );
  electron.ipcMain.handle("quit-app", () => {
    logSystem("INFO", "Richiesta chiusura app");
    if (win) win.hide();
    if (!splash || splash.isDestroyed()) createSplashWindow();
    else splash.show();
    updateSplash(50, "Salvataggio dati in corso...");
    setTimeout(() => {
      updateSplash(90, "Chiusura connessioni...");
      closeDB();
      setTimeout(() => electron.app.quit(), 1e3);
    }, 1e3);
  });
  electron.ipcMain.handle("get-backups", () => getBackupsList());
  electron.ipcMain.handle("open-backup-folder", () => openBackupFolder());
  electron.ipcMain.handle("restore-backup", (e, filename) => {
    logSystem("ACTION", `Tentativo ripristino backup: ${filename}`);
    if (restoreBackup(filename)) {
      logSystem("INFO", "Ripristino riuscito, riavvio app...");
      electron.app.relaunch();
      electron.app.exit(0);
    } else {
      logSystem("ERROR", "Ripristino fallito");
    }
    return false;
  });
  electron.ipcMain.handle("get-situazione", () => getSituazioneGlobale());
  electron.ipcMain.handle(
    "add-movimento-fondo",
    (e, d) => addMovimentoFondo(d.importo, d.descrizione)
  );
  electron.ipcMain.handle("get-movimenti-fondo", () => getMovimentiFondo());
  electron.ipcMain.handle("get-membri", () => getMembri());
  electron.ipcMain.handle("add-membro", (e, m) => addMembro(m));
  electron.ipcMain.handle("delete-membro", (e, id) => deleteMembro(id));
  electron.ipcMain.handle("create-acquisto", (e, d) => createAcquisto(d.nome, d.prezzo));
  electron.ipcMain.handle("get-acquisti", (e, a) => getAcquisti(a));
  electron.ipcMain.handle("get-quote", (e, id) => getQuoteAcquisto(id));
  electron.ipcMain.handle("update-quota", (e, d) => updateQuota(d.id, d.qta, d.versato));
  electron.ipcMain.handle("completa-acquisto", (e, id) => setAcquistoCompletato(id));
  electron.ipcMain.handle("select-file", async () => {
    const res = await electron.dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: [{ name: "Estratto Conto PDF", extensions: ["pdf"] }]
    });
    return res.canceled ? null : res.filePaths[0];
  });
  electron.ipcMain.handle("analyze-pdf", async (e, p) => {
    logSystem("INFO", `Analisi PDF richiesta: ${p}`);
    try {
      return await parseBankStatement(p, getMembri());
    } catch (err) {
      logSystem("ERROR", "Errore parsing PDF", err.message);
      throw err;
    }
  });
}
function createMainWindow() {
  win = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    backgroundColor: "#0f172a",
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true
    }
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
electron.app.whenReady().then(() => {
  createSplashWindow();
  setTimeout(() => {
    updateSplash(10, "Avvio sistema...");
    setupApp();
  }, 500);
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
