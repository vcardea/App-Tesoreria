import fs from "fs";
import path from "path";
import { app, shell } from "electron";

const logPath = path.join(app.getPath("userData"), "system.log");

// Assicura che il file esista all'avvio
if (!fs.existsSync(logPath)) {
  try {
    fs.writeFileSync(
      logPath,
      `--- LOG INIZIATO IL ${new Date().toLocaleString()} ---\n`
    );
  } catch (e) {
    console.error("Impossibile creare file di log:", e);
  }
}

export function logSystem(
  level: "INFO" | "ERROR" | "ACTION" | "DB",
  message: string,
  data?: any
) {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] [${level}] ${message}`;

  if (data) {
    try {
      logLine += ` | DATA: ${JSON.stringify(data)}`;
    } catch (e) {
      logLine += ` | DATA: [Circular/Unserializable]`;
    }
  }

  logLine += "\n";

  // Scrittura sincrona (blocca pochissimo, ma è sicura)
  try {
    fs.appendFileSync(logPath, logLine);
    // Stampa anche nella console di sviluppo (terminale)
    console.log(logLine.trim());
  } catch (e) {
    console.error("Fallimento scrittura log:", e);
  }
}

// QUESTA È LA FUNZIONE CHE MANCAVA O NON ERA ESPORTATA
export function openSystemLog() {
  logSystem("ACTION", "Apertura file di log richiesta dall'utente");
  shell.openPath(logPath);
}

export function getLogPath() {
  return logPath;
}
