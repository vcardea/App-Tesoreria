import Database from "better-sqlite3";
import path from "path";
import { app, shell } from "electron";
import fs from "fs";
import { logSystem } from "./logger";

const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "tesoriere.db");
const backupDir = path.join(userDataPath, "backups");

if (!fs.existsSync(userDataPath))
  fs.mkdirSync(userDataPath, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

let db: Database.Database;

// --- BACKUP SYSTEM 2.0 (Ordinamento per nome) ---
function performBackup() {
  if (!fs.existsSync(dbPath)) return;

  try {
    const now = new Date();
    // Formato rigoroso: YYYY-MM-DD_HH-mm-ss
    const timestamp =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0") +
      "_" +
      String(now.getHours()).padStart(2, "0") +
      "-" +
      String(now.getMinutes()).padStart(2, "0") +
      "-" +
      String(now.getSeconds()).padStart(2, "0");

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
    // 1. Leggi tutti i file che iniziano con 'backup_'
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("backup_") && f.endsWith(".db"));

    // 2. Ordina alfabeticamente (inverso: dal più nuovo al più vecchio)
    // Essendo ISO timestamp nel nome, l'ordine alfabetico = ordine cronologico
    files.sort().reverse();

    // 3. Se ce ne sono più di 10, cancella gli eccedenti (quelli in fondo alla lista)
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

export function openBackupFolder() {
  shell.openPath(backupDir);
}

export function getBackupsList() {
  try {
    // Ritorna la lista ordinata per data (nome) decrescente
    return fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith(".db"))
      .sort()
      .reverse()
      .map((f) => {
        const stat = fs.statSync(path.join(backupDir, f));
        return { name: f, date: stat.mtime, size: stat.size };
      });
  } catch (e) {
    return [];
  }
}

export function restoreBackup(filename: string) {
  try {
    // 1. CHIUDIAMO LA CONNESSIONE ESPLICITAMENTE
    if (db && db.open) {
      db.close();
      console.log("🔒 DB chiuso per restore.");
    }

    const source = path.join(backupDir, filename);
    if (!fs.existsSync(source)) {
      logSystem("ERROR", "File backup non trovato su disco");
      return false;
    }

    // 2. PULIZIA TOTALE (Sia .db che i file temporanei WAL/SHM)
    // Se non cancelli WAL e SHM, sqlite al riavvio cercherà di "fondere" i vecchi log col nuovo db -> CORRUZIONE/BLOCCO
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
      if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
    } catch (err: any) {
      logSystem("ERROR", `Impossibile pulire vecchi file DB: ${err.message}`);
      // Proseguiamo comunque, potrebbe funzionare lo stesso sovrascrivendo
    }

    // 3. COPIA
    fs.copyFileSync(source, dbPath);

    logSystem("ACTION", `Database ripristinato correttamente da: ${filename}`);
    return true;
  } catch (e: any) {
    logSystem("ERROR", "Fallimento critico restore backup", e.message);
    return false;
  }
}

// --- DB INIT ---
export function initDB() {
  try {
    if (fs.existsSync(dbPath)) performBackup();
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    // Tabelle base
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

    // MIGRAZIONE: Aggiungi colonna acconto_fornitore se non esiste
    try {
      const tableInfo = db.pragma("table_info(acquisti)") as any[];
      const hasAcconto = tableInfo.some((c) => c.name === "acconto_fornitore");
      if (!hasAcconto) {
        db.exec(
          "ALTER TABLE acquisti ADD COLUMN acconto_fornitore REAL DEFAULT 0"
        );
        logSystem("DB", "Colonna acconto_fornitore aggiunta");
      }
    } catch (e) {
      logSystem("ERROR", "Errore migrazione DB", e);
    }

    return true;
  } catch (error) {
    return false;
  }
}

export function closeDB() {
  if (db) db.close();
}

// --- QUERY ---
export function getSituazioneGlobale() {
  const entrate = db
    .prepare(
      `SELECT (COALESCE((SELECT SUM(importo_versato) FROM quote_membri), 0) + COALESCE((SELECT SUM(importo) FROM fondo_cassa), 0)) as total`
    )
    .get() as any;
  // Le uscite sono: (prezzo * qta) degli acquisti completati OPPURE acconti versati per quelli aperti
  // Ma per semplicità contabile: i soldi escono quando paghi il fornitore.
  // Calcolo semplificato: Uscite = Acquisti Completati (Totale) + Acconti su Acquisti Aperti
  const usciteCompletati = db
    .prepare(
      `SELECT SUM(q.quantita * a.prezzo_unitario) as total FROM quote_membri q JOIN acquisti a ON q.acquisto_id = a.id WHERE a.completato = 1`
    )
    .get() as any;
  const accontiAperti = db
    .prepare(
      `SELECT SUM(acconto_fornitore) as total FROM acquisti WHERE completato = 0`
    )
    .get() as any;

  const totaleUscite =
    (usciteCompletati.total || 0) + (accontiAperti.total || 0);

  const vincolati = db
    .prepare(
      `SELECT SUM(q.importo_versato) as total FROM quote_membri q JOIN acquisti a ON q.acquisto_id = a.id WHERE a.completato = 0`
    )
    .get() as any;
  const reale = (entrate.total || 0) - totaleUscite;

  return {
    fondo_cassa_reale: reale,
    fondi_vincolati: vincolati.total || 0,
    disponibile_effettivo: reale - (vincolati.total || 0),
  };
}

export function addMovimentoFondo(i: number, d: string) {
  return db
    .prepare("INSERT INTO fondo_cassa (importo, descrizione) VALUES (?, ?)")
    .run(i, d);
}
export function getMovimentiFondo() {
  return db
    .prepare("SELECT * FROM fondo_cassa ORDER BY data DESC LIMIT 50")
    .all();
}

// Membri
export function getMembri() {
  return db.prepare("SELECT * FROM membri ORDER BY cognome ASC").all();
}
export function addMembro(m: any) {
  // Evita duplicati basici (Nome + Cognome uguali)
  const exists = db
    .prepare("SELECT id FROM membri WHERE nome = ? AND cognome = ?")
    .get(m.nome, m.cognome);
  if (exists) return { changes: 0 };
  return db
    .prepare("INSERT INTO membri (nome, cognome, matricola) VALUES (?, ?, ?)")
    .run(m.nome, m.cognome, m.matricola || null);
}
export function updateMembro(id: number, m: any) {
  return db
    .prepare(
      "UPDATE membri SET nome = ?, cognome = ?, matricola = ? WHERE id = ?"
    )
    .run(m.nome, m.cognome, m.matricola || null, id);
}
export function deleteMembro(id: number) {
  return db.prepare("DELETE FROM membri WHERE id = ?").run(id);
}

// Acquisti
export function createAcquisto(n: string, p: number, acconto: number = 0) {
  const trx = db.transaction(() => {
    const id = db
      .prepare(
        "INSERT INTO acquisti (nome_acquisto, prezzo_unitario, acconto_fornitore) VALUES (?, ?, ?)"
      )
      .run(n, p, acconto).lastInsertRowid;
    db.prepare(
      `INSERT INTO quote_membri (acquisto_id, membro_id, quantita, importo_versato) SELECT ?, id, 1, 0 FROM membri`
    ).run(id);
    return id;
  });
  return trx();
}
export function updateAcquisto(
  id: number,
  n: string,
  p: number,
  acconto: number
) {
  return db
    .prepare(
      "UPDATE acquisti SET nome_acquisto = ?, prezzo_unitario = ?, acconto_fornitore = ? WHERE id = ?"
    )
    .run(n, p, acconto, id);
}
export function deleteAcquisto(id: number) {
  return db.prepare("DELETE FROM acquisti WHERE id = ?").run(id);
}
export function getAcquisti() {
  return db
    .prepare(`SELECT * FROM acquisti ORDER BY data_creazione DESC`)
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
