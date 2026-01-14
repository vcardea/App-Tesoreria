import Database from "better-sqlite3";
import path from "path";
import { app, shell } from "electron";
import fs from "fs";
import { logSystem } from "./logger";

const userDataPath = app.getPath("userData");
const dbPath = path.join(userDataPath, "tesoreria.db");
const backupDir = path.join(userDataPath, "backups");

if (!fs.existsSync(userDataPath))
  fs.mkdirSync(userDataPath, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

let db: Database.Database;

// --- BACKUP SYSTEM ---
function performBackup() {
  if (!fs.existsSync(dbPath)) return;
  try {
    const now = new Date();
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
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("backup_") && f.endsWith(".db"));
    files.sort().reverse();
    if (files.length > 10) {
      files.slice(10).forEach((f) => fs.unlinkSync(path.join(backupDir, f)));
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
    if (db && db.open) db.close();
    const source = path.join(backupDir, filename);
    if (!fs.existsSync(source)) return false;
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
      if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
    } catch (err: any) {}
    fs.copyFileSync(source, dbPath);
    return true;
  } catch (e: any) {
    return false;
  }
}

// --- DB INIT ---
export function initDB() {
  try {
    if (fs.existsSync(dbPath)) performBackup();
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    db.exec(
      `CREATE TABLE IF NOT EXISTS membri (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, cognome TEXT NOT NULL, matricola TEXT);`
    );
    // Aggiunta data_chiusura nella definizione base (per le nuove installazioni)
    db.exec(
      `CREATE TABLE IF NOT EXISTS acquisti (id INTEGER PRIMARY KEY AUTOINCREMENT, nome_acquisto TEXT NOT NULL, prezzo_unitario REAL NOT NULL, completato BOOLEAN DEFAULT 0, data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP, data_chiusura DATETIME DEFAULT NULL);`
    );
    db.exec(
      `CREATE TABLE IF NOT EXISTS quote_membri (id INTEGER PRIMARY KEY AUTOINCREMENT, acquisto_id INTEGER NOT NULL, membro_id INTEGER NOT NULL, quantita INTEGER DEFAULT 1, importo_versato REAL DEFAULT 0, FOREIGN KEY (acquisto_id) REFERENCES acquisti(id) ON DELETE CASCADE, FOREIGN KEY (membro_id) REFERENCES membri(id) ON DELETE CASCADE);`
    );
    db.exec(
      `CREATE TABLE IF NOT EXISTS fondo_cassa (id INTEGER PRIMARY KEY AUTOINCREMENT, importo REAL NOT NULL, descrizione TEXT, data DATETIME DEFAULT CURRENT_TIMESTAMP);`
    );

    // MIGRATION 1: Acconto
    try {
      const tableInfo = db.pragma("table_info(acquisti)") as any[];
      if (!tableInfo.some((c) => c.name === "acconto_fornitore")) {
        db.exec(
          "ALTER TABLE acquisti ADD COLUMN acconto_fornitore REAL DEFAULT 0"
        );
      }
    } catch (e) {}

    // MIGRATION 2: Deleted At
    try {
      const tableInfo = db.pragma("table_info(membri)") as any[];
      if (!tableInfo.some((c) => c.name === "deleted_at")) {
        db.exec(
          "ALTER TABLE membri ADD COLUMN deleted_at DATETIME DEFAULT NULL"
        );
      }
    } catch (e) {}

    // MIGRATION 3: Spese da Fondo
    try {
      const tableInfo = db.pragma("table_info(acquisti)") as any[];
      if (!tableInfo.some((c) => c.name === "is_fund_expense")) {
        db.exec(
          "ALTER TABLE acquisti ADD COLUMN is_fund_expense BOOLEAN DEFAULT 0"
        );
      }
    } catch (e) {}

    // MIGRATION 4: Data Chiusura (NUOVA PER VISUALIZZAZIONE MOVIMENTO)
    try {
      const tableInfo = db.pragma("table_info(acquisti)") as any[];
      if (!tableInfo.some((c) => c.name === "data_chiusura")) {
        db.exec(
          "ALTER TABLE acquisti ADD COLUMN data_chiusura DATETIME DEFAULT NULL"
        );
        // Aggiorna i vecchi chiusi con la data creazione come fallback
        db.exec(
          "UPDATE acquisti SET data_chiusura = data_creazione WHERE completato = 1 AND data_chiusura IS NULL"
        );
      }
    } catch (e) {}

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

// AGGIORNATA: Unisce Movimenti manuali + Acquisti completati (solo visualizzazione)
export function getMovimentiFondo() {
  return db
    .prepare(
      `
    SELECT * FROM (
        SELECT 
            'F-' || id as unique_id, 
            importo, 
            descrizione, 
            data 
        FROM fondo_cassa
        
        UNION ALL
        
        SELECT 
            'A-' || a.id as unique_id,
            -(a.prezzo_unitario * (SELECT COALESCE(SUM(quantita),0) FROM quote_membri WHERE acquisto_id = a.id)) as importo,
            'PAGAMENTO FORNITORE: ' || a.nome_acquisto as descrizione,
            COALESCE(a.data_chiusura, a.data_creazione) as data
        FROM acquisti a
        WHERE a.completato = 1 AND a.is_fund_expense = 0
    )
    ORDER BY data DESC
    LIMIT 100
  `
    )
    .all();
}

// Membri
export function getMembri() {
  return db
    .prepare(
      "SELECT * FROM membri WHERE deleted_at IS NULL ORDER BY cognome ASC"
    )
    .all();
}

export function addMembro(m: any) {
  const existing = db
    .prepare("SELECT id, deleted_at FROM membri WHERE nome = ? AND cognome = ?")
    .get(m.nome, m.cognome) as any;
  if (existing) {
    if (existing.deleted_at) {
      logSystem("DB", `Membro riattivato: ${m.cognome} ${m.nome}`);
      return db
        .prepare(
          "UPDATE membri SET deleted_at = NULL, matricola = ? WHERE id = ?"
        )
        .run(m.matricola || null, existing.id);
    }
    return { changes: 0 };
  }
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
  return db
    .prepare("UPDATE membri SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(id);
}

export function deleteAllMembri() {
  return db
    .prepare(
      "UPDATE membri SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL"
    )
    .run();
}

// Acquisti
export function createAcquisto(
  n: string,
  p: number,
  acconto: number,
  targetIds: number[] | null,
  isFund: boolean
) {
  const trx = db.transaction(() => {
    // Se è fondo, è subito completato e data chiusura = oggi
    const isCompleted = isFund ? 1 : 0;
    const dataChiusura = isFund ? new Date().toISOString() : null;

    const id = db
      .prepare(
        "INSERT INTO acquisti (nome_acquisto, prezzo_unitario, acconto_fornitore, is_fund_expense, completato, data_chiusura) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run(
        n,
        p,
        acconto,
        isFund ? 1 : 0,
        isCompleted,
        dataChiusura
      ).lastInsertRowid;

    if (isFund) {
      db.prepare(
        "INSERT INTO fondo_cassa (importo, descrizione) VALUES (?, ?)"
      ).run(-p, `USCITA DIRETTA: ${n}`);
    } else {
      if (targetIds && targetIds.length > 0) {
        const stmt = db.prepare(
          "INSERT INTO quote_membri (acquisto_id, membro_id, quantita, importo_versato) VALUES (?, ?, 1, 0)"
        );
        for (const mId of targetIds) {
          stmt.run(id, mId);
        }
      } else {
        db.prepare(
          `INSERT INTO quote_membri (acquisto_id, membro_id, quantita, importo_versato) SELECT ?, id, 1, 0 FROM membri WHERE deleted_at IS NULL`
        ).run(id);
      }
    }
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
      `SELECT q.*, m.nome, m.cognome, m.matricola, m.deleted_at FROM quote_membri q JOIN membri m ON q.membro_id = m.id WHERE q.acquisto_id = ? ORDER BY m.cognome ASC`
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

// AGGIORNATO: Registra la data di chiusura
export function setAcquistoCompletato(id: number) {
  return db
    .prepare(
      "UPDATE acquisti SET completato = 1, data_chiusura = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .run(id);
}
