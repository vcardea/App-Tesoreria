const fs = require("fs");
const path = require("path");
const os = require("os");

console.log("--- RESET DATABASE SCRIPT ---");

// Definiamo i percorsi possibili dove Electron salva i dati
const targetPaths = [
  // 1. Cartella locale (Sviluppo)
  path.join(__dirname, "tesoreria.db"),

  // 2. AppData Roaming (Produzione Windows)
  path.join(os.homedir(), "AppData", "Roaming", "Tesoreria", "tesoreria.db"),

  // 3. AppData Roaming (Sviluppo default Electron)
  path.join(os.homedir(), "AppData", "Roaming", "Electron", "tesoreria.db"),

  // 4. User Data generico (caso fallback)
  path.join(
    os.homedir(),
    "AppData",
    "Roaming",
    "tesoreria-app",
    "tesoreria.db"
  ),
];

let deleted = false;

targetPaths.forEach((p) => {
  // Cerchiamo anche i file temporanei WAL e SHM che SQLite crea
  const filesTcCheck = [p, p + "-wal", p + "-shm"];

  filesTcCheck.forEach((f) => {
    if (fs.existsSync(f)) {
      try {
        fs.unlinkSync(f);
        console.log(`✅ CANCELLATO: ${f}`);
        deleted = true;
      } catch (e) {
        console.error(`❌ Errore cancellazione ${f}:`, e.message);
      }
    }
  });
});

if (!deleted) {
  console.log(
    "⚠️ Nessun database trovato nei percorsi standard. Assicurati di aver avviato l'app almeno una volta."
  );
} else {
  console.log("✨ Database resettato con successo.");
}
