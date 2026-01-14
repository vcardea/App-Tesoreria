# 💰 Tesoreria - Gestore Contabile per Associazioni

**Tesoreria** è un'applicazione desktop progettata per semplificare la gestione economica di associazioni, gruppi studenteschi o piccoli enti.

Dimentica i fogli Excel disordinati e i calcoli manuali: questo software offre un ambiente sicuro, privato e automatizzato per tracciare quote, spese e fondi cassa, garantendo che ogni centesimo sia sempre contabilizzato.

## ✨ Perché usare Tesoreria?

* **🔒 Privacy Assoluta (100% Offline):** I tuoi dati finanziari non lasciano mai il tuo computer. Nessun cloud, nessun abbonamento, nessun server esterno.
* **🤖 Riconciliazione Intelligente:** Carica il PDF del tuo estratto conto bancario: il software analizza le transazioni e segna automaticamente chi ha pagato le quote (es. "Tute Sci", "Iscrizione 2025").
* **🎯 Gestione Progetti:** Crea raccolte fondi specifiche (es. "Merchandising", "Viaggio") e assegna le quote solo ai membri interessati.
* **🛡️ Sicurezza dei Dati:**
* Sistema di **Backup Automatico** ad ogni avvio.
* Calcoli finanziari precisi al centesimo (zero errori di arrotondamento).

## 🚀 Come si usa

Il flusso di lavoro è pensato per essere lineare e veloce:

1. **Gestione Membri:** Importa o inserisci l'anagrafica dei soci.
2. **Crea un Acquisto:** Definisci una spesa o una raccolta fondi (es. "Felpe 2026 - 35€").
3. **Assegna Quote:** Seleziona chi deve partecipare alla spesa (tutti i membri o solo un gruppo specifico).
4. **Registra i Pagamenti:**

* *Manuale:* Segna i pagamenti in contanti.
* *Automatico:* Importa l'estratto conto della banca e lascia che il software trovi le corrispondenze.

5. **Controlla il Fondo:** Monitora in tempo reale il "Reale" (soldi in banca/cassa) e il "Disponibile" (soldi al netto delle spese impegnate).

## 🛠 Dettagli Tecnici

Per gli sviluppatori o i curiosi, ecco come è costruito il progetto. L'architettura è moderna e robusta, basata su standard industriali.

**Tech Stack:**

* **Runtime:** [Electron](https://www.electronjs.org/) (per creare l'app desktop cross-platform).
* **Frontend:** React + Vite + TailwindCSS (per un'interfaccia veloce e reattiva).
* **Backend Locale:** Node.js + TypeScript.
* **Database:** SQLite3 (tramite `better-sqlite3`). I dati risiedono in un file `.db` locale criptabile.
* **Engine PDF:** `pdf-parse` per l'analisi dei documenti bancari.

**Nota sull'integrità:** Tutti i calcoli monetari sono eseguiti utilizzando **interi** (in centesimi) per evitare i classici errori di virgola mobile dei linguaggi di programmazione.

## 📦 Installazione e Sviluppo

Se vuoi contribuire o compilare il software da zero:

### Prerequisiti

* Node.js (versione 18 o superiore) installato sul sistema.

### Comandi Rapidi

1. **Installa le dipendenze:**

```bash
npm install

```

1. **Avvia in modalità sviluppo:**
Apre l'app con hot-reload attivo per modifiche in tempo reale.

```bash
npm run dev

```

1. **Genera l'eseguibile (Build):**
Crea il file di installazione (`.exe` su Windows) pronto per la distribuzione nella cartella `release`.

```bash
npm run build

```
