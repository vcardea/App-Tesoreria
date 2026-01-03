import React, { useState, useEffect } from "react";
import {
  Users,
  LayoutDashboard,
  ShoppingCart,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Wallet,
  AlertTriangle,
  Settings,
  Save,
  ArrowRight,
  FolderOpen,
  FileCode,
  Edit2,
  FileSpreadsheet,
  Download,
} from "lucide-react";

interface Quota {
  id: number;
  membro_id: number;
  nome: string;
  cognome: string;
  matricola: string;
  quantita: number;
  importo_versato: number;
}
declare global {
  interface Window {
    api: any;
  }
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    amount
  );
const cleanInput = (val: string) =>
  val.toUpperCase().replace(/[^A-Z0-9À-ÖØ-öø-ÿ' ]/g, "");
const formatDate = (date: any) => new Date(date).toLocaleString("it-IT");

const CustomModal = ({
  isOpen,
  title,
  children,
  onClose,
  actions,
  variant = "neutral",
}: any) => {
  if (!isOpen) return null;
  const styles = {
    neutral: {
      border: "border-gray-700",
      bgHead: "bg-gray-800",
      textHead: "text-white",
      icon: null,
    },
    danger: {
      border: "border-red-900",
      bgHead: "bg-red-900/40",
      textHead: "text-red-200",
      icon: <AlertTriangle className="mr-2" size={24} />,
    },
    success: {
      border: "border-green-900",
      bgHead: "bg-green-900/40",
      textHead: "text-green-200",
      icon: <CheckCircle className="mr-2" size={24} />,
    },
    warning: {
      border: "border-yellow-900",
      bgHead: "bg-yellow-900/40",
      textHead: "text-yellow-200",
      icon: <AlertCircle className="mr-2" size={24} />,
    },
  };
  const s = styles[variant as keyof typeof styles] || styles.neutral;
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div
        className={`w-full max-w-lg bg-gray-950 rounded-2xl shadow-2xl border ${s.border} flex flex-col overflow-hidden`}
      >
        <div
          className={`px-6 py-4 flex justify-between items-center border-b ${s.border} ${s.bgHead}`}
        >
          <h3 className={`text-xl font-bold flex items-center ${s.textHead}`}>
            {s.icon}
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/20 text-white/70 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 text-gray-300">{children}</div>
        {actions && (
          <div
            className={`px-6 py-4 bg-gray-900/50 border-t ${s.border} flex justify-end space-x-3`}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [situazione, setSituazione] = useState({
    fondo_cassa_reale: 0,
    fondi_vincolati: 0,
    disponibile_effettivo: 0,
  });
  const [membri, setMembri] = useState([]);
  const [acquisti, setAcquisti] = useState([]);
  const [selectedAcquisto, setSelectedAcquisto] = useState<any>(null);
  const [quote, setQuote] = useState<Quota[]>([]);
  const [movimentiFondo, setMovimentiFondo] = useState([]);
  const [backups, setBackups] = useState([]);

  const [newMembro, setNewMembro] = useState({
    nome: "",
    cognome: "",
    matricola: "",
  });
  const [editingMembroId, setEditingMembroId] = useState<number | null>(null);
  const [newAcq, setNewAcq] = useState({ nome: "", prezzo: "", acconto: "" });
  const [editingAcq, setEditingAcq] = useState<{
    id: number;
    nome: string;
    prezzo: string;
    acconto: string;
  } | null>(null);
  const [newMovimentoFondo, setNewMovimentoFondo] = useState({
    importo: "",
    descrizione: "",
  });

  const [excelMatches, setExcelMatches] = useState<any[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<number[]>([]);

  // MODALE STATE
  const [modal, setModal] = useState<{
    view:
      | "none"
      | "excel_bank"
      | "fondo"
      | "confirm_delete_acquisto"
      | "confirm_delete_membro"
      | "confirm_purchase"
      | "confirm_restore"
      | "alert"
      | "edit_acquisto";
    data?: any;
  }>({ view: "none" });

  const loadData = async () => {
    try {
      setSituazione(await window.api.getSituazione());
      setMembri(await window.api.getMembri());
      setAcquisti(await window.api.getAcquisti());
      setMovimentiFondo(await window.api.getMovimentiFondo());
      setBackups(await window.api.getBackups());
    } catch (e) {
      console.error("Errore caricamento dati:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- FUNZIONI MEMBRI ---
  const handleSaveMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMembro.nome || !newMembro.cognome) return;

    if (editingMembroId) {
      await window.api.updateMembro(editingMembroId, newMembro);
      setEditingMembroId(null);
    } else {
      await window.api.addMembro(newMembro);
    }
    setNewMembro({ nome: "", cognome: "", matricola: "" });
    loadData();
  };

  const startEditMembro = (m: any) => {
    setNewMembro({
      nome: m.nome,
      cognome: m.cognome,
      matricola: m.matricola || "",
    });
    setEditingMembroId(m.id);
  };

  const cancelEditMembro = () => {
    setNewMembro({ nome: "", cognome: "", matricola: "" });
    setEditingMembroId(null);
  };

  const handleImportMembriExcel = async () => {
    const path = await window.api.selectFile();
    if (!path) return;
    try {
      const count = await window.api.importMembriExcel(path);
      setModal({
        view: "alert",
        data: {
          title: "Importazione Completata",
          msg: `Aggiunti ${count} nuovi membri.`,
        },
      });
      loadData();
    } catch (e: any) {
      const msg =
        e.message && e.message.includes("APERTO IN EXCEL")
          ? e.message
          : "Errore lettura file. Assicurati che sia chiuso e nel formato corretto.";
      setModal({ view: "alert", data: { title: "Errore Importazione", msg } });
    }
  };

  // --- FUNZIONI ACQUISTI ---
  const handleSaveAcquisto = async () => {
    if (!newAcq.nome || !newAcq.prezzo) return;
    await window.api.createAcquisto({
      nome: newAcq.nome,
      prezzo: parseFloat(newAcq.prezzo),
      acconto: newAcq.acconto ? parseFloat(newAcq.acconto) : 0,
    });
    setNewAcq({ nome: "", prezzo: "", acconto: "" });
    loadData();
  };

  const handleUpdateAcquisto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAcq) return;
    await window.api.updateAcquisto({
      id: editingAcq.id,
      nome: editingAcq.nome,
      prezzo: parseFloat(editingAcq.prezzo),
      acconto: editingAcq.acconto ? parseFloat(editingAcq.acconto) : 0,
    });
    setModal({ view: "none" });
    if (selectedAcquisto && selectedAcquisto.id === editingAcq.id) {
      const updatedList = await window.api.getAcquisti();
      const updated = updatedList.find((a: any) => a.id === editingAcq.id);
      setSelectedAcquisto(updated);
    }
    loadData();
  };

  const handleDeleteAcquistoRequest = (id: number) => {
    setModal({ view: "confirm_delete_acquisto", data: { id } });
  };

  const confirmDeleteAcquisto = async () => {
    if (!modal.data?.id) return;
    await window.api.deleteAcquisto(modal.data.id);
    if (selectedAcquisto && selectedAcquisto.id === modal.data.id)
      setSelectedAcquisto(null);
    setModal({ view: "none" });
    loadData();
  };

  // --- BANK EXCEL ---
  const handleBankExcelUpload = async () => {
    const path = await window.api.selectFile();
    if (!path) return;
    try {
      const matches = await window.api.analyzeExcelBank(path);
      if (matches.length === 0) {
        setModal({
          view: "alert",
          data: {
            title: "Nessun Risultato",
            msg: "Controlla il file.\nAssicurati che ci sia la colonna AVERE o gli importi positivi.",
          },
        });
        return;
      }
      setExcelMatches(matches);
      setSelectedMatches(matches.map((_: any, i: number) => i));
      setModal({ view: "excel_bank" });
    } catch (e: any) {
      const msg =
        e.message && e.message.includes("APERTO IN EXCEL")
          ? e.message
          : "Impossibile leggere il file.";
      setModal({ view: "alert", data: { title: "Errore", msg } });
    }
  };

  const confirmImportBank = async () => {
    for (const i of selectedMatches) {
      const m = excelMatches[i];
      const q = quote.find((x) => x.membro_id === m.membro_id);
      if (q)
        await window.api.updateQuota({
          id: q.id,
          qta: q.quantita,
          versato: m.importo_trovato,
        });
    }
    setModal({ view: "none" });
    const qUpdated = await window.api.getQuote(selectedAcquisto.id);
    setQuote(qUpdated);
    loadData();
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm("L'app verrà riavviata. Continuare?")) return;
    const success = await window.api.restoreBackup(filename);
    if (!success) {
      setModal({
        view: "alert",
        data: {
          title: "Errore",
          msg: "Il ripristino è fallito. Controlla i log.",
        },
      });
    }
  };

  // --- RENDER ---
  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden relative">
      {/* MODALI NUOVI */}
      <CustomModal
        isOpen={modal.view === "confirm_delete_acquisto"}
        title="Elimina Acquisto"
        onClose={() => setModal({ view: "none" })}
        variant="danger"
        actions={
          <>
            <button
              onClick={() => setModal({ view: "none" })}
              className="px-4 py-2 rounded bg-transparent hover:bg-white/10 font-bold"
            >
              Annulla
            </button>
            <button
              onClick={confirmDeleteAcquisto}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 font-bold text-white shadow-lg"
            >
              Elimina
            </button>
          </>
        }
      >
        <p>Sei sicuro di voler eliminare questo acquisto?</p>
        <p className="text-sm opacity-70 mt-2">
          Tutti i dati dei versamenti associati andranno persi.
        </p>
      </CustomModal>

      <CustomModal
        isOpen={modal.view === "alert"}
        title={modal.data?.title}
        onClose={() => setModal({ view: "none" })}
        variant="warning"
        actions={
          <button
            onClick={() => setModal({ view: "none" })}
            className="px-4 py-2 rounded bg-gray-800 border border-gray-600 font-bold hover:bg-gray-700"
          >
            Ho Capito
          </button>
        }
      >
        <p className="whitespace-pre-wrap text-lg">{modal.data?.msg}</p>
      </CustomModal>

      <CustomModal
        isOpen={modal.view === "edit_acquisto"}
        title="Modifica Acquisto"
        onClose={() => setModal({ view: "none" })}
        variant="neutral"
      >
        {editingAcq && (
          <form onSubmit={handleUpdateAcquisto} className="space-y-4">
            <input
              value={editingAcq.nome}
              onChange={(e) =>
                setEditingAcq({ ...editingAcq, nome: e.target.value })
              }
              className="w-full bg-black p-3 rounded border border-gray-700 text-white"
              placeholder="Nome"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">PREZZO UNITARIO</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingAcq.prezzo}
                  onChange={(e) =>
                    setEditingAcq({ ...editingAcq, prezzo: e.target.value })
                  }
                  className="w-full bg-black p-3 rounded border border-gray-700 text-white"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  ACCONTO FORNITORE
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editingAcq.acconto}
                  onChange={(e) =>
                    setEditingAcq({ ...editingAcq, acconto: e.target.value })
                  }
                  className="w-full bg-black p-3 rounded border border-gray-700 text-blue-300"
                  placeholder="0.00"
                />
              </div>
            </div>
            <button className="w-full bg-blue-600 p-3 rounded font-bold hover:bg-blue-500">
              SALVA MODIFICHE
            </button>
          </form>
        )}
      </CustomModal>

      {modal.view === "excel_bank" && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-8">
          <div className="bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between bg-gray-800">
              <h3 className="text-xl font-bold flex items-center">
                <FileSpreadsheet className="mr-2 text-green-500" /> Importazione
                Banca
              </h3>
              <button onClick={() => setModal({ view: "none" })}>
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left">
                <thead className="text-gray-500 uppercase text-xs sticky top-0 bg-gray-900">
                  <tr>
                    <th className="p-3 w-10"></th>
                    <th className="p-3">Membro</th>
                    <th className="p-3">Importo</th>
                    <th className="p-3">Dettaglio</th>
                  </tr>
                </thead>
                <tbody>
                  {excelMatches.map((m, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-800 cursor-pointer ${
                        selectedMatches.includes(i)
                          ? "bg-green-900/20"
                          : "hover:bg-gray-800/50"
                      }`}
                      onClick={() =>
                        setSelectedMatches((prev) =>
                          prev.includes(i)
                            ? prev.filter((x) => x !== i)
                            : [...prev, i]
                        )
                      }
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedMatches.includes(i)}
                          readOnly
                        />
                      </td>
                      <td className="p-3 font-bold">{m.nome_trovato}</td>
                      <td className="p-3 font-mono text-green-400">
                        {formatCurrency(m.importo_trovato)}
                      </td>
                      <td className="p-3 text-xs text-gray-500 truncate max-w-md">
                        {m.linea_originale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-gray-700 bg-gray-800 flex justify-between">
              <span className="text-gray-400">
                Selezionati: <b>{selectedMatches.length}</b>
              </span>
              <button
                onClick={confirmImportBank}
                className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-lg font-bold"
              >
                IMPORTA
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomModal
        isOpen={modal.view === "fondo"}
        title="Fondo Manuale"
        onClose={() => setModal({ view: "none" })}
        variant="neutral"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await window.api.addMovimentoFondo({
              importo: parseFloat(newMovimentoFondo.importo),
              descrizione: newMovimentoFondo.descrizione,
            });
            setModal({ view: "none" });
            setNewMovimentoFondo({ importo: "", descrizione: "" });
            loadData();
          }}
          className="space-y-4"
        >
          <input
            type="number"
            step="0.01"
            placeholder="Importo"
            className="w-full bg-black p-4 rounded-xl border border-gray-700 font-bold text-xl outline-none focus:border-blue-500"
            value={newMovimentoFondo.importo}
            onChange={(e) =>
              setNewMovimentoFondo({
                ...newMovimentoFondo,
                importo: e.target.value,
              })
            }
            autoFocus
            required
          />
          <input
            type="text"
            placeholder="Descrizione"
            className="w-full bg-black p-4 rounded-xl border border-gray-700 outline-none focus:border-blue-500"
            value={newMovimentoFondo.descrizione}
            onChange={(e) =>
              setNewMovimentoFondo({
                ...newMovimentoFondo,
                descrizione: e.target.value,
              })
            }
            required
          />
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
            >
              Salva Movimento
            </button>
          </div>
        </form>
      </CustomModal>

      <CustomModal
        isOpen={modal.view === "confirm_purchase"}
        title="Riepilogo Chiusura"
        onClose={() => setModal({ view: "none" })}
        variant="neutral"
        actions={
          <>
            <button
              onClick={() => setModal({ view: "none" })}
              className="px-4 py-2 rounded font-bold hover:bg-white/10"
            >
              Torna Indietro
            </button>
            <button
              onClick={async () => {
                await window.api.completaAcquisto(modal.data.id);
                await loadData();
                setSelectedAcquisto({ ...selectedAcquisto, completato: 1 });
                setModal({ view: "none" });
              }}
              className="px-4 py-2 rounded bg-green-600 font-bold text-white shadow-lg hover:bg-green-500 flex items-center"
            >
              <CheckCircle size={18} className="mr-2" /> Conferma Chiusura
            </button>
          </>
        }
      >
        {modal.data && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-gray-800">
              <div className="text-center w-1/3">
                <span className="text-xs text-gray-500 uppercase font-bold block mb-1">
                  Dovuto Totale
                </span>
                <span className="text-xl font-bold text-white">
                  {formatCurrency(modal.data.dovuto)}
                </span>
              </div>
              <div className="text-gray-600">
                <ArrowRight />
              </div>
              <div className="text-center w-1/3">
                <span className="text-xs text-gray-500 uppercase font-bold block mb-1">
                  Incassato
                </span>
                <span className="text-xl font-bold text-blue-400">
                  {formatCurrency(modal.data.versato)}
                </span>
              </div>
            </div>
            <div
              className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center ${
                modal.data.diff > 0
                  ? "bg-red-900/10 border-red-500/30 text-red-400"
                  : modal.data.diff < 0
                  ? "bg-green-900/10 border-green-500/30 text-green-400"
                  : "bg-gray-800/50 border-gray-600 text-gray-300"
              }`}
            >
              <h4 className="font-bold text-lg uppercase tracking-wider mb-1">
                {modal.data.diff > 0
                  ? "Deficit"
                  : modal.data.diff < 0
                  ? "Surplus"
                  : "Perfetto"}
              </h4>
              <div className="text-4xl font-bold mb-2">
                {formatCurrency(Math.abs(modal.data.diff))}
              </div>
            </div>
          </div>
        )}
      </CustomModal>

      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
        <h1 className="text-xl font-bold mb-8 px-2 text-green-500 flex items-center">
          <span className="bg-green-500 text-black w-8 h-8 flex items-center justify-center rounded-lg mr-2 font-bold">
            T
          </span>{" "}
          Tesoriere
        </h1>
        <nav className="flex-1 space-y-2">
          {["dashboard", "membri", "acquisti"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center w-full p-3 rounded-lg transition capitalize ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              {tab === "dashboard" && (
                <LayoutDashboard size={20} className="mr-3" />
              )}
              {tab === "membri" && <Users size={20} className="mr-3" />}
              {tab === "acquisti" && (
                <ShoppingCart size={20} className="mr-3" />
              )}
              {tab}
            </button>
          ))}
        </nav>
        <div className="mt-auto border-t border-gray-800 pt-4 space-y-2">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center w-full p-3 rounded-lg transition ${
              activeTab === "settings"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:bg-gray-800"
            }`}
          >
            <Settings size={20} className="mr-3" /> Impostazioni
          </button>
          <button
            onClick={() => window.api.quitApp()}
            className="flex items-center w-full p-3 rounded-lg bg-green-900/30 text-green-400 border border-green-900/50 hover:bg-green-900/50 transition"
          >
            <Save size={20} className="mr-3" /> Salva ed Esci
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto p-8 bg-gray-950">
        {activeTab === "dashboard" && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Situazione Contabile</h2>
              <button
                onClick={() => setModal({ view: "fondo" })}
                className="bg-gray-800 text-white px-4 py-2 rounded flex items-center text-sm font-bold border border-gray-700 hover:bg-gray-700"
              >
                <Wallet size={16} className="mr-2" /> Gestione Fondo
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-gray-400 font-bold text-xs uppercase mb-2">
                  Cassa Reale
                </p>
                <p className="text-5xl font-bold">
                  {formatCurrency(situazione.fondo_cassa_reale)}
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl">
                <p className="text-gray-400 font-bold text-xs uppercase mb-2">
                  Vincolato
                </p>
                <p className="text-4xl font-bold text-yellow-500">
                  -{formatCurrency(situazione.fondi_vincolati)}
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl border border-blue-900/30 shadow-xl">
                <p className="text-blue-400 font-bold text-xs uppercase mb-2">
                  Disponibile
                </p>
                <p className="text-5xl font-bold text-blue-400">
                  {formatCurrency(situazione.disponibile_effettivo)}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "membri" && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white">Membri</h2>
              <button
                onClick={handleImportMembriExcel}
                className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center font-bold transition"
              >
                <Download className="mr-2" size={18} /> Importa Elenco Excel
              </button>
            </div>
            <form
              onSubmit={handleSaveMembro}
              className={`p-6 rounded-xl border mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end transition-colors ${
                editingMembroId
                  ? "bg-blue-900/20 border-blue-500"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  MATRICOLA
                </label>
                <input
                  className="w-full bg-black p-3 rounded border border-gray-700 text-blue-300 font-mono focus:border-blue-500 outline-none"
                  value={newMembro.matricola}
                  onChange={(e) =>
                    setNewMembro({
                      ...newMembro,
                      matricola: cleanInput(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  COGNOME
                </label>
                <input
                  required
                  className="w-full bg-black p-3 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                  value={newMembro.cognome}
                  onChange={(e) =>
                    setNewMembro({
                      ...newMembro,
                      cognome: cleanInput(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  NOME
                </label>
                <input
                  required
                  className="w-full bg-black p-3 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                  value={newMembro.nome}
                  onChange={(e) =>
                    setNewMembro({
                      ...newMembro,
                      nome: cleanInput(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex gap-2">
                {editingMembroId && (
                  <button
                    type="button"
                    onClick={cancelEditMembro}
                    className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded font-bold transition flex-1"
                  >
                    ANNULLA
                  </button>
                )}
                <button
                  type="submit"
                  className={`${
                    editingMembroId
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "bg-green-600 hover:bg-green-500"
                  } text-white p-3 rounded font-bold transition flex-1`}
                >
                  {editingMembroId ? "SALVA" : "AGGIUNGI"}
                </button>
              </div>
            </form>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-800 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="p-4">Matricola</th>
                    <th className="p-4">Nome</th>
                    <th className="p-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {membri.map((m: any) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50"
                    >
                      <td className="p-4 font-mono text-blue-300">
                        {m.matricola}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {m.cognome} {m.nome}
                      </td>
                      <td className="p-4 text-right flex justify-end gap-2">
                        <button
                          onClick={() => startEditMembro(m)}
                          className="text-gray-400 hover:text-blue-400 p-2"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Eliminare membro?"))
                              window.api.deleteMembro(m.id).then(loadData);
                          }}
                          className="text-gray-400 hover:text-red-400 p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "acquisti" && (
          <div className="grid grid-cols-12 gap-8 h-full">
            <div className="col-span-4 flex flex-col h-full overflow-hidden">
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6 space-y-3">
                <h3 className="font-bold text-green-400 mb-2">
                  NUOVO ACQUISTO
                </h3>
                <input
                  placeholder="Nome"
                  className="w-full bg-black p-3 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                  value={newAcq.nome}
                  onChange={(e) =>
                    setNewAcq({ ...newAcq, nome: e.target.value })
                  }
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Prezzo"
                    className="w-full bg-black p-3 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                    value={newAcq.prezzo}
                    onChange={(e) =>
                      setNewAcq({ ...newAcq, prezzo: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    placeholder="Acconto"
                    className="w-full bg-black p-3 rounded border border-gray-700 text-blue-300 focus:border-blue-500 outline-none"
                    value={newAcq.acconto}
                    onChange={(e) =>
                      setNewAcq({ ...newAcq, acconto: e.target.value })
                    }
                  />
                </div>
                <button
                  onClick={handleSaveAcquisto}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded font-bold transition"
                >
                  CREA
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {acquisti.map((a: any) => (
                  <div
                    key={a.id}
                    onClick={async () => {
                      setSelectedAcquisto(a);
                      setQuote(await window.api.getQuote(a.id));
                    }}
                    className={`p-4 rounded border cursor-pointer flex justify-between items-center transition ${
                      selectedAcquisto?.id === a.id
                        ? "border-blue-500 bg-blue-900/20"
                        : "border-gray-800 bg-gray-900 hover:bg-gray-800"
                    }`}
                  >
                    <div>
                      <p className="font-bold text-white">{a.nome_acquisto}</p>
                      <p className="text-sm text-gray-400">
                        {formatCurrency(a.prezzo_unitario)}
                      </p>
                    </div>
                    {a.completato ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : (
                      <AlertCircle className="text-yellow-500" size={20} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-8 flex flex-col h-full overflow-hidden">
              {selectedAcquisto ? (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 h-full flex flex-col">
                  <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/50 rounded-t-2xl">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {selectedAcquisto.nome_acquisto}
                        {!selectedAcquisto.completato && (
                          <button
                            onClick={() => {
                              setEditingAcq({
                                id: selectedAcquisto.id,
                                nome: selectedAcquisto.nome_acquisto,
                                prezzo: String(
                                  selectedAcquisto.prezzo_unitario
                                ),
                                acconto: String(
                                  selectedAcquisto.acconto_fornitore || 0
                                ),
                              });
                              setModal({ view: "edit_acquisto" });
                            }}
                            className="text-gray-500 hover:text-white"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {!selectedAcquisto.completato && (
                          <button
                            onClick={() =>
                              handleDeleteAcquistoRequest(selectedAcquisto.id)
                            }
                            className="text-gray-500 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </h2>
                      <div className="text-sm text-gray-400 mt-1 flex gap-4">
                        <span>
                          Prezzo:{" "}
                          <b className="text-white">
                            {formatCurrency(selectedAcquisto.prezzo_unitario)}
                          </b>
                        </span>
                        <span>
                          Acconto:{" "}
                          <b className="text-blue-300">
                            {formatCurrency(
                              selectedAcquisto.acconto_fornitore || 0
                            )}
                          </b>
                        </span>
                        <span>
                          Stato:{" "}
                          <span
                            className={
                              selectedAcquisto.completato
                                ? "text-green-400 font-bold"
                                : "text-yellow-400 font-bold"
                            }
                          >
                            {selectedAcquisto.completato
                              ? "CONCLUSO"
                              : "APERTO"}
                          </span>
                        </span>
                      </div>
                    </div>
                    {!selectedAcquisto.completato && (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleBankExcelUpload}
                          className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center transition"
                        >
                          <FileSpreadsheet className="mr-2" size={18} /> Importa
                          Banca
                        </button>
                        <button
                          onClick={() => {
                            let d = 0,
                              v = 0;
                            quote.forEach((q: any) => {
                              d +=
                                q.quantita * selectedAcquisto.prezzo_unitario;
                              v += q.importo_versato;
                            });
                            setModal({
                              view: "confirm_purchase",
                              data: {
                                diff: d - v,
                                dovuto: d,
                                versato: v,
                                id: selectedAcquisto.id,
                              },
                            });
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center transition"
                        >
                          <CheckCircle className="mr-2" size={18} /> Concludi
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-950 text-gray-500 text-xs uppercase sticky top-0">
                        <tr>
                          <th className="p-4">Membro</th>
                          <th className="p-4 text-center">Qtà</th>
                          <th className="p-4 text-right">Dovuto</th>
                          <th className="p-4 text-right">Versato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.map((q: any) => {
                          const dov =
                            q.quantita * selectedAcquisto.prezzo_unitario;
                          const err =
                            q.importo_versato < 0 || q.importo_versato > dov;
                          return (
                            <tr
                              key={q.id}
                              className="border-b border-gray-800 hover:bg-gray-800/30"
                            >
                              <td className="p-4">
                                <div className="font-bold text-base text-white">
                                  {q.cognome} {q.nome}
                                </div>
                                {q.matricola && (
                                  <div className="font-mono text-xs text-blue-300">
                                    {q.matricola}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <span className="font-bold text-white">
                                  {q.quantita}
                                </span>
                              </td>
                              <td className="p-4 text-right font-mono font-bold text-white">
                                {formatCurrency(dov)}
                              </td>
                              <td className="p-4 text-right">
                                <input
                                  disabled={selectedAcquisto.completato}
                                  type="number"
                                  className={`bg-black border rounded p-2 w-24 text-right font-bold text-lg outline-none ${
                                    err
                                      ? "border-red-500 text-red-500 focus:border-red-500"
                                      : "border-gray-700 text-white focus:border-blue-500"
                                  } ${
                                    selectedAcquisto.completato
                                      ? "opacity-50"
                                      : ""
                                  }`}
                                  value={q.importo_versato}
                                  onChange={async (e) => {
                                    await window.api.updateQuota({
                                      id: q.id,
                                      qta: q.quantita,
                                      versato: parseFloat(e.target.value),
                                    });
                                    setQuote(
                                      await window.api.getQuote(
                                        selectedAcquisto.id
                                      )
                                    );
                                    setSituazione(
                                      await window.api.getSituazione()
                                    );
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl bg-gray-900/50">
                  <ShoppingCart size={48} className="mb-4 opacity-50" />
                  <p>Seleziona un acquisto</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <h2 className="text-3xl font-bold mb-8 text-white">
              Amministrazione
            </h2>
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-blue-400">
                  Punti di Ripristino e Log
                </h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.api.openLogFile()}
                    className="bg-gray-800 text-white px-4 py-2 rounded flex items-center hover:bg-gray-700 transition border border-gray-600"
                  >
                    <FileCode className="mr-2" size={18} /> Vedi Log
                  </button>
                  <button
                    onClick={() => window.api.openBackupFolder()}
                    className="bg-gray-800 text-white px-4 py-2 rounded flex items-center hover:bg-gray-700 transition border border-gray-600"
                  >
                    <FolderOpen className="mr-2" size={18} /> Apri Cartella
                  </button>
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-800 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="p-4">File</th>
                    <th className="p-4 text-right">Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b: any) => (
                    <tr key={b.name} className="border-b border-gray-800">
                      <td className="p-4 font-mono text-green-400">{b.name}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRestoreBackup(b.name)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold text-sm transition"
                        >
                          RIPRISTINA
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
