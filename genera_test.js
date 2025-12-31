const PDFDocument = require("pdfkit");
const fs = require("fs");

const doc = new PDFDocument({ margin: 50 });
doc.pipe(fs.createWriteStream("estratto_pulito.pdf"));

// Header
doc.fontSize(14).text("ESTRATTO CONTO MOVIMENTI", { align: "center" });
doc.moveDown(2);

// Dati SENZA RUMORE (Solo i membri che hai nel DB)
const transactions = [
  // Mario Rossi (M001)
  { text: "BONIFICO DA ROSSI MARIO - MATRICOLA M001", amount: "25,00" },
  // Luigi Bianchi (M002) - Test con nome prima del cognome
  { text: "VERSAMENTO QUOTA LUIGI BIANCHI", amount: "30,50" },
  // Giuseppe Verdi (M003) - Test con cognome prima
  { text: "BONIFICO VERDI GIUSEPPE SALDO", amount: "50,00" },
];

doc.font("Helvetica").fontSize(11);

// Disegna righe semplici: Testo a sinistra, Soldi a destra
transactions.forEach((t) => {
  let y = doc.y;

  // Descrizione larga a sinistra
  doc.text(t.text, 50, y, { width: 400 });

  // Importo allineato a destra
  doc.text(t.amount, 450, y, { width: 100, align: "right" });

  doc.moveDown(2); // Spazio ampio per evitare sovrapposizioni
});

doc.end();
console.log("✅ 'estratto_pulito.pdf' generato. Contiene SOLO i 3 membri.");
