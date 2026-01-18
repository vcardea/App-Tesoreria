import Database from "better-sqlite3";
import inquirer from "inquirer";
import path from "path";

// --- CONFIGURAZIONE ---
const DB_PATH = path.resolve(
  "{REDACTED}",
); // <--- CAMBIA QUESTO PERCORSO SE SERVE
// ----------------------

const db = new Database(DB_PATH);

async function main() {
  console.clear();
  console.log("🔧 SQLite Interactive Cleaner (Transaction Safe)\n");

  while (true) {
    // 1. Trova tutte le tabelle
    const tables = db
      .prepare(
        `
      SELECT name FROM sqlite_schema 
      WHERE type='table' AND name NOT LIKE 'sqlite_%';
    `,
      )
      .all()
      .map((r: any) => r.name);

    if (tables.length === 0) {
      console.log("❌ Nessuna tabella trovata nel database.");
      return;
    }

    console.log(tables);

    // 2. Chiedi all'utente quale tabella aprire
    const { selectedTable } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedTable",
        message: "Seleziona una tabella da ispezionare:",
        choices: [...tables, new inquirer.Separator(), "USCIRE"],
      },
    ]);

    if (selectedTable === "USCIRE") {
      console.log("Bye.");
      db.close();
      process.exit(0);
    }

    await manageTable(selectedTable);
  }
}

async function manageTable(tableName: string) {
  // CORREZIONE: Usiamo 'AS rid' per forzare SQLite a restituire l'ID con un nome che JavaScript legge sicuro
  const rows = db
    .prepare(
      `SELECT rowid as rid, * FROM ${tableName} ORDER BY rowid DESC LIMIT 50`,
    )
    .all();

  if (rows.length === 0) {
    console.log(`⚠️  La tabella '${tableName}' è vuota.\n`);
    return;
  }

  // Formatta le righe per la visualizzazione nella lista
  const choices = rows.map((row: any) => {
    // Estraiamo 'rid' (il nostro rowid forzato) e il resto dei dati
    const { rid, ...data } = row;

    // Crea una stringa riassuntiva dei dati (primi 3 campi)
    const preview = Object.values(data).slice(0, 3).join(" | ");

    return {
      name: `[ID:${rid}] ${preview.substring(0, 80)}...`,
      value: rid, // <--- ORA QUESTO SARA' UN NUMERO, NON UNDEFINED
      short: `ID:${rid}`,
    };
  });

  // 4. Selezione Multipla
  const { idsToDelete } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "idsToDelete",
      message: `Seleziona le righe da cancellare in '${tableName}' (Spazio per selezionare, Invio per confermare):`,
      choices: choices,
      pageSize: 20,
    },
  ]);

  if (idsToDelete.length === 0) {
    console.log("Nessuna riga selezionata.\n");
    return;
  }

  // 5. TRANSAZIONE SICURA
  await executeSafeDelete(tableName, idsToDelete);
}

async function executeSafeDelete(tableName: string, rowids: number[]) {
  console.log(`\n🚨 Tentativo di cancellazione di ${rowids.length} record...`);

  // Prepariamo la query
  const deleteStmt = db.prepare(`DELETE FROM ${tableName} WHERE rowid = ?`);

  // Eseguiamo dentro una transazione "controllata manualmente"
  const transaction = db.transaction(() => {
    let deleted = 0;
    for (const id of rowids) {
      const info = deleteStmt.run(id);
      deleted += info.changes;
    }
    return deleted;
  });

  try {
    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: `⚠️  SEI SICURO? Questa azione rimuoverà definitivamente ${rowids.length} righe.`,
        default: false,
      },
    ]);

    if (confirm) {
      const count = transaction(); // ESEGUE E COMMITTA
      console.log(`✅ FATTO. Cancellate ${count} righe.\n`);
    } else {
      console.log(`⛔ ANNULLATO. Nessuna modifica apportata.\n`);
    }
  } catch (error) {
    console.error("❌ Errore durante la transazione:", error);
  }
}

main();
