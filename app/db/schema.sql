-- QUESTO FILE È SOLO PER DOCUMENTAZIONE
-- La struttura reale viene creata e aggiornata automaticamente da src/main/db.ts
-- 1. TABELLA MEMBRI
-- Gestisce l'anagrafica. Supporta il Soft Delete per non perdere lo storico pagamenti.
CREATE TABLE
    membri (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cognome TEXT NOT NULL,
        matricola TEXT,
        deleted_at DATETIME DEFAULT NULL -- Se popolato, il membro è "cancellato" (nascosto)
    );

-- 2. TABELLA ACQUISTI
-- Gestisce sia gli acquisti da dividere (quote) che le spese dirette dal fondo.
CREATE TABLE
    acquisti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome_acquisto TEXT NOT NULL,
        prezzo_unitario REAL NOT NULL,
        completato BOOLEAN DEFAULT 0, -- 0 = Aperto, 1 = Chiuso
        data_creazione DATETIME DEFAULT CURRENT_TIMESTAMP,
        acconto_fornitore REAL DEFAULT 0, -- Anticipo versato al fornitore
        is_fund_expense BOOLEAN DEFAULT 0 -- 1 = Spesa diretta dal Fondo (nessuna quota generata)
    );

-- 3. TABELLA QUOTE_MEMBRI
-- Collega i Membri agli Acquisti. Tiene traccia di quanto ognuno deve e ha versato.
CREATE TABLE
    quote_membri (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        acquisto_id INTEGER NOT NULL,
        membro_id INTEGER NOT NULL,
        quantita INTEGER DEFAULT 1, -- Modificabile per ogni membro
        importo_versato REAL DEFAULT 0,
        -- Vincoli di integrità: se cancello l'acquisto o il membro (hard delete), spariscono le quote
        FOREIGN KEY (acquisto_id) REFERENCES acquisti (id) ON DELETE CASCADE,
        FOREIGN KEY (membro_id) REFERENCES membri (id) ON DELETE CASCADE
    );

-- 4. TABELLA FONDO_CASSA
-- Storico di tutti i movimenti di cassa (entrate/uscite extra o spese dirette).
CREATE TABLE
    fondo_cassa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        importo REAL NOT NULL, -- Positivo = Entrata, Negativo = Uscita
        descrizione TEXT,
        data DATETIME DEFAULT CURRENT_TIMESTAMP
    );