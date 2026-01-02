import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { logSystem } from "./logger";

export interface TransactionMatch {
  linea_originale: string;
  membro_id: number;
  nome_trovato: string;
  importo_trovato: number;
  confidenza: string;
}

export async function parseBankStatement(
  filePath: string,
  membri: any[]
): Promise<TransactionMatch[]> {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("members", JSON.stringify(membri));

    logSystem("INFO", "Invio richiesta al server Python...");

    const response = await axios.post("http://127.0.0.1:8000/parse-pdf", form, {
      headers: { ...form.getHeaders() },
      timeout: 10000, // 10 secondi di timeout
    });

    if (response.data && response.data.status === "ok") {
      logSystem(
        "INFO",
        `Ricevuti ${response.data.matches.length} match da Python`
      );
      return response.data.matches;
    }

    return [];
  } catch (error: any) {
    logSystem("ERROR", `Errore comunicazione motore Python: ${error.message}`);
    throw new Error(
      "Il motore di analisi Python non risponde. Verifica i log."
    );
  }
}
