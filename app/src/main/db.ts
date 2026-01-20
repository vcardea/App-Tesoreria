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

let db: Database.Database | null = null;

// --- BACKUP SYSTEM ---
function performBackup() {
  if (!fs.existsSync(dbPath)) return null;
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
    fs.copyFileSync(dbPath, path.join(backupDir, backupName));

    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.endsWith(".db"))
      .sort();
    if (files.length > 50) {
      for (let i = 0; i < files.length - 50; i++) {
        try {
          fs.unlinkSync(path.join(backupDir, files[i]));
        } catch (e) {}
      }
    }
    return backupName;
  } catch (e) {
    logSystem("ERROR", "Backup fallito", e);
    return null;
  }
}

export function triggerManualBackup() {
  return performBackup();
}

export function resetAnnualData() {
  if (!db) initDB();
  const safetyBackup = performBackup();
  if (!safetyBackup) return false;

  try {
    const trx = db!.transaction(() => {
      db!.prepare("DELETE FROM quote_membri").run();
      db!.prepare("DELETE FROM acquisti").run();
      db!.prepare("DELETE FROM fondo_cassa").run();
    });
    trx();
    return true;
  } catch (e) {
    logSystem("ERROR", "Reset Annuale Fallito", e);
    return false;
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
    if (db) {
      db.close();
      db = null;
    }
    const source = path.join(backupDir, filename);
    if (!fs.existsSync(source)) return false;
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    } catch (e) {}
    try {
      if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
    } catch (e) {}
    try {
      if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
    } catch (e) {}
    fs.copyFileSync(source, dbPath);
    return true;
  } catch (e) {
    return false;
  }
}

export function initDB() {
  try {
    if (db) return true;
    performBackup();
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    db.exec(
      `CREATE TABLE IF NOT EXISTS membri (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, cognome TEXT NOT NULL, matricola TEXT, deleted_at DATETIME DEFAULT NULL);`,
    );
    db.exec(
      `CREATE TABLE IF NOT EXISTS acquisti (id INTEGER PRIMARY KEY AUTOINCREMENT, nome_acquisto TEXT NOT NULL, prezzo_unitario REAL NOT NULL, completato BOOLEAN DEFAULT 0, data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP, data_chiusura DATETIME DEFAULT NULL, tipo TEXT DEFAULT 'acquisto', acconto_fornitore REAL DEFAULT 0, hidden BOOLEAN DEFAULT 0);`,
    );
    db.exec(
      `CREATE TABLE IF NOT EXISTS quote_membri (id INTEGER PRIMARY KEY AUTOINCREMENT, acquisto_id INTEGER NOT NULL, membro_id INTEGER NOT NULL, quantita INTEGER DEFAULT 1, importo_versato REAL DEFAULT 0, FOREIGN KEY (acquisto_id) REFERENCES acquisti(id) ON DELETE CASCADE, FOREIGN KEY (membro_id) REFERENCES membri(id) ON DELETE CASCADE);`,
    );
    db.exec(
      `CREATE TABLE IF NOT EXISTS fondo_cassa (id INTEGER PRIMARY KEY AUTOINCREMENT, importo REAL NOT NULL, descrizione TEXT, data DATETIME DEFAULT CURRENT_TIMESTAMP, hidden BOOLEAN DEFAULT 0);`,
    );

    try {
      const colsAcq = db.pragma("table_info(acquisti)") as any[];
      if (!colsAcq.some((c) => c.name === "tipo"))
        db.exec("ALTER TABLE acquisti ADD COLUMN tipo TEXT DEFAULT 'acquisto'");
      if (!colsAcq.some((c) => c.name === "acconto_fornitore"))
        db.exec(
          "ALTER TABLE acquisti ADD COLUMN acconto_fornitore REAL DEFAULT 0",
        );
      if (!colsAcq.some((c) => c.name === "hidden"))
        db.exec("ALTER TABLE acquisti ADD COLUMN hidden BOOLEAN DEFAULT 0");
      if (!colsAcq.some((c) => c.name === "data_chiusura")) {
        db.exec(
          "ALTER TABLE acquisti ADD COLUMN data_chiusura DATETIME DEFAULT NULL",
        );
        db.exec(
          "UPDATE acquisti SET data_chiusura = data_creazione WHERE completato = 1",
        );
      }
      const colsFondo = db.pragma("table_info(fondo_cassa)") as any[];
      if (!colsFondo.some((c) => c.name === "hidden"))
        db.exec("ALTER TABLE fondo_cassa ADD COLUMN hidden BOOLEAN DEFAULT 0");
    } catch (e) {}
    return true;
  } catch (error) {
    return false;
  }
}

export function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

export function getSituazioneGlobale() {
  if (!db) initDB();
  const entrate = db!
    .prepare(
      `SELECT (COALESCE((SELECT SUM(importo_versato) FROM quote_membri), 0) + COALESCE((SELECT SUM(importo) FROM fondo_cassa), 0)) as total`,
    )
    .get() as any;
  const usciteFornitori = db!
    .prepare(
      `SELECT SUM(q.quantita * a.prezzo_unitario) as total FROM quote_membri q JOIN acquisti a ON q.acquisto_id = a.id WHERE a.completato = 1 AND a.tipo = 'acquisto'`,
    )
    .get() as any;
  const usciteDirette = db!
    .prepare(
      `SELECT SUM(prezzo_unitario) as total FROM acquisti WHERE tipo = 'spesa_fondo'`,
    )
    .get() as any;
  const acconti = db!
    .prepare(
      `SELECT SUM(acconto_fornitore) as total FROM acquisti WHERE completato = 0 AND tipo = 'acquisto'`,
    )
    .get() as any;
  const vincolati = db!
    .prepare(
      `SELECT SUM(q.importo_versato) as total FROM quote_membri q JOIN acquisti a ON q.acquisto_id = a.id WHERE a.completato = 0 AND a.tipo IN ('acquisto', 'raccolta_fondo')`,
    )
    .get() as any;

  const totaleUscite =
    (usciteFornitori.total || 0) +
    (usciteDirette.total || 0) +
    (acconti.total || 0);
  const reale = (entrate.total || 0) - totaleUscite;
  return {
    fondo_cassa_reale: reale,
    fondi_vincolati: vincolati.total || 0,
    disponibile_effettivo: reale - (vincolati.total || 0),
  };
}

export function getMovimentiFondo() {
  if (!db) initDB();
  // MODIFICATO: Aggiunta la UNION per 'raccolta_fondo' conclusa (entra come somma positiva)
  return db!
    .prepare(
      `
    SELECT * FROM (
        -- 1. Movimenti manuali (Fondo Cassa)
        SELECT 'F-' || id as unique_id, importo, descrizione, data, hidden FROM fondo_cassa
        
        UNION ALL
        
        -- 2. Pagamenti ai Fornitori (Acquisti conclusi) - USCITA
        SELECT 'A-' || a.id, -(a.prezzo_unitario * (SELECT COALESCE(SUM(quantita),0) FROM quote_membri WHERE acquisto_id = a.id)), 'PAGAMENTO: ' || a.nome_acquisto, COALESCE(a.data_chiusura, a.data_creazione), hidden 
        FROM acquisti a WHERE a.completato = 1 AND a.tipo = 'acquisto'
        
        UNION ALL
        
        -- 3. Spese Dirette o Storico - USCITA
        SELECT 'S-' || a.id, -a.prezzo_unitario, 'SPESA DIRETTA: ' || a.nome_acquisto, COALESCE(a.data_chiusura, a.data_creazione), hidden 
        FROM acquisti a WHERE a.tipo IN ('spesa_fondo', 'storico')

        UNION ALL

        -- 4. Raccolta Fondi Conclusa - ENTRATA (Nuovo)
        SELECT 'R-' || a.id, (SELECT COALESCE(SUM(importo_versato), 0) FROM quote_membri WHERE acquisto_id = a.id), 'RACCOLTA: ' || a.nome_acquisto, COALESCE(a.data_chiusura, a.data_creazione), hidden
        FROM acquisti a WHERE a.completato = 1 AND a.tipo = 'raccolta_fondo'

    ) ORDER BY datetime(data) DESC LIMIT 100
  `,
    )
    .all();
}

export function toggleDashboardVisibility(uniqueId: string) {
  if (!db) initDB();
  const type = uniqueId.substring(0, 2);
  const id = parseInt(uniqueId.substring(2));

  // Supporto per i vari prefissi
  if (type === "F-") {
    const cur = db!
      .prepare("SELECT hidden FROM fondo_cassa WHERE id = ?")
      .get(id) as any;
    if (cur)
      db!
        .prepare("UPDATE fondo_cassa SET hidden = ? WHERE id = ?")
        .run(cur.hidden ? 0 : 1, id);
  } else {
    // A-, S-, R- sono tutti nella tabella acquisti
    const cur = db!
      .prepare("SELECT hidden FROM acquisti WHERE id = ?")
      .get(id) as any;
    if (cur)
      db!
        .prepare("UPDATE acquisti SET hidden = ? WHERE id = ?")
        .run(cur.hidden ? 0 : 1, id);
  }
  return true;
}

export function deleteMovimentoFondo(id: number) {
  if (!db) initDB();
  return db!.prepare("DELETE FROM fondo_cassa WHERE id = ?").run(id);
}

export function createAcquisto(
  n: string,
  p: number,
  acconto: number,
  targetIds: any[] | null,
  tipo: string,
  date?: string,
) {
  if (!db) initDB();
  const trx = db!.transaction(() => {
    const isCompleted = tipo === "spesa_fondo" || tipo === "storico" ? 1 : 0;
    const creationDate = date
      ? new Date(date).toISOString()
      : new Date().toISOString();
    const dataChiusura = isCompleted ? creationDate : null;

    const id = db!
      .prepare(
        "INSERT INTO acquisti (nome_acquisto, prezzo_unitario, acconto_fornitore, tipo, completato, data_creazione, data_chiusura, hidden) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
      )
      .run(
        n,
        p,
        acconto || 0,
        tipo,
        isCompleted,
        creationDate,
        dataChiusura,
      ).lastInsertRowid;

    if (tipo !== "spesa_fondo" && tipo !== "storico") {
      if (targetIds && targetIds.length > 0) {
        const stmt = db!.prepare(
          "INSERT INTO quote_membri (acquisto_id, membro_id, quantita, importo_versato) VALUES (?, ?, 1, ?)",
        );
        for (const target of targetIds) {
          const mId = typeof target === "number" ? target : target.id;
          const versato =
            typeof target === "object" && target.versato ? target.versato : 0;
          stmt.run(id, mId, versato);
        }
      } else {
        db!
          .prepare(
            `INSERT INTO quote_membri (acquisto_id, membro_id, quantita, importo_versato) SELECT ?, id, 1, 0 FROM membri WHERE deleted_at IS NULL`,
          )
          .run(id);
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
  acconto: number,
  targetIds?: number[],
  date?: string,
) {
  if (!db) initDB();
  const trx = db!.transaction(() => {
    db!
      .prepare(
        "UPDATE acquisti SET nome_acquisto = ?, prezzo_unitario = ?, acconto_fornitore = ? WHERE id = ?",
      )
      .run(n, p, acconto, id);
    if (date) {
      const isoDate = new Date(date).toISOString();
      db!
        .prepare("UPDATE acquisti SET data_creazione = ? WHERE id = ?")
        .run(isoDate, id);
      db!
        .prepare(
          "UPDATE acquisti SET data_chiusura = ? WHERE id = ? AND completato = 1",
        )
        .run(isoDate, id);
    }
    if (targetIds) {
      const currentQuotes = db!
        .prepare("SELECT membro_id FROM quote_membri WHERE acquisto_id = ?")
        .all(id) as any[];
      const currentIds = currentQuotes.map((q) => q.membro_id);
      const toAdd = targetIds.filter((tid) => !currentIds.includes(tid));
      const toRemove = currentIds.filter((cid) => !targetIds.includes(cid));
      if (toAdd.length > 0) {
        const stmtAdd = db!.prepare(
          "INSERT INTO quote_membri (acquisto_id, membro_id, quantita, importo_versato) VALUES (?, ?, 1, 0)",
        );
        toAdd.forEach((mid) => stmtAdd.run(id, mid));
      }
      if (toRemove.length > 0) {
        const stmtRem = db!.prepare(
          "DELETE FROM quote_membri WHERE acquisto_id = ? AND membro_id = ?",
        );
        toRemove.forEach((mid) => stmtRem.run(id, mid));
      }
    }
  });
  return trx();
}

export function deleteAcquisto(id: number) {
  if (!db) initDB();
  return db!.prepare("DELETE FROM acquisti WHERE id = ?").run(id);
}
export function getAcquisti() {
  if (!db) initDB();
  return db!
    .prepare(`SELECT * FROM acquisti ORDER BY data_creazione DESC`)
    .all();
}
export function getQuoteAcquisto(id: number) {
  if (!db) initDB();
  return db!
    .prepare(
      `SELECT q.*, m.nome, m.cognome, m.matricola FROM quote_membri q JOIN membri m ON q.membro_id = m.id WHERE q.acquisto_id = ? ORDER BY m.cognome ASC`,
    )
    .all(id);
}
export function updateQuota(id: number, q: number, v: number) {
  if (!db) initDB();
  return db!
    .prepare(
      "UPDATE quote_membri SET quantita = ?, importo_versato = ? WHERE id = ?",
    )
    .run(q, v, id);
}
export function setAcquistoCompletato(id: number) {
  if (!db) initDB();
  return db!
    .prepare(
      "UPDATE acquisti SET completato = 1, data_chiusura = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .run(id);
}
export function getMembri() {
  if (!db) initDB();
  return db!
    .prepare(
      "SELECT * FROM membri WHERE deleted_at IS NULL ORDER BY cognome ASC",
    )
    .all();
}
export function addMembro(m: any) {
  if (!db) initDB();
  const ex = db!
    .prepare("SELECT id, deleted_at FROM membri WHERE nome = ? AND cognome = ?")
    .get(m.nome, m.cognome) as any;
  if (ex && ex.deleted_at)
    return db!
      .prepare(
        "UPDATE membri SET deleted_at = NULL, matricola = ? WHERE id = ?",
      )
      .run(m.matricola, ex.id);
  else if (!ex)
    return db!
      .prepare("INSERT INTO membri (nome, cognome, matricola) VALUES (?, ?, ?)")
      .run(m.nome, m.cognome, m.matricola);
  return { changes: 0 };
}
export function updateMembro(id: number, m: any) {
  if (!db) initDB();
  return db!
    .prepare(
      "UPDATE membri SET nome = ?, cognome = ?, matricola = ? WHERE id = ?",
    )
    .run(m.nome, m.cognome, m.matricola, id);
}
export function deleteMembro(id: number) {
  if (!db) initDB();
  return db!
    .prepare("UPDATE membri SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(id);
}
export function deleteAllMembri() {
  if (!db) initDB();
  return db!
    .prepare(
      "UPDATE membri SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL",
    )
    .run();
}
export function addMovimentoFondo(i: number, d: string) {
  if (!db) initDB();
  return db!
    .prepare("INSERT INTO fondo_cassa (importo, descrizione) VALUES (?, ?)")
    .run(i, d);
}
