import * as XLSX from "xlsx";
import fs from "fs";

export interface TransactionMatch {
  linea_originale: string;
  membro_id: number;
  nome_trovato: string;
  importo_trovato: number;
  data_movimento?: Date;
  confidenza: string;
}

// Funzione di pulizia stringhe (Rimuove caratteri speciali, tiene solo lettere/numeri)
const normalize = (s: any) => {
  if (!s) return "";
  return String(s)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
};

// --- PARSER VALUTA ITALIANA (Gestisce 1.000,00 e 1000.00) ---
const parseItalianCurrency = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;

  let str = String(value).trim();
  // Rimuove simboli valuta
  str = str.replace(/[€$£\s]/g, "");

  // Se c'è una virgola, assumiamo formato IT (1.000,00)
  if (str.includes(",")) {
    // Via i punti delle migliaia
    if (str.includes(".")) str = str.replace(/\./g, "");
    // Virgola diventa punto
    str = str.replace(",", ".");
  }

  const result = parseFloat(str);
  return isNaN(result) ? 0 : result;
};

// --- PARSER DATE EXCEL (Numeri seriali o stringhe) ---
const parseExcelDate = (value: any): Date | null => {
  if (!value) return null;

  // Caso 1: Excel Serial Number (es. 44562)
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }

  // Caso 2: Stringa
  if (typeof value === "string") {
    const cleanStr = value.trim();
    // Prova formato DD/MM/YYYY
    if (cleanStr.includes("/")) {
      const parts = cleanStr.split("/");
      if (parts.length === 3)
        return new Date(
          parseInt(parts[2]),
          parseInt(parts[1]) - 1,
          parseInt(parts[0])
        );
    }
    // Prova formato YYYY-MM-DD
    if (cleanStr.includes("-")) {
      const parts = cleanStr.split("-");
      if (parts.length === 3)
        return new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2])
        );
    }
  }
  return null;
};

// --- HELPER LETTURA SICURA (Bypassa il blocco file di Windows) ---
function getWorkbook(filePath: string) {
  try {
    // Leggiamo il file come buffer in RAM, così Node non chiede lock esclusivi
    const fileBuffer = fs.readFileSync(filePath);
    return XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  } catch (error: any) {
    if (error.code === "EBUSY" || error.code === "EPERM") {
      throw new Error("IL FILE È APERTO IN EXCEL. Chiudilo e riprova.");
    }
    throw error;
  }
}

// --- PARSER ESTRATTO CONTO (CSV/XLS) ---
export async function parseBankStatement(
  filePath: string,
  membri: any[]
): Promise<TransactionMatch[]> {
  try {
    const workbook = getWorkbook(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
    });

    // Cerchiamo indici colonne
    let idxAvere = -1;
    let idxDesc = -1;
    let idxData = -1;

    // 1. Scansione intestazione (Prime 20 righe)
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const rowStr = rows[r].map((c) => normalize(c));

      // Cerca colonna AVERE o ACCREDITI
      if (rowStr.includes("AVERE") || rowStr.includes("ACCREDITI"))
        idxAvere =
          rowStr.indexOf("AVERE") > -1
            ? rowStr.indexOf("AVERE")
            : rowStr.indexOf("ACCREDITI");

      // Cerca colonna DESCRIZIONE o CAUSALE
      if (rowStr.includes("DESCRIZIONE") || rowStr.includes("CAUSALE"))
        idxDesc =
          rowStr.indexOf("DESCRIZIONE") > -1
            ? rowStr.indexOf("DESCRIZIONE")
            : rowStr.indexOf("CAUSALE");

      // Cerca colonna DATA
      if (rowStr.includes("DATA") || rowStr.includes("OPERAZIONE"))
        idxData =
          rowStr.indexOf("DATA") > -1
            ? rowStr.indexOf("DATA")
            : rowStr.indexOf("OPERAZIONE");

      if (idxAvere > -1 && idxDesc > -1) break;
    }

    // Fallback manuali se non trova intestazioni (es. CSV grezzo)
    if (idxAvere === -1) idxAvere = 3;
    if (idxDesc === -1) idxDesc = 6;
    if (idxData === -1) idxData = 1;

    const matches: TransactionMatch[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const importoRaw = row[idxAvere];
      if (!importoRaw) continue;

      // Parsing Importo
      const importo = parseItalianCurrency(importoRaw);

      // Se è NaN o <= 0, salta (cerchiamo solo entrate)
      if (isNaN(importo) || importo <= 0.01) continue;

      // Parsing Data
      const dataMovimento =
        idxData > -1 ? parseExcelDate(row[idxData]) : undefined;

      // Parsing Descrizione
      const descrizione = row[idxDesc] ? String(row[idxDesc]) : row.join(" ");
      const searchString = normalize(descrizione);

      // Matching con i Membri (Solo Nome e Cognome)
      for (const m of membri) {
        const nome = normalize(m.nome);
        const cognome = normalize(m.cognome);

        // Controllo robusto: devono esserci entrambi
        if (
          nome.length > 2 &&
          cognome.length > 2 &&
          searchString.includes(nome) &&
          searchString.includes(cognome)
        ) {
          matches.push({
            linea_originale: descrizione.substring(0, 80) + "...",
            membro_id: m.id,
            nome_trovato: `${m.cognome} ${m.nome}`,
            importo_trovato: importo,
            data_movimento: dataMovimento || undefined,
            confidenza: "Nome+Cognome",
          });
          break; // Trovato, passa alla prossima riga dell'excel
        }
      }
    }
    return matches;
  } catch (error: any) {
    console.error("Errore Bank Parser:", error);
    if (error.message.includes("APERTO IN EXCEL")) throw error;
    throw new Error("Errore lettura file Banca. Controlla il formato.");
  }
}

// --- PARSER ELENCO MEMBRI (NO MATRICOLA) ---
export async function parseMembersList(filePath: string): Promise<any[]> {
  try {
    const workbook = getWorkbook(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
    });

    const newMembers: any[] = [];
    let headerFound = false;
    let idxCognome = -1;
    let idxNome = -1;

    for (const row of rows) {
      const rowNorm = row.map((c) => normalize(c));

      // 1. Cerca intestazioni
      if (!headerFound) {
        if (rowNorm.includes("COGNOME") && rowNorm.includes("NOME")) {
          headerFound = true;
          idxCognome = rowNorm.indexOf("COGNOME");
          idxNome = rowNorm.indexOf("NOME");
          continue;
        }
      }

      // 2. Leggi dati
      if (headerFound) {
        // Controllo esistenza celle
        if (!row[idxCognome] || !row[idxNome]) continue;

        // Stop se troviamo riga di totale
        if (String(row[idxCognome]).toUpperCase().includes("TOTALE")) break;

        const cognome = String(row[idxCognome]).trim().toUpperCase();
        const nome = String(row[idxNome]).trim().toUpperCase();

        // Validazione minima lunghezza
        if (cognome.length < 2 || nome.length < 2) continue;

        // Push senza matricola
        newMembers.push({ nome, cognome });
      }
    }

    if (!headerFound) {
      throw new Error(
        "Non ho trovato le colonne COGNOME e NOME nel file (Riga 1)."
      );
    }

    return newMembers;
  } catch (e: any) {
    console.error("Errore parser membri:", e);
    if (e.message.includes("APERTO IN EXCEL")) throw e;
    throw new Error(
      "Impossibile leggere l'elenco membri. Verifica che contenga le colonne COGNOME e NOME."
    );
  }
}
