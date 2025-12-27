# 💰 Cassiere - Gestore Tesoreria Locale

Applicazione desktop per la gestione contabile di un'associazione.
Progettata per garantire integrità dei dati, tracciabilità totale e semplicità d'uso in ambiente locale.

## 🚀 Caratteristiche Chiave

- **100% Locale & Offline:** Nessun cloud, nessun server esterno. I dati vivono sul tuo PC.
- **Integrità Finanziaria:** Calcoli basati su interi (centesimi) per evitare errori di virgola mobile.
- **Source of Truth:** Architettura basata su un registro transazioni ("Ledger") immutabile.
- **Importazione Intelligente:** Parsing di estratti conto PDF con algoritmo di riconciliazione assistita.
- **Backup Automatico:** Sistema di sicurezza integrato ad ogni avvio.

## 🛠 Stack Tecnologico

- **Runtime:** Electron (Node.js + Chromium)
- **Linguaggio:** TypeScript (per robustezza e tipizzazione statica)
- **Frontend:** React + Vite + TailwindCSS
- **Database:** SQLite3 (tramite `better-sqlite3`)
- **PDF Engine:** `pdf-parse`

## 🏗 Architettura del Progetto

Il progetto segue una rigorosa separazione tra processi:

1.  **Main Process (Node.js):** Gestisce il database SQLite e le operazioni su file system. È l'unica parte dell'app che può scrivere dati.
2.  **Renderer Process (React):** Interfaccia utente. Comunica con il Main Process tramite IPC (Inter-Process Communication) sicuro.

### Schema Database (SQLite)

Tutti gli importi monetari sono salvati come **INTERI (Centesimi)**.
Esempio: `10,50€` viene salvato come `1050`.

#### 1. `soci`

Anagrafica membri.

- `id` (PK, UUID)
- `matricola` (TEXT, UNIQUE) - Chiave primaria per matching PDF
- `nome`, `cognome` (TEXT)
- `attivo` (BOOLEAN)

#### 2. `progetti_spesa`

Contenitori per raccolte fondi (es. "Felpe 2025").

- `id` (PK, UUID)
- `nome` (TEXT)
- `prezzo_unitario` (INTEGER, Cents)
- `stato` (TEXT): 'APERTO', 'COMPLETATO', 'ARCHIVIATO'

#### 3. `adesioni_progetto`

Tabella di collegamento Socio <-> Progetto.

- `id` (PK, UUID)
- `quantita` (INTEGER)
- `importo_dovuto` (INTEGER, Cents)

#### 4. `transazioni` (Ledger)

Il registro contabile unico. La somma di questa tabella è il Saldo Reale.

- `id` (PK, UUID)
- `data` (TEXT ISO8601)
- `descrizione` (TEXT)
- `importo` (INTEGER, Cents): Positivo (Entrata) o Negativo (Uscita)
- `tipo`: 'INCASSO_QUOTA', 'USCITA_PAGAMENTO', 'GENERICO'
- `fonte`: 'PDF', 'MANUALE'

## 📦 Installazione e Sviluppo

### Prerequisiti

- Node.js (v18 o superiore)
- npm o yarn

### Comandi

```bash
# Installazione dipendenze
npm install

# Avvio in modalità sviluppo (Hot Reload)
npm run dev

# Compilazione per produzione (crea eseguibile Windows)
npm run build
```
