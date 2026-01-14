import React, { useState, useEffect, useMemo } from "react";
import {
  History as HistoryIcon,
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
  Search,
  ListChecks,
  Loader2,
  CalendarDays,
  Book,
  ShieldCheck,
  FileWarning,
  Minus,
  Plus,
  CheckSquare,
} from "lucide-react";

interface Quota {
  id: number;
  membro_id: number;
  nome: string;
  cognome: string;
  // Rimossa matricola
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

// --- COMPONENTS ---
const QuantityControl = ({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (newVal: number) => void;
  disabled?: boolean;
}) => {
  return (
    <div
      className={`flex items-center bg-gray-950 border border-gray-600 rounded-lg overflow-hidden w-40 h-10 shadow-lg ${
        disabled ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <button
        onClick={() => value > 1 && onChange(value - 1)}
        className="h-full px-4 bg-gray-800 hover:bg-red-900/50 text-white border-r border-gray-600 transition active:bg-gray-700 flex items-center justify-center"
        type="button"
      >
        <Minus size={20} className="font-bold" />
      </button>
      <div className="flex-1 text-center font-bold text-white text-xl bg-black/40 h-full flex items-center justify-center">
        {value}
      </div>
      <button
        onClick={() => onChange(value + 1)}
        className="h-full px-4 bg-gray-800 hover:bg-green-900/50 text-white border-l border-gray-600 transition active:bg-gray-700 flex items-center justify-center"
        type="button"
      >
        <Plus size={20} className="font-bold" />
      </button>
    </div>
  );
};

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
    <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg bg-gray-950 rounded-2xl shadow-2xl border ${s.border} flex flex-col overflow-hidden scale-100`}
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
        <div className="p-6 text-gray-300 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
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
  const [membri, setMembri] = useState<any[]>([]);
  const [acquisti, setAcquisti] = useState([]);
  const [selectedAcquisto, setSelectedAcquisto] = useState<any>(null);
  const [quote, setQuote] = useState<Quota[]>([]);
  const [movimentiFondo, setMovimentiFondo] = useState<any[]>([]);
  const [backups, setBackups] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [newMembro, setNewMembro] = useState({
    nome: "",
    cognome: "",
    // Rimossa matricola
  });
  const [editingMembroId, setEditingMembroId] = useState<number | null>(null);

  const [newAcq, setNewAcq] = useState({ nome: "", prezzo: "", acconto: "" });
  const [isFundExpense, setIsFundExpense] = useState(false);
  const [selectedMembersForPurchase, setSelectedMembersForPurchase] = useState<
    number[]
  >([]);

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

  const [searchMembri, setSearchMembri] = useState("");
  const [searchFondo, setSearchFondo] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [searchQuota, setSearchQuota] = useState("");
  const [searchExcel, setSearchExcel] = useState("");
  const [searchMemberSelector, setSearchMemberSelector] = useState("");

  const [excelDateStart, setExcelDateStart] = useState("");
  const [excelDateEnd, setExcelDateEnd] = useState("");

  const [excelMatches, setExcelMatches] = useState<any[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<number[]>([]);

  const [modal, setModal] = useState<{
    view:
      | "none"
      | "excel_bank"
      | "fondo"
      | "confirm_delete_acquisto"
      | "confirm_delete_membro"
      | "confirm_delete_ALL_membri"
      | "confirm_purchase"
      | "confirm_restore"
      | "alert"
      | "edit_acquisto"
      | "select_members";
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

  // FILTERS (Rimossa matricola)
  const filteredMembri = useMemo(() => {
    return membri.filter((m) =>
      (m.nome + " " + m.cognome)
        .toUpperCase()
        .includes(searchMembri.toUpperCase())
    );
  }, [membri, searchMembri]);

  const filteredMembriSelector = useMemo(() => {
    return membri.filter((m) =>
      (m.nome + " " + m.cognome)
        .toUpperCase()
        .includes(searchMemberSelector.toUpperCase())
    );
  }, [membri, searchMemberSelector]);

  const filteredFondo = useMemo(() => {
    return movimentiFondo.filter((m) => {
      const matchText = m.descrizione
        .toUpperCase()
        .includes(searchFondo.toUpperCase());
      if (!matchText) return false;
      if (filterDateStart || filterDateEnd) {
        const mDate = new Date(m.data);
        mDate.setHours(0, 0, 0, 0);
        if (filterDateStart && mDate < new Date(filterDateStart)) return false;
        if (filterDateEnd && mDate > new Date(filterDateEnd)) return false;
      }
      return true;
    });
  }, [movimentiFondo, searchFondo, filterDateStart, filterDateEnd]);

  const filteredQuote = useMemo(() => {
    return quote.filter((q) =>
      (q.nome + " " + q.cognome)
        .toUpperCase()
        .includes(searchQuota.toUpperCase())
    );
  }, [quote, searchQuota]);

  const filteredExcelMatches = useMemo(() => {
    return excelMatches
      .map((m, i) => ({ ...m, originalIndex: i }))
      .filter((m) => {
        const textMatch =
          m.nome_trovato.toUpperCase().includes(searchExcel.toUpperCase()) ||
          m.linea_originale.toUpperCase().includes(searchExcel.toUpperCase());
        if (!textMatch) return false;
        if (m.data_movimento && (excelDateStart || excelDateEnd)) {
          const mDate = new Date(m.data_movimento);
          mDate.setHours(0, 0, 0, 0);
          if (excelDateStart && mDate < new Date(excelDateStart)) return false;
          if (excelDateEnd && mDate > new Date(excelDateEnd)) return false;
        }
        return true;
      });
  }, [excelMatches, searchExcel, excelDateStart, excelDateEnd]);

  // ACTIONS
  const handleSaveMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMembro.nome || !newMembro.cognome) return;
    if (editingMembroId) {
      await window.api.updateMembro(editingMembroId, newMembro);
      setEditingMembroId(null);
    } else {
      await window.api.addMembro(newMembro);
    }
    setNewMembro({ nome: "", cognome: "" });
    loadData();
  };
  const startEditMembro = (m: any) => {
    setNewMembro({
      nome: m.nome,
      cognome: m.cognome,
    });
    setEditingMembroId(m.id);
  };
  const cancelEditMembro = () => {
    setNewMembro({ nome: "", cognome: "" });
    setEditingMembroId(null);
  };
  const handleDeleteMembroRequest = (id: number) => {
    setModal({ view: "confirm_delete_membro", data: { id } });
  };
  const confirmDeleteMembro = async () => {
    if (!modal.data?.id) return;
    await window.api.deleteMembro(modal.data.id);
    setModal({ view: "none" });
    loadData();
  };
  const handleDeleteALLMembriRequest = () => {
    setModal({ view: "confirm_delete_ALL_membri" });
  };
  const confirmDeleteALLMembri = async () => {
    await window.api.deleteAllMembri();
    setModal({ view: "none" });
    loadData();
  };
  const handleImportMembriExcel = async () => {
    const path = await window.api.selectFile();
    if (!path) return;
    setIsLoading(true);
    try {
      const count = await window.api.importMembriExcel(path);
      setModal({
        view: "alert",
        data: {
          title: "Importazione Completata",
          msg: `Aggiunti (o riattivati) ${count} membri.`,
        },
      });
      loadData();
    } catch (e: any) {
      setModal({
        view: "alert",
        data: { title: "Errore Importazione", msg: e.message },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- ACQUISTI ---
  const handleSaveAcquisto = async () => {
    if (!newAcq.nome || !newAcq.prezzo) return;
    const p = parseFloat(newAcq.prezzo);
    const a = newAcq.acconto ? parseFloat(newAcq.acconto) : 0;

    if (p < 0 || a < 0) {
      setModal({
        view: "alert",
        data: {
          title: "Errore Valori",
          msg: "Prezzo e acconto non possono essere negativi.",
        },
      });
      return;
    }

    let targetIds: number[] | null = null;
    if (!isFundExpense && selectedMembersForPurchase.length > 0) {
      targetIds = selectedMembersForPurchase;
    }

    await window.api.createAcquisto({
      nome: newAcq.nome,
      prezzo: p,
      acconto: isFundExpense ? 0 : a,
      targetMemberIds: targetIds,
      isFundExpense: isFundExpense,
    });

    setNewAcq({ nome: "", prezzo: "", acconto: "" });
    setIsFundExpense(false);
    setSelectedMembersForPurchase([]);
    loadData();
  };

  const toggleMemberSelection = (id: number) => {
    setSelectedMembersForPurchase((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectAllMembers = () => {
    if (selectedMembersForPurchase.length === membri.length) {
      setSelectedMembersForPurchase([]);
    } else {
      setSelectedMembersForPurchase(membri.map((m) => m.id));
    }
  };

  const handleUpdateAcquisto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAcq) return;
    const p = parseFloat(editingAcq.prezzo);
    const a = editingAcq.acconto ? parseFloat(editingAcq.acconto) : 0;
    if (p < 0 || a < 0) {
      alert("Valori negativi non ammessi");
      return;
    }
    await window.api.updateAcquisto({
      id: editingAcq.id,
      nome: editingAcq.nome,
      prezzo: p,
      acconto: a,
    });
    setModal({ view: "none" });
    if (selectedAcquisto && selectedAcquisto.id === editingAcq.id) {
      const updatedList = await window.api.getAcquisti();
      setSelectedAcquisto(updatedList.find((a: any) => a.id === editingAcq.id));
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

  const handleUpdateQuotaUser = async (
    q: Quota,
    field: "importo_versato" | "quantita",
    val: string | number
  ) => {
    let v = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(v) || v < 0) return;

    const newQta = field === "quantita" ? v : q.quantita;
    const newVersato = field === "importo_versato" ? v : q.importo_versato;

    await window.api.updateQuota({
      id: q.id,
      qta: newQta,
      versato: newVersato,
    });
    const newQuotes = await window.api.getQuote(selectedAcquisto.id);
    setQuote(newQuotes);
    setSituazione(await window.api.getSituazione());
  };

  const handleExportDebtors = async () => {
    if (!selectedAcquisto) return;

    const debtors = quote
      .filter(
        (q) => q.importo_versato < q.quantita * selectedAcquisto.prezzo_unitario
      )
      .map((q) => ({
        Cognome: q.cognome,
        Nome: q.nome,
        // Rimossa matricola
        Quantita: q.quantita,
        Dovuto: q.quantita * selectedAcquisto.prezzo_unitario,
        Versato: q.importo_versato,
        Da_Pagare:
          q.quantita * selectedAcquisto.prezzo_unitario - q.importo_versato,
      }));

    if (debtors.length === 0) {
      setModal({
        view: "alert",
        data: {
          title: "Ottimo!",
          msg: "Tutti hanno saldato il dovuto per questo acquisto!",
          variant: "success",
        },
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await window.api.exportDebtors({
        acquistoNome: selectedAcquisto.nome_acquisto,
        debtors,
      });

      if (success) {
        setModal({
          view: "alert",
          data: {
            title: "Esportazione Completata",
            msg: "Il file Excel dei morosi è stato salvato con successo.",
            variant: "success",
          },
        });
      }
    } catch (e: any) {
      setModal({
        view: "alert",
        data: { title: "Errore Export", msg: e.message, variant: "danger" },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBankExcelUpload = async () => {
    const path = await window.api.selectFile();
    if (!path) return;
    setIsLoading(true);
    try {
      const matches = await window.api.analyzeExcelBank(path);
      if (matches.length === 0) {
        setModal({
          view: "alert",
          data: { title: "Nessun Risultato", msg: "Nessun pagamento trovato." },
        });
        return;
      }
      setExcelMatches(matches);
      setSelectedMatches(matches.map((_: any, i: number) => i));
      setSearchExcel("");
      setExcelDateStart("");
      setExcelDateEnd("");
      setModal({ view: "excel_bank" });
    } catch (e: any) {
      setModal({ view: "alert", data: { title: "Errore", msg: e.message } });
    } finally {
      setIsLoading(false);
    }
  };
  const confirmImportBank = async () => {
    setIsLoading(true);
    try {
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
    } finally {
      setIsLoading(false);
    }
  };

  const requestRestoreBackup = (filename: string) => {
    setModal({ view: "confirm_restore", data: { filename } });
  };
  const confirmRestoreBackup = async () => {
    if (!modal.data?.filename) return;
    setIsLoading(true);
    setTimeout(async () => {
      const success = await window.api.restoreBackup(modal.data.filename);
      if (!success) {
        setIsLoading(false);
        setModal({
          view: "alert",
          data: { title: "Errore", msg: "Ripristino fallito. Vedi log." },
        });
      }
    }, 500);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-300">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={64} />
          <p className="text-xl font-bold text-white animate-pulse">
            Elaborazione in corso...
          </p>
        </div>
      )}

      {/* --- MODALE SELEZIONE MEMBRI --- */}
      {modal.view === "select_members" && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-gray-900 w-full max-w-2xl h-[80vh] rounded-2xl border border-gray-700 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl">
              <h3 className="font-bold text-xl flex items-center">
                <ListChecks className="mr-2" /> Seleziona Destinatari
              </h3>
              <button onClick={() => setModal({ view: "none" })}>
                <X />
              </button>
            </div>
            <div className="p-4 bg-gray-800/50 flex gap-2 border-b border-gray-700">
              <button
                onClick={selectAllMembers}
                className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-xs font-bold transition"
              >
                {selectedMembersForPurchase.length === membri.length
                  ? "DESELEZIONA TUTTI"
                  : "SELEZIONA TUTTI"}
              </button>
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  size={16}
                />
                <input
                  className="bg-black border border-gray-600 rounded-full px-10 py-2 text-sm w-full focus:border-blue-500 outline-none"
                  placeholder="Cerca nome per selezionare..."
                  value={searchMemberSelector}
                  onChange={(e) => setSearchMemberSelector(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredMembriSelector.map((m) => (
                <div
                  key={m.id}
                  onClick={() => toggleMemberSelection(m.id)}
                  className={`flex items-center p-3 rounded cursor-pointer border transition ${
                    selectedMembersForPurchase.includes(m.id)
                      ? "bg-blue-900/40 border-blue-500"
                      : "bg-gray-800 border-transparent hover:bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border mr-3 flex items-center justify-center transition ${
                      selectedMembersForPurchase.includes(m.id)
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-500"
                    }`}
                  >
                    {selectedMembersForPurchase.includes(m.id) && (
                      <CheckCircle size={14} className="text-white" />
                    )}
                  </div>
                  <span className="font-bold">
                    {m.cognome} {m.nome}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-2xl flex justify-between items-center">
              <span className="text-sm text-gray-400">
                Selezionati:{" "}
                <b className="text-white">
                  {selectedMembersForPurchase.length}
                </b>
              </span>
              <button
                onClick={() => setModal({ view: "none" })}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold shadow-lg transition"
              >
                CONFERMA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALI STANDARD --- */}
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
        <p>Eliminare questo acquisto? I dati dei versamenti andranno persi.</p>
      </CustomModal>
      <CustomModal
        isOpen={modal.view === "confirm_delete_membro"}
        title="Elimina Membro"
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
              onClick={confirmDeleteMembro}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 font-bold text-white shadow-lg"
            >
              Conferma
            </button>
          </>
        }
      >
        <p>Il membro verrà nascosto dalle liste attive.</p>
      </CustomModal>
      <CustomModal
        isOpen={modal.view === "confirm_delete_ALL_membri"}
        title="Elimina TUTTI i Membri"
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
              onClick={confirmDeleteALLMembri}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 font-bold text-white shadow-lg"
            >
              ELIMINA TUTTO
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <p className="text-lg font-bold mb-2">
            Attenzione: Azione Distruttiva
          </p>
          <p>Stai per rimuovere TUTTI i membri dall'anagrafica attiva.</p>
          <p className="text-sm opacity-70 mt-4">
            Lo storico pagamenti rimarrà nel database (soft delete), ma l'elenco
            membri sarà svuotato.
          </p>
        </div>
      </CustomModal>
      <CustomModal
        isOpen={modal.view === "confirm_restore"}
        title="Ripristino Backup"
        onClose={() => setModal({ view: "none" })}
        variant="warning"
        actions={
          <>
            <button
              onClick={() => setModal({ view: "none" })}
              className="px-4 py-2 rounded bg-transparent hover:bg-white/10 font-bold"
            >
              Annulla
            </button>
            <button
              onClick={confirmRestoreBackup}
              className="px-4 py-2 rounded bg-yellow-600 hover:bg-yellow-500 font-bold text-black shadow-lg"
            >
              Conferma Ripristino
            </button>
          </>
        }
      >
        <p>Stai per ripristinare il database al punto di salvataggio:</p>
        <p className="font-mono text-yellow-400 mt-2 p-2 bg-black/30 rounded border border-yellow-900">
          {modal.data?.filename}
        </p>
        <p className="mt-4 font-bold text-red-400">
          L'applicazione verrà riavviata automaticamente.
        </p>
        <p className="text-sm opacity-70">
          Tutti i dati inseriti dopo questo backup andranno persi.
        </p>
      </CustomModal>

      <CustomModal
        isOpen={modal.view === "alert"}
        title={modal.data?.title}
        onClose={() => setModal({ view: "none" })}
        variant={modal.data?.variant || "warning"}
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
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">ACCONTO</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingAcq.acconto}
                  onChange={(e) =>
                    setEditingAcq({ ...editingAcq, acconto: e.target.value })
                  }
                  className="w-full bg-black p-3 rounded border border-gray-700 text-blue-300"
                />
              </div>
            </div>
            <button className="w-full bg-blue-600 p-3 rounded font-bold hover:bg-blue-500">
              SALVA
            </button>
          </form>
        )}
      </CustomModal>

      {/* EXCEL BANK PREVIEW */}
      {modal.view === "excel_bank" && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-8">
          <div className="bg-gray-900 w-full max-w-6xl h-[90vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between bg-gray-800">
              <h3 className="text-xl font-bold flex items-center text-green-500">
                <FileSpreadsheet className="mr-2" /> Importazione Banca
              </h3>
              <button onClick={() => setModal({ view: "none" })}>
                <X size={24} />
              </button>
            </div>
            <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2 items-center">
                <button
                  onClick={() =>
                    setSelectedMatches(excelMatches.map((_, i) => i))
                  }
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded flex items-center"
                >
                  <ListChecks size={14} className="mr-1" /> TUTTI
                </button>
                <button
                  onClick={() => setSelectedMatches([])}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded flex items-center"
                >
                  <X size={14} className="mr-1" /> NESSUNO
                </button>
                <div className="h-8 w-px bg-gray-700 mx-2"></div>
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-gray-500" />
                  <input
                    type="date"
                    className="bg-black border border-gray-600 rounded p-1 text-sm text-gray-300"
                    value={excelDateStart}
                    onChange={(e) => setExcelDateStart(e.target.value)}
                    title="Dal..."
                  />
                  <span className="text-gray-600">-</span>
                  <input
                    type="date"
                    className="bg-black border border-gray-600 rounded p-1 text-sm text-gray-300"
                    value={excelDateEnd}
                    onChange={(e) => setExcelDateEnd(e.target.value)}
                    title="Al..."
                  />
                </div>
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Cerca testo..."
                  className="bg-black border border-gray-600 rounded-full pl-10 pr-4 py-2 text-sm w-48 focus:border-green-500 outline-none"
                  value={searchExcel}
                  onChange={(e) => setSearchExcel(e.target.value)}
                />
              </div>
              <div className="text-sm text-gray-400">
                Selezionati:{" "}
                <b className="text-white">{selectedMatches.length}</b> /{" "}
                {excelMatches.length}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="text-gray-500 uppercase text-xs sticky top-0 bg-gray-900 z-10 shadow-sm">
                  <tr>
                    <th className="p-4 w-10 text-center">✓</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Membro</th>
                    <th className="p-4">Importo</th>
                    <th className="p-4">Dettaglio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExcelMatches.map((m) => (
                    <tr
                      key={m.originalIndex}
                      className={`border-b border-gray-800 cursor-pointer transition-colors ${
                        selectedMatches.includes(m.originalIndex)
                          ? "bg-green-900/20 hover:bg-green-900/30"
                          : "hover:bg-gray-800/50"
                      }`}
                      onClick={() =>
                        setSelectedMatches((prev) =>
                          prev.includes(m.originalIndex)
                            ? prev.filter((x) => x !== m.originalIndex)
                            : [...prev, m.originalIndex]
                        )
                      }
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedMatches.includes(m.originalIndex)}
                          readOnly
                          className="accent-green-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 text-gray-400 text-xs">
                        {m.data_movimento
                          ? new Date(m.data_movimento).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {m.nome_trovato}
                      </td>
                      <td className="p-4 font-mono text-green-400 font-bold">
                        {formatCurrency(m.importo_trovato)}
                      </td>
                      <td className="p-4 text-xs text-gray-500 truncate max-w-lg font-mono">
                        {m.linea_originale}
                      </td>
                    </tr>
                  ))}
                  {filteredExcelMatches.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Nessuna transazione trovata con i filtri attuali.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-gray-700 bg-gray-800 flex justify-end">
              <button
                onClick={confirmImportBank}
                className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-lg font-bold shadow-lg text-white flex items-center"
              >
                <Download className="mr-2" size={20} /> IMPORTA (
                {selectedMatches.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FONDO MANUALE */}
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

      {/* CONFIRM PURCHASE */}
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
              Indietro
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
                  Dovuto
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
          Tesoreria
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
          <button
            onClick={() => setActiveTab("guida")}
            className={`flex items-center w-full p-3 rounded-lg transition capitalize ${
              activeTab === "guida"
                ? "bg-blue-600 text-white shadow-lg"
                : "text-gray-400 hover:bg-gray-800"
            }`}
          >
            <Book size={20} className="mr-3" /> Guida & Privacy
          </button>
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

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 bg-gray-950">
        {activeTab === "guida" && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <Book className="mr-3 text-blue-500" /> Guida Rapida
              </h2>
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 space-y-6 text-gray-300 leading-relaxed">
                <section>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                    <Users size={18} className="mr-2" /> Gestione Membri
                  </h3>
                  <p>
                    Inserisci qui l'anagrafica. Puoi importare massivamente un
                    file Excel (formato GDF). Se elimini un membro, questo viene
                    solo "nascosto" per preservare lo storico dei pagamenti
                    precedenti.
                  </p>
                </section>
                <section>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                    <ShoppingCart size={18} className="mr-2" /> Acquisti e Quote
                  </h3>
                  <p>
                    Crea un evento/acquisto. Il sistema genera automaticamente
                    una quota da pagare per ogni membro attivo. Puoi registrare
                    i pagamenti manualmente o importando l'estratto conto della
                    banca (Excel).
                  </p>
                </section>
                <section>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center">
                    <Wallet size={18} className="mr-2" /> Fondo Cassa
                  </h3>
                  <p>
                    In Dashboard puoi vedere il saldo reale (banca + contanti) e
                    quello disponibile (al netto delle spese impegnate ma non
                    ancora pagate). Usa "Gestione Fondo" per movimenti extra
                    (donazioni, piccole spese cassa).
                  </p>
                </section>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <ShieldCheck className="mr-3 text-green-500" /> Privacy Policy
              </h2>
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-gray-300 text-sm">
                <p className="mb-4">
                  <strong>Ultimo aggiornamento:</strong>{" "}
                  {new Date().toLocaleDateString()}
                </p>
                <p className="mb-2">
                  1. <strong>Archiviazione Locale:</strong> Tutti i dati
                  inseriti sono salvati <strong>esclusivamente</strong> sul
                  disco locale di questo computer all'interno di un database
                  criptato SQLite.
                </p>
                <p className="mb-2">
                  2. <strong>Backup:</strong> I backup vengono generati
                  localmente nella cartella utente. È responsabilità dell'utente
                  custodire tali file.
                </p>
                <p className="mb-2">
                  3. <strong>Trattamento Dati:</strong> Il software agisce come
                  strumento di ausilio contabile. L'operatore è il Titolare del
                  Trattamento.
                </p>
              </div>
            </div>
          </div>
        )}

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

            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <h3 className="text-xl font-bold flex items-center">
                <HistoryIcon className="mr-2" /> Movimenti Fondo
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className="bg-black border border-gray-700 rounded p-2 text-sm text-gray-300"
                  value={filterDateStart}
                  onChange={(e) => setFilterDateStart(e.target.value)}
                  title="Da..."
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  className="bg-black border border-gray-700 rounded p-2 text-sm text-gray-300"
                  value={filterDateEnd}
                  onChange={(e) => setFilterDateEnd(e.target.value)}
                  title="A..."
                />
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-2 text-gray-500"
                  size={16}
                />
                <input
                  placeholder="Cerca movimento..."
                  className="bg-black border border-gray-700 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:border-blue-500 outline-none"
                  value={searchFondo}
                  onChange={(e) => setSearchFondo(e.target.value)}
                />
              </div>
            </div>
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
                  {filteredFondo.map((m: any) => (
                    <tr key={m.id} className="border-b border-gray-800">
                      <td className="p-4 text-gray-400">
                        {m.data.split(" ")[0]}
                      </td>
                      <td className="p-4">{m.descrizione}</td>
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
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-white">Membri</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteALLMembriRequest}
                  className="bg-red-900/30 border border-red-900 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded flex items-center font-bold transition text-xs"
                >
                  <Trash2 className="mr-2" size={16} /> ELIMINA TUTTI
                </button>
                <button
                  onClick={handleImportMembriExcel}
                  className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center font-bold transition"
                >
                  <Download className="mr-2" size={18} /> Importa Excel
                </button>
              </div>
            </div>
            <form
              onSubmit={handleSaveMembro}
              className={`p-6 rounded-xl border mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end transition-colors ${
                editingMembroId
                  ? "bg-blue-900/20 border-blue-500"
                  : "bg-gray-900 border-gray-800"
              }`}
            >
              {/* RIMOSSO INPUT MATRICOLA */}
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
            <div className="flex justify-between items-center mb-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="flex items-center text-gray-400">
                <Users size={18} className="mr-2" /> Totale Membri:{" "}
                <b className="text-white ml-1">{membri.length}</b>
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-2 text-gray-500"
                  size={16}
                />
                <input
                  placeholder="Cerca membro..."
                  className="bg-black border border-gray-700 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:border-blue-500 outline-none"
                  value={searchMembri}
                  onChange={(e) => setSearchMembri(e.target.value)}
                />
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-800 text-gray-500 text-xs uppercase">
                  <tr>
                    {/* Rimossa colonna Matricola */}
                    <th className="p-4">Nome</th>
                    <th className="p-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembri.map((m: any) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50"
                    >
                      {/* Rimossa cella Matricola */}
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
                          onClick={() => handleDeleteMembroRequest(m.id)}
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

                {/* SWITCH FONDO CASSA */}
                <div
                  className="flex items-center gap-2 mb-2 p-2 bg-gray-800/50 rounded border border-gray-700 cursor-pointer"
                  onClick={() => setIsFundExpense(!isFundExpense)}
                >
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      isFundExpense
                        ? "bg-green-500 border-green-500"
                        : "border-gray-500"
                    }`}
                  >
                    {isFundExpense && (
                      <CheckCircle size={14} className="text-black" />
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-300 select-none">
                    Spesa da Fondo Cassa
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Prezzo Unitario"
                    className="w-full bg-black p-3 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                    value={newAcq.prezzo}
                    onChange={(e) =>
                      setNewAcq({ ...newAcq, prezzo: e.target.value })
                    }
                  />
                  {!isFundExpense && (
                    <input
                      type="number"
                      placeholder="Acconto"
                      className="w-full bg-black p-3 rounded border border-gray-700 text-blue-300 focus:border-blue-500 outline-none"
                      value={newAcq.acconto}
                      onChange={(e) =>
                        setNewAcq({ ...newAcq, acconto: e.target.value })
                      }
                    />
                  )}
                </div>

                {!isFundExpense && (
                  <button
                    onClick={() => setModal({ view: "select_members" })}
                    className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 p-3 rounded font-bold transition flex justify-between items-center text-sm"
                  >
                    <span>Destinatari:</span>
                    <span className="text-white bg-gray-900 px-2 py-1 rounded">
                      {selectedMembersForPurchase.length === 0
                        ? "TUTTI"
                        : `${selectedMembersForPurchase.length} Selezionati`}
                    </span>
                  </button>
                )}

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
                      setSearchQuota("");
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
                        {a.is_fund_expense === 1 && (
                          <span className="ml-2 text-xs bg-purple-900 text-purple-300 px-1 rounded">
                            FONDO
                          </span>
                        )}
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

            {/* RIGHT SIDE */}
            <div className="col-span-8 flex flex-col h-full overflow-hidden">
              {selectedAcquisto ? (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 h-full flex flex-col">
                  {/* HEADER ACQUISTO */}
                  <div className="p-6 border-b border-gray-800 flex flex-col gap-4 bg-gray-800/50 rounded-t-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-1">
                          {selectedAcquisto.nome_acquisto}
                        </h2>
                        {selectedAcquisto.is_fund_expense === 1 ? (
                          <div className="text-purple-400 font-bold flex items-center mt-2">
                            <Wallet className="mr-2" size={18} /> PAGATO DAL
                            FONDO CASSA
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 flex gap-4 items-center">
                            <span>
                              Prezzo Unitario:{" "}
                              <b className="text-white text-lg">
                                {formatCurrency(
                                  selectedAcquisto.prezzo_unitario
                                )}
                              </b>
                            </span>
                            <span>
                              Acconto:{" "}
                              <b className="text-blue-300 text-lg">
                                {formatCurrency(
                                  selectedAcquisto.acconto_fornitore || 0
                                )}
                              </b>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                selectedAcquisto.completato
                                  ? "bg-green-900 text-green-400"
                                  : "bg-yellow-900 text-yellow-400"
                              }`}
                            >
                              {selectedAcquisto.completato
                                ? "CONCLUSO"
                                : "APERTO"}
                            </span>
                          </div>
                        )}
                      </div>
                      {!selectedAcquisto.completato && (
                        <div className="flex gap-2">
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
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded font-bold text-xs flex items-center transition shadow-lg border border-blue-500"
                          >
                            <Edit2 size={14} className="mr-1" /> MODIFICA
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteAcquistoRequest(selectedAcquisto.id)
                            }
                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded font-bold text-xs flex items-center transition shadow-lg border border-red-500"
                          >
                            <Trash2 size={14} className="mr-1" /> ELIMINA
                          </button>
                        </div>
                      )}
                    </div>

                    {!selectedAcquisto.completato &&
                      selectedAcquisto.is_fund_expense !== 1 && (
                        <div className="flex justify-between items-end border-t border-gray-700 pt-4">
                          <div className="relative">
                            <Search
                              className="absolute left-3 top-2 text-gray-500"
                              size={16}
                            />
                            <input
                              placeholder="Cerca tra i paganti..."
                              className="bg-black border border-gray-700 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:border-blue-500 outline-none"
                              value={searchQuota}
                              onChange={(e) => setSearchQuota(e.target.value)}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleExportDebtors}
                              className="bg-orange-700 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center transition"
                              title="Scarica Excel di chi non ha pagato"
                            >
                              <FileWarning className="mr-2" size={18} /> Morosi
                            </button>
                            <button
                              onClick={handleBankExcelUpload}
                              className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center transition"
                            >
                              <FileSpreadsheet className="mr-2" size={18} />{" "}
                              Banca
                            </button>
                            <button
                              onClick={() => {
                                let d = 0,
                                  v = 0;
                                quote.forEach((q: any) => {
                                  d +=
                                    q.quantita *
                                    selectedAcquisto.prezzo_unitario;
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
                              <CheckCircle className="mr-2" size={18} />{" "}
                              Concludi
                            </button>
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {selectedAcquisto.is_fund_expense === 1 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <CheckSquare size={64} className="mb-4 opacity-20" />
                        <p>
                          Questa spesa è stata registrata come uscita diretta
                          dal Fondo Cassa.
                        </p>
                        <p className="text-sm opacity-60">
                          Nessuna quota da gestire.
                        </p>
                      </div>
                    ) : (
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
                          {filteredQuote.map((q: any) => {
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
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex justify-center">
                                    <QuantityControl
                                      value={q.quantita}
                                      onChange={(v) =>
                                        handleUpdateQuotaUser(q, "quantita", v)
                                      }
                                      disabled={selectedAcquisto.completato}
                                    />
                                  </div>
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
                                      handleUpdateQuotaUser(
                                        q,
                                        "importo_versato",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
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
                          onClick={() => requestRestoreBackup(b.name)}
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
