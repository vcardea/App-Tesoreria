const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

console.log("\n💀 --- PROTOCOLLO RESET DATABASE --- 💀");

// 1. CHIUSURA FORZATA (Per sbloccare i file)
try {
  console.log("1. Chiusura forzata processi Electron...");
  execSync("taskkill /F /IM electron.exe /T", { stdio: "ignore" });
} catch (e) {
  // Ignora se non ci sono processi
}

// 2. DEFINIZIONE PERCORSI MIRATI
const roaming = path.join(os.homedir(), "AppData", "Roaming");

// Lista di tutte le possibili cartelle create da Electron in base al package.json
const possibleFolders = [
  path.join(roaming, "App Tesoreria"), // <--- QUESTA è quella definita nel tuo productName!
  path.join(roaming, "Tesoreria"),
  path.join(roaming, "app-tesoreria"), // Quella che hai trovato tu
  path.join(roaming, "tesoreria-app"),
  path.join(roaming, "Electron"), // Default in dev
  __dirname, // Cartella locale
];

const filesToDelete = ["tesoreria.db", "tesoreria.db-wal", "tesoreria.db-shm"];

// 3. CANCELLAZIONE
let deletedCount = 0;

console.log("2. Scansione percorsi...");

possibleFolders.forEach((folderPath) => {
  if (fs.existsSync(folderPath)) {
    // Se è una cartella, cerca i file dentro
    if (fs.lstatSync(folderPath).isDirectory()) {
      filesToDelete.forEach((fileName) => {
        const fullPath = path.join(folderPath, fileName);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
            console.log(`   ✅ ELIMINATO: ${fullPath}`);
            deletedCount++;
          } catch (err) {
            console.error(`   ❌ ERRORE su ${fullPath}: ${err.message}`);
          }
        }
      });
    }
    // Se per caso il percorso punta direttamente al file (caso locale)
    else if (filesToDelete.includes(path.basename(folderPath))) {
      try {
        fs.unlinkSync(folderPath);
        console.log(`   ✅ ELIMINATO: ${folderPath}`);
        deletedCount++;
      } catch (err) {
        console.error(`   ❌ ERRORE: ${err.message}`);
      }
    }
  }
});

console.log("-----------------------------------------");
if (deletedCount > 0) {
  console.log(`✨ Successo! Eliminati ${deletedCount} file del database.`);
  console.log("   Ora puoi riavviare l'app pulita.");
} else {
  console.log("⚠️  Nessun database trovato.");
  console.log("   Controlla manualmente in: " + roaming);
}
console.log("-----------------------------------------\n");
