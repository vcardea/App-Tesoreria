import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";
import fs from "fs";

const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "tesoriere.db");
const backupDir = path.join(userDataPath, "backups");

// Assicuriamoci che le cartelle esistano
if (!fs.existsSync(userDataPath))
  fs.mkdirSync(userDataPath, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

let db: Database.Database;

// --- GESTIONE BACKUP ---
function performBackup() {
  if (fs.existsSync(dbPath)) {
    try {
      const now = new Date();
      // Costruzione manuale per garantire l'ora locale corretta
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");

      const timestamp = `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
      const backupPath = path.join(backupDir, `backup_${timestamp}.db`);

      fs.copyFileSync(dbPath, backupPath);
      console.log(`✅ Backup Eseguito: ${backupPath}`);

      deleteOldBackups(15);
    } catch (e) {
      console.error("❌ Errore backup:", e);
    }
  }
}

function deleteOldBackups(keepCount: number) {
  try {
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("backup_") && f.endsWith(".db"))
      .map((f) => ({
        name: f,
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time); // Ordina dal più recente

    if (files.length > keepCount) {
      const toDelete = files.slice(keepCount);
      toDelete.forEach((f) => fs.unlinkSync(path.join(backupDir, f.name)));
    }
  } catch (e) {
    console.error(e);
  }
}

export function getBackupsList() {
  try {
    return fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith(".db"))
      .map((f) => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          date: stat.mtime,
          size: stat.size,
          path: path.join(backupDir, f),
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (e) {
    return [];
  }
}

export function restoreBackup(filename: string) {
  try {
    if (db) db.close();
    const source = path.join(backupDir, filename);
    fs.copyFileSync(source, dbPath);
    console.log(`♻️ Database ripristinato da ${filename}`);
    return true;
  } catch (e) {
    console.error("Errore restore:", e);
    return false;
  }
}

export function initDB() {
  try {
    // 1. PRIMA DI TUTTO: BACKUP
    performBackup();

    // 2. POI APERTURA DB
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // STRUTTURA TABELLE
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

    return true;
  } catch (error) {
    console.error("❌ Errore critico DB:", error);
    return false;
  }
}

export function closeDB() {
  if (db && db.open) {
    db.close();
    console.log("🔒 Database chiuso.");
  }
}

// --- CONTABILITÀ & DATI ---
export function getSituazioneGlobale() {
  const entrate = db
    .prepare(
      `SELECT (COALESCE((SELECT SUM(importo_versato) FROM quote_membri), 0) + COALESCE((SELECT SUM(importo) FROM fondo_cassa), 0)) as total`
    )
    .get() as any;
  const uscite = db
    .prepare(
      `SELECT SUM(q.quantita * a.prezzo_unitario) as total FROM quote_membri q JOIN acquisti a ON q.acquisto_id = a.id WHERE a.completato = 1`
    )
    .get() as any;
  const vincolati = db
    .prepare(
      `SELECT SUM(q.importo_versato) as total FROM quote_membri q JOIN acquisti a ON q.acquisto_id = a.id WHERE a.completato = 0`
    )
    .get() as any;
  const reale = (entrate.total || 0) - (uscite.total || 0);
  return {
    fondo_cassa_reale: reale,
    fondi_vincolati: vincolati.total || 0,
    disponibile_effettivo: reale - (vincolati.total || 0),
  };
}

export function addMovimentoFondo(importo: number, descrizione: string) {
  return db
    .prepare("INSERT INTO fondo_cassa (importo, descrizione) VALUES (?, ?)")
    .run(importo, descrizione);
}
export function getMovimentiFondo(limit = 20) {
  return db
    .prepare("SELECT * FROM fondo_cassa ORDER BY data DESC LIMIT ?")
    .all(limit);
}

// Membri
export function getMembri() {
  return db.prepare("SELECT * FROM membri ORDER BY cognome ASC").all();
}
export function addMembro(m: any) {
  const matr = m.matricola && m.matricola.trim() !== "" ? m.matricola : null;
  return db
    .prepare("INSERT INTO membri (nome, cognome, matricola) VALUES (?, ?, ?)")
    .run(m.nome, m.cognome, matr);
}
export function deleteMembro(id: number) {
  return db.prepare("DELETE FROM membri WHERE id = ?").run(id);
}

// Acquisti
export function createAcquisto(nome: string, prezzo: number) {
  const trx = db.transaction(() => {
    const info = db
      .prepare(
        "INSERT INTO acquisti (nome_acquisto, prezzo_unitario) VALUES (?, ?)"
      )
      .run(nome, prezzo);
    const id = info.lastInsertRowid;
    db.prepare(
      `INSERT INTO quote_membri (acquisto_id, membro_id, quantita, importo_versato) SELECT ?, id, 1, 0 FROM membri`
    ).run(id);
    return id;
  });
  return trx();
}
export function getAcquisti(soloAttivi = false) {
  const f = soloAttivi ? "WHERE completato = 0" : "";
  return db
    .prepare(`SELECT * FROM acquisti ${f} ORDER BY data_creazione DESC`)
    .all();
}
export function getQuoteAcquisto(id: number) {
  return db
    .prepare(
      `SELECT q.*, m.nome, m.cognome, m.matricola FROM quote_membri q JOIN membri m ON q.membro_id = m.id WHERE q.acquisto_id = ? ORDER BY m.cognome ASC`
    )
    .all(id);
}
export function updateQuota(id: number, q: number, v: number) {
  return db
    .prepare(
      "UPDATE quote_membri SET quantita = ?, importo_versato = ? WHERE id = ?"
    )
    .run(q, v, id);
}
export function setAcquistoCompletato(id: number) {
  return db.prepare("UPDATE acquisti SET completato = 1 WHERE id = ?").run(id);
}
