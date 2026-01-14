const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

console.log("\n💀 --- PROTOCOLLO RESET DATABASE --- 💀");

// 1. TERMINA PROCESSI ELETTRONICI (Windows)
// Questo è fondamentale: se il file è aperto, fs.unlink fallisce.
try {
  console.log("1. Tentativo di chiusura forzata di Electron...");
  // Tenta di uccidere electron.exe e qualsiasi processo collegato
  execSync("taskkill /F /IM electron.exe /T", { stdio: "ignore" });
  console.log("   ✅ Processi Electron terminati.");
} catch (e) {
  // Se fallisce, probabilmente non c'era nessun processo aperto. Va bene così.
  console.log("   ℹ️ Nessun processo Electron attivo trovato.");
}

// 2. DEFINIZIONE PERCORSI
// In Windows, il percorso corretto è %APPDATA%\Tesoreria
const appDataPath = process.env.APPDATA
  ? path.join(process.env.APPDATA, "Tesoreria")
  : path.join(os.homedir(), "AppData", "Roaming", "Tesoreria");

const targetDirs = [
  appDataPath, // Cartella di produzione/installazione
  path.join(__dirname, "tesoreria.db"), // Cartella locale del progetto (se presente)
];

const filesToDelete = [
  "tesoreria.db",
  "tesoreria.db-wal", // File temporaneo Write-Ahead Log
  "tesoreria.db-shm", // File temporaneo Shared Memory
];

// 3. ESECUZIONE PULIZIA
let found = false;

console.log("2. Scansione directory...");

targetDirs.forEach((dir) => {
  if (fs.existsSync(dir)) {
    // Se è una cartella (AppData), controlla i file dentro
    if (fs.lstatSync(dir).isDirectory()) {
      filesToDelete.forEach((fileName) => {
        const filePath = path.join(dir, fileName);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`   ✅ ELIMINATO: ${filePath}`);
            found = true;
          } catch (err) {
            console.error(`   ❌ ERRORE: Impossibile eliminare ${filePath}`);
            console.error(`      Motivo: ${err.message}`);
          }
        }
      });
    }
    // Se il percorso targetDirs puntava direttamente a un file (caso locale)
    else if (filesToDelete.includes(path.basename(dir))) {
      console.log(path.basename(dir));
      try {
        fs.unlinkSync(dir);
        console.log(`   ✅ ELIMINATO: ${dir}`);
        found = true;
      } catch (err) {
        console.error(`   ❌ ERRORE: Impossibile eliminare ${dir}`);
      }
    }
  }
});

console.log("-----------------------------------------");
if (found) {
  console.log("✨ DATABASE RESETTATO CON SUCCESSO! ✨");
  console.log("Ora puoi riavviare l'app con: npm run dev");
} else {
  console.log("⚠️ Nessun database trovato.");
  console.log(
    "Probabilmente è già stato cancellato o non hai mai avviato l'app."
  );
}
console.log("-----------------------------------------\n");
