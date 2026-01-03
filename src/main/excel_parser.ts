import * as XLSX from 'xlsx';
import fs from 'fs';

export interface TransactionMatch {
  linea_originale: string;
  membro_id: number;
  nome_trovato: string;
  importo_trovato: number;
  confidenza: string;
}

const normalize = (s: any) => {
  if (!s) return "";
  return String(s).toUpperCase().replace(/\s+/g, " ").replace(/[^A-Z0-9 ]/g, "").trim();
};

// Funzione helper per leggere il file in modo sicuro
function getWorkbook(filePath: string) {
  try {
    // Leggiamo il buffer manualmente per intercettare errori di file bloccati
    const fileBuffer = fs.readFileSync(filePath);
    // type: 'buffer' permette a XLSX di capire da solo se è CSV, XLS o XLSX
    return XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
  } catch (error: any) {
    if (error.code === 'EBUSY' || error.code === 'EPERM') {
      throw new Error("IL FILE È APERTO IN EXCEL. Chiudilo e riprova.");
    }
    throw error;
  }
}

// --- PARSER ESTRATTO CONTO (CSV/XLS) ---
export async function parseBankStatement(filePath: string, membri: any[]): Promise<TransactionMatch[]> {
  try {
    const workbook = getWorkbook(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }); // raw: false ci da stringhe, meglio per i CSV sporchi

    // Cerchiamo l'indice della colonna "AVERE" (Accrediti)
    let idxAvere = -1;
    let idxDesc = -1;

    // 1. Scansione intestazione intelligente
    for (let r = 0; r < Math.min(rows.length, 20); r++) {
        const rowStr = rows[r].map(c => normalize(c));
        // Nel tuo file: Data contabile, Valuta, Dare, Avere, Divisa...
        if (rowStr.includes("AVERE")) idxAvere = rowStr.indexOf("AVERE");
        if (rowStr.includes("DESCRIZIONE") || rowStr.includes("CAUSALE")) idxDesc = rowStr.indexOf("DESCRIZIONE") > -1 ? rowStr.indexOf("DESCRIZIONE") : rowStr.indexOf("CAUSALE");
        
        if (idxAvere > -1 && idxDesc > -1) break; 
    }

    // Fallback se non trova header (basato sul tuo snippet)
    if (idxAvere === -1) idxAvere = 3; // 4a colonna
    if (idxDesc === -1) idxDesc = 6;  // 7a colonna

    const matches: TransactionMatch[] = [];

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;

        // Pulizia Importo: Il tuo file ha "25,00" o "121.0"
        let importoRaw = row[idxAvere];
        if (!importoRaw) continue;

        // Pulisci stringa importo (toglie punti migliaia, sostituisce virgola con punto)
        let importoStr = String(importoRaw).replace(/\./g, '').replace(',', '.'); 
        // Se era già un numero excel (es 45.0), normalize lo gestisce
        
        const importo = parseFloat(importoStr);

        // Se è NaN o <= 0, salta
        if (isNaN(importo) || importo <= 0.01) continue;

        const descrizione = row[idxDesc] ? String(row[idxDesc]) : row.join(" "); // Fallback su tutta la riga
        const searchString = normalize(descrizione);

        for (const m of membri) {
            const nome = normalize(m.nome);
            const cognome = normalize(m.cognome);
            
            // Match rigoroso: Deve contenere NOME e COGNOME
            if (searchString.includes(nome) && searchString.includes(cognome)) {
                matches.push({
                    linea_originale: descrizione.substring(0, 80) + "...", // Taglia per leggibilità
                    membro_id: m.id,
                    nome_trovato: `${m.cognome} ${m.nome}`,
                    importo_trovato: importo,
                    confidenza: "CSV Match"
                });
                break; // Trovato, passa alla prossima riga
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

// --- PARSER ELENCO MEMBRI (Struttura Guardia di Finanza) ---
export async function parseMembersList(filePath: string): Promise<any[]> {
    try {
        const workbook = getWorkbook(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        const newMembers: any[] = [];
        let headerFound = false;
        let idxCognome = -1;
        let idxNome = -1;
        let idxGrado = -1;

        for (const row of rows) {
            const rowNorm = row.map(c => normalize(c));

            // 1. Cerca la riga di intestazione (N., GRADO, COGNOME, NOME...)
            if (!headerFound) {
                if (rowNorm.includes("COGNOME") && rowNorm.includes("NOME")) {
                    headerFound = true;
                    idxCognome = rowNorm.indexOf("COGNOME");
                    idxNome = rowNorm.indexOf("NOME");
                    idxGrado = rowNorm.indexOf("GRADO");
                    continue;
                }
            } 
            
            // 2. Leggi i dati solo dopo aver trovato l'header
            if (headerFound) {
                if (!row[idxCognome] || !row[idxNome]) continue;
                
                // Stop se troviamo la riga dei totali
                if (String(row[idxCognome]).toUpperCase().includes("TOTALE")) break;

                const cognome = String(row[idxCognome]).trim().toUpperCase();
                const nome = String(row[idxNome]).trim().toUpperCase();
                
                // Salta righe vuote o sporche
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
        throw new Error("Impossibile leggere l'elenco membri. Verifica che contenga COGNOME e NOME.");
    }
}