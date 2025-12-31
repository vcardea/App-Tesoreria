import React, { useState, useEffect } from "react";
import {
  Users,
  LayoutDashboard,
  ShoppingCart,
  UserPlus,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  FileText,
  UploadCloud,
  X,
  Wallet,
  AlertTriangle,
  LogOut,
  History,
  Settings,
  RefreshCcw,
  Save,
  ArrowRight,
  Banknote,
  Scale,
} from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    amount
  );
const cleanInput = (val: string) =>
  val.toUpperCase().replace(/[^A-Z0-9À-ÖØ-öø-ÿ' ]/g, "");
const formatDate = (iso: string) => new Date(iso).toLocaleString("it-IT");

// --- MODALE UNIFICATO ---
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
  const currentStyle = styles[variant as keyof typeof styles] || styles.neutral;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg bg-gray-950 rounded-2xl shadow-2xl border ${currentStyle.border} flex flex-col overflow-hidden scale-100`}
      >
        <div
          className={`px-6 py-4 flex justify-between items-center border-b ${currentStyle.border} ${currentStyle.bgHead}`}
        >
          <h3
            className={`text-xl font-bold flex items-center ${currentStyle.textHead}`}
          >
            {currentStyle.icon}
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
            className={`px-6 py-4 bg-gray-900/50 border-t ${currentStyle.border} flex justify-end space-x-3`}
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

  // Dati
  const [situazione, setSituazione] = useState({
    fondo_cassa_reale: 0,
    fondi_vincolati: 0,
    disponibile_effettivo: 0,
  });
  const [membri, setMembri] = useState([]);
  const [acquisti, setAcquisti] = useState([]);
  const [selectedAcquisto, setSelectedAcquisto] = useState<any>(null);
  const [quote, setQuote] = useState([]);
  const [movimentiFondo, setMovimentiFondo] = useState([]);
  const [backups, setBackups] = useState([]);

  const [newMembro, setNewMembro] = useState({
    nome: "",
    cognome: "",
    matricola: "",
  });
  const [newAcq, setNewAcq] = useState({ nome: "", prezzo: "" });
  const [newMovimentoFondo, setNewMovimentoFondo] = useState({
    importo: "",
    descrizione: "",
  });

  const [pdfMatches, setPdfMatches] = useState<any[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<number[]>([]);

  const [modal, setModal] = useState<{
    view:
      | "none"
      | "pdf"
      | "fondo"
      | "confirm_delete"
      | "confirm_purchase"
      | "confirm_restore"
      | "alert";
    data?: any;
  }>({ view: "none" });

  const loadData = async () => {
    try {
      // @ts-ignore
      const [sit, mem, acq, mov, bak] = await Promise.all([
        // @ts-ignore
        window.api.getSituazione(),
        window.api.getMembri(),
        window.api.getAcquisti(),
        window.api.getMovimentiFondo(),
        window.api.getBackups(),
      ]);
      setSituazione(sit);
      setMembri(mem);
      setAcquisti(acq);
      setMovimentiFondo(mov);
      setBackups(bak);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ACTIONS
  const handleQuit = () => {
    /* @ts-ignore */ window.api.quitApp();
  };
  const openAlert = (title: string, msg: string) =>
    setModal({ view: "alert", data: { title, msg } });

  const handleAddMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMembro.nome || !newMembro.cognome) return;
    // @ts-ignore
    await window.api.addMembro(newMembro);
    setNewMembro({ nome: "", cognome: "", matricola: "" });
    loadData();
  };

  const confirmDeleteMembro = async () => {
    if (modal.data?.id) {
      // @ts-ignore
      await window.api.deleteMembro(modal.data.id);
      loadData();
      setModal({ view: "none" });
    }
  };

  const handleCreateAcquisto = async () => {
    if (!newAcq.nome || !newAcq.prezzo) return;
    // @ts-ignore
    await window.api.createAcquisto({
      nome: newAcq.nome,
      prezzo: parseFloat(newAcq.prezzo),
    });
    setNewAcq({ nome: "", prezzo: "" });
    loadData();
  };

  const handleSelectAcquisto = async (a: any) => {
    setQuote([]);
    setSelectedAcquisto(a);
    // @ts-ignore
    setQuote(await window.api.getQuote(a.id));
  };

  const handleUpdateQuota = async (
    id: number,
    quantita: number,
    versato: number
  ) => {
    if (isNaN(versato)) versato = 0;
    // @ts-ignore
    await window.api.updateQuota({ id, qta: quantita, versato });
    // @ts-ignore
    setQuote(await window.api.getQuote(selectedAcquisto.id));
    // @ts-ignore
    setSituazione(await window.api.getSituazione());
  };

  const prepareCompleteAcquisto = () => {
    let dovuto = 0,
      versato = 0;
    quote.forEach((q: any) => {
      dovuto += q.quantita * selectedAcquisto.prezzo_unitario;
      versato += q.importo_versato;
    });
    const diff = dovuto - versato;
    setModal({
      view: "confirm_purchase",
      data: { diff, dovuto, versato, id: selectedAcquisto.id },
    });
  };

  const confirmCompleteAcquisto = async () => {
    if (modal.data?.id) {
      // @ts-ignore
      await window.api.completaAcquisto(modal.data.id);
      await loadData();
      setSelectedAcquisto({ ...selectedAcquisto, completato: 1 });
      // @ts-ignore
      setQuote(await window.api.getQuote(modal.data.id));
      setModal({ view: "none" });
    }
  };

  const handleAddFondo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMovimentoFondo.importo || !newMovimentoFondo.descrizione) return;
    // @ts-ignore
    await window.api.addMovimentoFondo({
      importo: parseFloat(newMovimentoFondo.importo),
      descrizione: newMovimentoFondo.descrizione,
    });
    setModal({ view: "none" });
    setNewMovimentoFondo({ importo: "", descrizione: "" });
    await loadData();
  };

  const confirmRestore = async () => {
    if (modal.data?.filename) {
      /* @ts-ignore */ await window.api.restoreBackup(modal.data.filename);
    }
  };

  const handlePdfUpload = async () => {
    // @ts-ignore
    const path = await window.api.selectFile();
    if (!path) return;
    try {
      // @ts-ignore
      const matches = await window.api.analyzePdf(path);
      if (matches.length === 0) {
        openAlert(
          "Nessun Risultato",
          "Non ho trovato corrispondenze.\n\nControlla che:\n1. Il PDF contenga testo selezionabile.\n2. I nomi/matricole nel DB siano identici a quelli nel PDF."
        );
        return;
      }
      setPdfMatches(matches);
      setSelectedMatches(matches.map((_: any, i: number) => i));
      setModal({ view: "pdf" });
    } catch (e) {
      openAlert("Errore PDF", "Il file sembra illeggibile o corrotto.");
    }
  };

  const confirmImportPdf = async () => {
    for (const index of selectedMatches) {
      const match = pdfMatches[index];
      const quota = quote.find((q: any) => q.membro_id === match.membro_id);
      if (quota) {
        // @ts-ignore
        await window.api.updateQuota({
          id: quota.id,
          qta: quota.quantita,
          versato: match.importo_trovato,
        });
      }
    }
    setModal({ view: "none" });
    if (selectedAcquisto) handleSelectAcquisto(selectedAcquisto);
    loadData();
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden relative">
      {/* ALERT */}
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

      {/* DELETE CONFIRM */}
      <CustomModal
        isOpen={modal.view === "confirm_delete"}
        title="Elimina Membro"
        onClose={() => setModal({ view: "none" })}
        variant="danger"
        actions={
          <>
            <button
              onClick={() => setModal({ view: "none" })}
              className="px-4 py-2 rounded font-bold hover:bg-white/10"
            >
              Annulla
            </button>
            <button
              onClick={confirmDeleteMembro}
              className="px-4 py-2 rounded bg-red-600 font-bold text-white shadow-lg hover:bg-red-500"
            >
              Elimina
            </button>
          </>
        }
      >
        <p className="text-lg">
          Stai eliminando un membro e <b>tutto il suo storico</b>.
        </p>
        <p className="mt-2 text-sm opacity-70">Azione irreversibile.</p>
      </CustomModal>

      {/* RESTORE CONFIRM */}
      <CustomModal
        isOpen={modal.view === "confirm_restore"}
        title="Ripristino"
        onClose={() => setModal({ view: "none" })}
        variant="warning"
        actions={
          <>
            <button
              onClick={() => setModal({ view: "none" })}
              className="px-4 py-2 rounded font-bold hover:bg-white/10"
            >
              Annulla
            </button>
            <button
              onClick={confirmRestore}
              className="px-4 py-2 rounded bg-blue-600 font-bold text-white shadow-lg hover:bg-blue-500"
            >
              Riavvia e Ripristina
            </button>
          </>
        }
      >
        <p className="text-lg">
          Sovrascrivere i dati attuali con il backup? L'app si riavvierà.
        </p>
      </CustomModal>

      {/* --- NUOVO MODALE CONFERMA ACQUISTO --- */}
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
              onClick={confirmCompleteAcquisto}
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
              <div className="mb-2">
                {modal.data.diff > 0 ? (
                  <Scale size={48} className="text-red-500" />
                ) : modal.data.diff < 0 ? (
                  <Banknote size={48} className="text-green-500" />
                ) : (
                  <CheckCircle size={48} className="text-gray-400" />
                )}
              </div>
              <h4 className="font-bold text-lg uppercase tracking-wider mb-1">
                {modal.data.diff > 0
                  ? "Deficit (Perdita)"
                  : modal.data.diff < 0
                  ? "Surplus (Extra)"
                  : "Bilancio Perfetto"}
              </h4>
              <div className="text-4xl font-bold mb-2">
                {modal.data.diff === 0
                  ? "€ 0,00"
                  : formatCurrency(Math.abs(modal.data.diff))}
              </div>
              <p className="text-sm opacity-70 max-w-xs">
                {modal.data.diff > 0
                  ? "Mancano soldi all'appello. Verranno registrati come perdita dal fondo cassa."
                  : modal.data.diff < 0
                  ? "Hai incassato più del previsto. L'eccedenza andrà nel fondo cassa."
                  : "I conti tornano perfettamente."}
              </p>
            </div>
          </div>
        )}
      </CustomModal>

      {/* FONDO */}
      <CustomModal
        isOpen={modal.view === "fondo"}
        title="Fondo Manuale"
        onClose={() => setModal({ view: "none" })}
        variant="neutral"
      >
        <form onSubmit={handleAddFondo} className="space-y-4">
          <input
            type="number"
            step="0.01"
            placeholder="Importo (es. 50.00)"
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
            placeholder="Descrizione (es. Donazione)"
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

      {/* PDF */}
      {modal.view === "pdf" && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-8 animate-in zoom-in-95 duration-200">
          <div className="bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-700 flex justify-between bg-gray-800 rounded-t-2xl">
              <h3 className="text-xl font-bold flex items-center">
                <FileText className="mr-2 text-blue-400" /> Importazione PDF
              </h3>
              <button onClick={() => setModal({ view: "none" })}>
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left">
                <thead className="text-gray-500 uppercase text-xs sticky top-0 bg-gray-900">
                  <tr>
                    <th className="p-3 w-10">#</th>
                    <th className="p-3">Membro</th>
                    <th className="p-3">Importo</th>
                    <th className="p-3">Dettaglio</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfMatches.map((m, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-800 cursor-pointer ${
                        selectedMatches.includes(i)
                          ? "bg-blue-900/20"
                          : "hover:bg-gray-800/50"
                      }`}
                      onClick={() => {
                        if (selectedMatches.includes(i))
                          setSelectedMatches(
                            selectedMatches.filter((x) => x !== i)
                          );
                        else setSelectedMatches([...selectedMatches, i]);
                      }}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedMatches.includes(i)}
                          onChange={() => {}}
                        />
                      </td>
                      <td className="p-3 font-bold text-green-400">
                        {m.nome_trovato}
                      </td>
                      <td className="p-3 font-mono font-bold">
                        {formatCurrency(m.importo_trovato)}
                      </td>
                      <td className="p-3 text-xs text-gray-400 truncate max-w-md">
                        {m.linea_originale}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-gray-700 bg-gray-800 flex justify-between items-center rounded-b-2xl">
              <span className="text-gray-400">
                Selezionati: <b>{selectedMatches.length}</b>
              </span>
              <button
                onClick={confirmImportPdf}
                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-bold shadow-lg text-white"
              >
                IMPORTA DATI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR & MAIN (Stesso layout di prima) */}
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
                  ? "bg-blue-600 text-white"
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
            onClick={handleQuit}
            className="flex items-center w-full p-3 rounded-lg bg-green-900/30 text-green-400 border border-green-900/50 hover:bg-green-900/50"
          >
            <Save size={20} className="mr-3" /> Salva ed Esci
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 bg-gray-950">
        {activeTab === "dashboard" && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white">
                Situazione Contabile
              </h2>
              <button
                onClick={() => setModal({ view: "fondo" })}
                className="bg-gray-800 text-white px-4 py-2 rounded flex items-center text-sm font-bold border border-gray-700 hover:bg-gray-700"
              >
                <Wallet size={16} className="mr-2" /> Gestione Fondo
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800">
                <p className="text-gray-400 font-bold text-xs uppercase mb-2">
                  Fondo Cassa Reale
                </p>
                <p className="text-5xl font-bold text-white">
                  {formatCurrency(situazione.fondo_cassa_reale)}
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800">
                <p className="text-gray-400 font-bold text-xs uppercase mb-2">
                  Vincolato
                </p>
                <p className="text-4xl font-bold text-yellow-500">
                  -{formatCurrency(situazione.fondi_vincolati)}
                </p>
              </div>
              <div className="bg-gray-900 p-8 rounded-2xl border border-blue-900/30">
                <p className="text-blue-400 font-bold text-xs uppercase mb-2">
                  Disponibile
                </p>
                <p className="text-5xl font-bold text-blue-400">
                  {formatCurrency(situazione.disponibile_effettivo)}
                </p>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-4 flex items-center text-white">
              <History className="mr-2" /> Ultimi Movimenti Fondo
            </h3>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-800 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Descrizione</th>
                    <th className="p-4 text-right">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentiFondo.map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-800">
                      <td className="p-4 text-gray-400">
                        {m.data.split(" ")[0]}
                      </td>
                      <td className="p-4 text-gray-300">{m.descrizione}</td>
                      <td
                        className={`p-4 text-right font-bold ${
                          m.importo >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {m.importo > 0 ? "+" : ""}
                        {formatCurrency(m.importo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "membri" && (
          <div>
            <h2 className="text-3xl font-bold mb-8 text-white">Membri</h2>
            <form
              onSubmit={handleAddMembro}
              className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
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
              <button className="bg-green-600 hover:bg-green-500 text-white p-3 rounded font-bold transition">
                AGGIUNGI
              </button>
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
                      <td className="p-4 text-right">
                        <button
                          onClick={() =>
                            setModal({
                              view: "confirm_delete",
                              data: { id: m.id },
                            })
                          }
                          className="text-red-500 hover:text-red-400"
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
                <input
                  type="number"
                  placeholder="Prezzo"
                  className="w-full bg-black p-3 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                  value={newAcq.prezzo}
                  onChange={(e) =>
                    setNewAcq({ ...newAcq, prezzo: e.target.value })
                  }
                />
                <button
                  onClick={handleCreateAcquisto}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded font-bold transition"
                >
                  CREA
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {acquisti.map((a: any) => (
                  <div
                    key={a.id}
                    onClick={() => handleSelectAcquisto(a)}
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
                      <h2 className="text-2xl font-bold text-white">
                        {selectedAcquisto.nome_acquisto}
                      </h2>
                      <p className="text-gray-400">
                        Stato:{" "}
                        <span
                          className={
                            selectedAcquisto.completato
                              ? "text-green-400 font-bold"
                              : "text-yellow-400 font-bold"
                          }
                        >
                          {selectedAcquisto.completato ? "CONCLUSO" : "APERTO"}
                        </span>
                      </p>
                    </div>
                    {!selectedAcquisto.completato && (
                      <div className="flex space-x-2">
                        <button
                          onClick={handlePdfUpload}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center transition"
                        >
                          <UploadCloud className="mr-2" size={18} /> PDF
                        </button>
                        <button
                          onClick={prepareCompleteAcquisto}
                          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold flex items-center transition"
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
                                  onChange={(e) =>
                                    handleUpdateQuota(
                                      q.id,
                                      q.quantita,
                                      parseFloat(e.target.value)
                                    )
                                  }
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
            <h2 className="text-3xl font-bold mb-8 text-white">Backup</h2>
            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800">
              <h3 className="text-xl font-bold mb-4 text-blue-400">
                Punti di Ripristino
              </h3>
              <table className="w-full text-left">
                <thead className="bg-gray-800 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4 text-right">Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b: any) => (
                    <tr key={b.name} className="border-b border-gray-800">
                      <td className="p-4 font-mono text-green-400">
                        {formatDate(b.date)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() =>
                            setModal({
                              view: "confirm_restore",
                              data: { filename: b.name },
                            })
                          }
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
