import fs from "fs";
import path from "path";
import { app } from "electron";

const logPath = path.join(app.getPath("userData"), "system.log");

// Assicura che il file esista
if (!fs.existsSync(logPath)) {
  fs.writeFileSync(
    logPath,
    `--- LOG INIZIATO IL ${new Date().toLocaleString()} ---\n`
  );
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

  // Scrittura sincrona per essere sicuri di non perdere nulla in caso di crash
  try {
    fs.appendFileSync(logPath, logLine);
    // Stampa anche in console per il dev
    console.log(logLine.trim());
  } catch (e) {
    console.error("Fallimento scrittura log:", e);
  }
}

export function getLogPath() {
  return logPath;
}
