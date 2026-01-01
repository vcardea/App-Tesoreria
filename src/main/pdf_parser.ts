import fs from "fs";

// --- GESTIONE IMPORTAZIONE ROBUSTA ---
// Questo blocco gestisce il fatto che Vite impacchetterà la libreria.
// A volte l'impacchettamento crea oggetti nidificati. Questo codice li "sbuccia".
let pdfLib: any;
try {
  const rawLib = require("pdf-parse");
  // Se è una funzione, usala. Se è un oggetto con .default, usa quello.
  pdfLib = typeof rawLib === "function" ? rawLib : rawLib.default;
} catch (e) {
  console.error("Errore require pdf-parse:", e);
  throw new Error("Libreria PDF non trovata nel bundle.");
}

export interface TransactionMatch {
  linea_originale: string;
  membro_id: number;
  nome_trovato: string;
  importo_trovato: number;
  confidenza: string;
}

// Funzione di pulizia aggressiva
const normalize = (s: string) =>
  s
    ? s
        .toUpperCase()
        .replace(/\s+/g, " ")
        .replace(/[^A-Z0-9., ]/g, "")
        .trim()
    : "";

export async function parseBankStatement(
  filePath: string,
  membri: any[]
): Promise<TransactionMatch[]> {
  try {
    const dataBuffer = fs.readFileSync(filePath);

    // Eseguiamo il parsing
    const data = await pdfLib(dataBuffer);
    const text = data.text;

    console.log("--- DEBUG TESTO PDF ---");
    console.log(text.substring(0, 300) + "..."); // Primi 300 car per sicurezza
    console.log("-----------------------");

    // Divide in righe
    const lines = text
      .split(/\r\n|\r|\n/)
      .filter((l: string) => l.trim().length > 3);
    const matches: TransactionMatch[] = [];

    // Regex Italiana: cattura 1.000,00 o 25,50
    const moneyRegex = /[\d.,]+[.,]\d{2}/;

    for (let i = 0; i < lines.length; i++) {
      const currentLine = normalize(lines[i]);

      // 1. Cerca un importo
      const moneyMatch = currentLine.match(moneyRegex);
      if (!moneyMatch) continue;

      // Pulisci l'importo (1.250,50 -> 1250.50)
      let importoClean = moneyMatch[0];
      if (importoClean.includes(",")) {
        importoClean = importoClean.replace(/\./g, "").replace(",", ".");
      }
      const importo = parseFloat(importoClean);
      if (isNaN(importo)) continue;

      // 2. CREA IL CONTESTO (Riga corrente + 2 precedenti)
      // Questo serve se il nome è scritto sopra l'importo
      const prev1 = i > 0 ? normalize(lines[i - 1]) : "";
      const prev2 = i > 1 ? normalize(lines[i - 2]) : "";
      const context = `${prev2} ${prev1} ${currentLine}`;

      // 3. Cerca Corrispondenze
      for (const m of membri) {
        const nome = normalize(m.nome);
        const cognome = normalize(m.cognome);
        const matricola = m.matricola ? normalize(m.matricola) : "###IGNORE###";

        let found = false;
        let confidenza = "";

        // Check Matricola
        if (matricola !== "###IGNORE###" && context.includes(matricola)) {
          found = true;
          confidenza = "Matricola";
        }
        // Check Nominativo (Cognome + Nome o viceversa)
        else if (context.includes(nome) && context.includes(cognome)) {
          found = true;
          confidenza = "Nominativo";
        }

        if (found) {
          matches.push({
            linea_originale: lines[i].trim(), // La riga originale per riferimento visivo
            membro_id: m.id,
            nome_trovato: `${m.cognome} ${m.nome}`,
            importo_trovato: importo,
            confidenza,
          });
          break; // Passa alla prossima riga/importo
        }
      }
    }

    return matches;
  } catch (error) {
    console.error("ERRORE PARSER:", error);
    throw new Error(
      "Errore lettura PDF. Il file potrebbe essere illeggibile o protetto."
    );
  }
}
