import * as XLSX from "xlsx";
import fs from "fs";

export interface TransactionMatch {
  linea_originale: string;
  membro_id: number;
  nome_trovato: string;
  importo_trovato: number;
  data_movimento?: Date; // Campo data aggiunto
  confidenza: string;
}

const normalize = (s: any) => {
  if (!s) return "";
  return String(s)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
};

// --- PARSER VALUTA ITALIANA (FIX CRITICO: 12,00 -> 12.00) ---
const parseItalianCurrency = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;

  let str = String(value).trim();
  // Se c'è una virgola, assumiamo formato IT.
  // Rimuoviamo i punti (migliaia) e sostituiamo la virgola con punto decimale.
  if (str.includes(",")) {
    if (str.includes(".")) str = str.replace(/\./g, "");
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

// Funzione helper per leggere il file in modo sicuro
function getWorkbook(filePath: string) {
  try {
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

    // 1. Scansione intestazione
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const rowStr = rows[r].map((c) => normalize(c));
      if (rowStr.includes("AVERE") || rowStr.includes("ACCREDITI"))
        idxAvere =
          rowStr.indexOf("AVERE") > -1
            ? rowStr.indexOf("AVERE")
            : rowStr.indexOf("ACCREDITI");
      if (rowStr.includes("DESCRIZIONE") || rowStr.includes("CAUSALE"))
        idxDesc =
          rowStr.indexOf("DESCRIZIONE") > -1
            ? rowStr.indexOf("DESCRIZIONE")
            : rowStr.indexOf("CAUSALE");
      if (rowStr.includes("DATA") || rowStr.includes("OPERAZIONE"))
        idxData =
          rowStr.indexOf("DATA") > -1
            ? rowStr.indexOf("DATA")
            : rowStr.indexOf("OPERAZIONE");

      if (idxAvere > -1 && idxDesc > -1) break;
    }

    // Fallback manuali
    if (idxAvere === -1) idxAvere = 3;
    if (idxDesc === -1) idxDesc = 6;
    if (idxData === -1) idxData = 1; // Seconda colonna da sinistra come richiesto

    const matches: TransactionMatch[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const importoRaw = row[idxAvere];
      if (!importoRaw) continue;

      // USA IL PARSER SICURO
      const importo = parseItalianCurrency(importoRaw);

      // Se è NaN o <= 0, salta
      if (isNaN(importo) || importo <= 0.01) continue;

      // Recupera data se possibile
      const dataMovimento =
        idxData > -1 ? parseExcelDate(row[idxData]) : undefined;

      const descrizione = row[idxDesc] ? String(row[idxDesc]) : row.join(" ");
      const searchString = normalize(descrizione);

      for (const m of membri) {
        const nome = normalize(m.nome);
        const cognome = normalize(m.cognome);

        if (searchString.includes(nome) && searchString.includes(cognome)) {
          matches.push({
            linea_originale: descrizione.substring(0, 80) + "...",
            membro_id: m.id,
            nome_trovato: `${m.cognome} ${m.nome}`,
            importo_trovato: importo,
            data_movimento: dataMovimento || undefined,
            confidenza: "CSV Match",
          });
          break;
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

// --- PARSER ELENCO MEMBRI ---
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

      if (!headerFound) {
        if (rowNorm.includes("COGNOME") && rowNorm.includes("NOME")) {
          headerFound = true;
          idxCognome = rowNorm.indexOf("COGNOME");
          idxNome = rowNorm.indexOf("NOME");
          continue;
        }
      }

      if (headerFound) {
        if (!row[idxCognome] || !row[idxNome]) continue;
        if (String(row[idxCognome]).toUpperCase().includes("TOTALE")) break;

        const cognome = String(row[idxCognome]).trim().toUpperCase();
        const nome = String(row[idxNome]).trim().toUpperCase();

        if (cognome.length < 2 || nome.length < 2) continue;

        newMembers.push({ nome, cognome });
      }
    }

    if (!headerFound) {
      throw new Error("Non ho trovato le colonne COGNOME e NOME nel file.");
    }

    return newMembers;
  } catch (e: any) {
    console.error("Errore parser membri:", e);
    if (e.message.includes("APERTO IN EXCEL")) throw e;
    throw new Error(
      "Impossibile leggere l'elenco membri. Verifica che contenga COGNOME e NOME."
    );
  }
}
