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

export interface UnmatchedTransaction {
  linea_originale: string;
  importo: number;
  data_movimento?: Date;
}

export interface ExcelAnalysisResult {
  matched: TransactionMatch[];
  unmatched: UnmatchedTransaction[];
}

const normalize = (s: any) => {
  if (!s) return "";
  return String(s)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();
};

const parseItalianCurrency = (value: any): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  let str = String(value)
    .trim()
    .replace(/[€$£\s]/g, "");
  if (str.includes(",")) {
    if (str.includes(".")) str = str.replace(/\./g, "");
    str = str.replace(",", ".");
  }
  const result = parseFloat(str);
  return isNaN(result) ? 0 : result;
};

const parseExcelDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }
  if (typeof value === "string") {
    const cleanStr = value.trim();
    if (cleanStr.includes("/")) {
      const parts = cleanStr.split("/");
      if (parts.length === 3)
        return new Date(
          parseInt(parts[2]),
          parseInt(parts[1]) - 1,
          parseInt(parts[0]),
        );
    }
    if (cleanStr.includes("-")) {
      const parts = cleanStr.split("-");
      if (parts.length === 3)
        return new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
        );
    }
  }
  return null;
};

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

export async function parseBankStatement(
  filePath: string,
  membri: any[],
): Promise<ExcelAnalysisResult> {
  try {
    const workbook = getWorkbook(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
    });

    let idxAvere = -1;
    let idxDesc = -1;
    let idxData = -1;

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

    if (idxAvere === -1) idxAvere = 3;
    if (idxDesc === -1) idxDesc = 6;
    if (idxData === -1) idxData = 1;

    const result: ExcelAnalysisResult = { matched: [], unmatched: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const importoRaw = row[idxAvere];
      if (!importoRaw) continue;

      const importo = parseItalianCurrency(importoRaw);
      if (isNaN(importo) || importo <= 0.01) continue;

      const dataMovimento =
        idxData > -1 ? parseExcelDate(row[idxData]) : undefined;
      const descrizione = row[idxDesc] ? String(row[idxDesc]) : row.join(" ");
      const searchString = normalize(descrizione);

      let found = false;
      for (const m of membri) {
        const nome = normalize(m.nome);
        const cognome = normalize(m.cognome);
        if (
          nome.length > 2 &&
          cognome.length > 2 &&
          searchString.includes(nome) &&
          searchString.includes(cognome)
        ) {
          result.matched.push({
            linea_originale: descrizione.substring(0, 80) + "...",
            membro_id: m.id,
            nome_trovato: `${m.cognome} ${m.nome}`,
            importo_trovato: importo,
            data_movimento: dataMovimento || undefined,
            confidenza: "Nome+Cognome",
          });
          found = true;
          break;
        }
      }

      if (!found) {
        result.unmatched.push({
          linea_originale: descrizione,
          importo: importo,
          data_movimento: dataMovimento || undefined,
        });
      }
    }
    return result;
  } catch (error: any) {
    console.error("Errore Bank Parser:", error);
    if (error.message.includes("APERTO IN EXCEL")) throw error;
    throw new Error("Errore lettura file Banca. Controlla il formato.");
  }
}

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
    if (!headerFound)
      throw new Error(
        "Non ho trovato le colonne COGNOME e NOME nel file (Riga 1).",
      );
    return newMembers;
  } catch (e: any) {
    if (e.message.includes("APERTO IN EXCEL")) throw e;
    throw new Error(
      "Impossibile leggere l'elenco membri. Verifica che contenga le colonne COGNOME e NOME.",
    );
  }
}
