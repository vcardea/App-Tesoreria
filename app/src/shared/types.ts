/**
 * src/shared/types.ts
 *
 * Questo file contiene le "interfacce". In TypeScript, un'interfaccia è come
 * un contratto: definisce quali campi DEVE avere un oggetto.
 *
 * È condiviso sia dal backend (Electron/Node) che dal frontend (React),
 * così siamo sicuri che parlino la stessa lingua.
 */

// --- TIPI DI BASE (Stringhe specifiche per limitare i valori possibili) ---

// Un socio può essere solo in uno di questi stati.
// Se provi a scrivere "CANCELLATO", TS ti darà errore.
export type StatoProgetto = "APERTO" | "COMPLETATO" | "ARCHIVIATO";

export type TipoTransazione = "INCASSO_QUOTA" | "USCITA_PAGAMENTO" | "GENERICO";

export type FonteTransazione = "PDF_IMPORT" | "MANUALE" | "SISTEMA";

// --- ENTITÀ DEL DATABASE ---

/**
 * Rappresenta un membro dell'associazione.
 */
export interface Socio {
  // UUID (Universally Unique Identifier). Es: "550e8400-e29b..."
  // Usiamo stringhe invece di numeri auto-incrementali per evitare conflitti.
  id: string;

  // La matricola è fondamentale per il riconoscimento nei PDF.
  matricola: string;

  nome: string;
  cognome: string;

  // In SQL è 0 o 1, ma in TS lo trattiamo come boolean (true/false) per comodità.
  attivo: boolean;
}

/**
 * Rappresenta una voce nel "Libro Giornale" (Ledger).
 * È l'unica fonte di verità per i saldi.
 */
export interface Transazione {
  id: string;

  // Salviamo le date come stringhe ISO (es. "2023-12-25T10:00:00Z")
  // perché SQLite non ha un tipo "Date" nativo.
  data: string;

  descrizione: string;

  /**
   * IMPORTANTE: Usiamo numeri INTERI per i soldi.
   * Esempio: 10,50€ diventa 1050.
   * Questo evita errori di arrotondamento tipici dei computer (floating point math).
   */
  importo_cents: number;

  tipo: TipoTransazione;

  // Il "?" significa che questo campo è OPZIONALE (può essere undefined/null).
  // Una transazione generica potrebbe non avere un socio collegato.
  id_socio?: string;
  id_progetto?: string;

  fonte: FonteTransazione;
}

/**
 * Un "Progetto" è un raccoglitore per una spesa collettiva (es. "Felpe").
 */
export interface ProgettoSpesa {
  id: string;
  nome: string;
  prezzo_unitario_cents: number;
  stato: StatoProgetto;
}
