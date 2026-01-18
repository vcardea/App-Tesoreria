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
  PiggyBank,
  Unlock,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
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
    amount,
  );
const cleanInput = (val: string) =>
  val.toUpperCase().replace(/[^A-Z0-9À-ÖØ-öø-ÿ' ]/g, "");

const QuantityControl = ({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (newVal: number) => void;
  disabled?: boolean;
}) => (
  <div
    className={`flex items-center bg-gray-950 border border-gray-600 rounded-lg overflow-hidden w-40 h-10 shadow-lg ${disabled ? "opacity-50 pointer-events-none" : ""}`}
  >
    <button
      onClick={() => value > 1 && onChange(value - 1)}
      className="h-full px-4 bg-gray-800 hover:bg-red-900/50 text-white border-r border-gray-600 transition flex items-center justify-center"
      type="button"
    >
      <Minus size={20} />
    </button>
    <div className="flex-1 text-center font-bold text-white text-xl bg-black/40 h-full flex items-center justify-center">
      {value}
    </div>
    <button
      onClick={() => onChange(value + 1)}
      className="h-full px-4 bg-gray-800 hover:bg-green-900/50 text-white border-l border-gray-600 transition flex items-center justify-center"
      type="button"
    >
      <Plus size={20} />
    </button>
  </div>
);

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
  const s = (styles as any)[variant] || styles.neutral;
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
            className="p-1 rounded-full hover:bg-black/20 text-white/70 hover:text-white"
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
  const [tempQuotes, setTempQuotes] = useState<Quota[]>([]);
  const [movimentiFondo, setMovimentiFondo] = useState<any[]>([]);
  const [backups, setBackups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newMembro, setNewMembro] = useState({
    nome: "",
    cognome: "",
    matricola: "",
  });
  const [editingMembroId, setEditingMembroId] = useState<number | null>(null);
  const [searchMembri, setSearchMembri] = useState("");
  const [newAcqType, setNewAcqType] = useState("acquisto");
  const [newAcq, setNewAcq] = useState({ nome: "", prezzo: "", acconto: "" });

  // FIX SELEZIONE: Due stati separati
  const [selectedMembersForPurchase, setSelectedMembersForPurchase] = useState<
    number[]
  >([]);
  const [editingMemberSelection, setEditingMemberSelection] = useState<
    number[]
  >([]);

  const [editingAcq, setEditingAcq] = useState<any>(null);
  const [newMovimentoFondo, setNewMovimentoFondo] = useState({
    importo: "",
    descrizione: "",
  });
  const [isEditingQuotes, setIsEditingQuotes] = useState(false);
  const [searchFondo, setSearchFondo] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [searchQuota, setSearchQuota] = useState("");
  const [searchMemberSelector, setSearchMemberSelector] = useState("");
  const [searchExcel, setSearchExcel] = useState("");
  const [excelDateStart, setExcelDateStart] = useState("");
  const [excelDateEnd, setExcelDateEnd] = useState("");
  const [excelMatches, setExcelMatches] = useState<any[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<number[]>([]);
  const [modal, setModal] = useState<{ view: string; data?: any }>({
    view: "none",
  });
  const [showArchived, setShowArchived] = useState(false);

  const loadData = async () => {
    try {
      setSituazione(await window.api.getSituazione());
      setMembri(await window.api.getMembri());
      setAcquisti(await window.api.getAcquisti());
      setMovimentiFondo(await window.api.getMovimentiFondo());
      setBackups(await window.api.getBackups());
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => {
    loadData();
  }, []);

  const filteredMembri = useMemo(
    () =>
      membri.filter((m) =>
        (m.nome + " " + m.cognome + " " + (m.matricola || ""))
          .toUpperCase()
          .includes(searchMembri.toUpperCase()),
      ),
    [membri, searchMembri],
  );
  const filteredMembriSelector = useMemo(
    () =>
      membri.filter((m) =>
        (m.nome + " " + m.cognome + " " + (m.matricola || ""))
          .toUpperCase()
          .includes(searchMemberSelector.toUpperCase()),
      ),
    [membri, searchMemberSelector],
  );
  const activeQuotesSource = isEditingQuotes ? tempQuotes : quote;
  const filteredQuote = useMemo(
    () =>
      activeQuotesSource.filter((q) =>
        (q.nome + " " + q.cognome + " " + q.matricola)
          .toUpperCase()
          .includes(searchQuota.toUpperCase()),
      ),
    [activeQuotesSource, searchQuota],
  );

  // LOGICA DASHBOARD: Filtro Visibili/Nascosti
  const filteredFondo = useMemo(
    () =>
      movimentiFondo.filter((m) => {
        const matchText = m.descrizione
          .toUpperCase()
          .includes(searchFondo.toUpperCase());
        if (!matchText) return false;
        if (filterDateStart || filterDateEnd) {
          const mDate = new Date(m.data);
          mDate.setHours(0, 0, 0, 0);
          if (filterDateStart && mDate < new Date(filterDateStart))
            return false;
          if (filterDateEnd && mDate > new Date(filterDateEnd)) return false;
        }
        return true;
      }),
    [movimentiFondo, searchFondo, filterDateStart, filterDateEnd],
  );
  const visibleFondo = filteredFondo.filter((m) => !m.hidden);
  const hiddenFondo = filteredFondo.filter((m) => m.hidden);

  const filteredExcelMatches = useMemo(
    () =>
      excelMatches
        .map((m, i) => ({ ...m, originalIndex: i }))
        .filter((m) => {
          const textMatch =
            m.nome_trovato.toUpperCase().includes(searchExcel.toUpperCase()) ||
            m.linea_originale.toUpperCase().includes(searchExcel.toUpperCase());
          if (!textMatch) return false;
          if (m.data_movimento && (excelDateStart || excelDateEnd)) {
            const mDate = new Date(m.data_movimento);
            mDate.setHours(0, 0, 0, 0);
            if (excelDateStart && mDate < new Date(excelDateStart))
              return false;
            if (excelDateEnd && mDate > new Date(excelDateEnd)) return false;
          }
          return true;
        }),
    [excelMatches, searchExcel, excelDateStart, excelDateEnd],
  );

  const handleSaveMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMembro.nome || !newMembro.cognome) return;
    if (editingMembroId)
      await window.api.updateMembro(editingMembroId, newMembro);
    else await window.api.addMembro(newMembro);
    setNewMembro({ nome: "", cognome: "", matricola: "" });
    setEditingMembroId(null);
    loadData();
  };

  const handleSaveAcquisto = async () => {
    if (!newAcq.nome || !newAcq.prezzo) return;
    const p = parseFloat(newAcq.prezzo);
    const a = newAcq.acconto ? parseFloat(newAcq.acconto) : 0;
    let targetIds = null;
    if (newAcqType !== "spesa_fondo" && selectedMembersForPurchase.length > 0)
      targetIds = selectedMembersForPurchase;
    await window.api.createAcquisto({
      nome: newAcq.nome,
      prezzo: p,
      acconto: newAcqType === "spesa_fondo" ? 0 : a,
      targetMemberIds: targetIds,
      tipo: newAcqType,
    });
    setNewAcq({ nome: "", prezzo: "", acconto: "" });
    setSelectedMembersForPurchase([]);
    loadData();
  };

  const startEditAcquistoLogic = async () => {
    const q = await window.api.getQuote(selectedAcquisto.id);
    const currentMemberIds = q.map((i: any) => i.membro_id);
    setEditingMemberSelection(currentMemberIds); // INIZIALIZZA LISTA MODIFICA
    setEditingAcq({
      id: selectedAcquisto.id,
      nome: selectedAcquisto.nome_acquisto,
      prezzo: String(selectedAcquisto.prezzo_unitario),
      acconto: String(selectedAcquisto.acconto_fornitore || 0),
    });
    setModal({ view: "edit_acquisto" });
  };

  const handleUpdateAcquisto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAcq) return;
    await window.api.updateAcquisto({
      id: editingAcq.id,
      nome: editingAcq.nome,
      prezzo: parseFloat(editingAcq.prezzo),
      acconto: parseFloat(editingAcq.acconto || 0),
      targetMemberIds: editingMemberSelection,
    });
    setModal({ view: "none" });
    if (selectedAcquisto && selectedAcquisto.id === editingAcq.id) {
      const updatedList = await window.api.getAcquisti();
      const newItem = updatedList.find((a: any) => a.id === editingAcq.id);
      setSelectedAcquisto(newItem);
      setQuote(await window.api.getQuote(newItem.id));
    }
    loadData();
  };

  const handleUpdateQuotaUser = async (
    q: Quota,
    f: string,
    val: string | number,
  ) => {
    let v = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(v) || v < 0) return;
    const nQ = f === "quantita" ? v : q.quantita;
    const nV = f === "importo_versato" ? v : q.importo_versato;
    if (isEditingQuotes) {
      setTempQuotes((prev) =>
        prev.map((i) =>
          i.id === q.id ? { ...i, quantita: nQ, importo_versato: nV } : i,
        ),
      );
    } else {
      await window.api.updateQuota({ id: q.id, qta: nQ, versato: nV });
      setQuote(await window.api.getQuote(selectedAcquisto.id));
      setSituazione(await window.api.getSituazione());
    }
  };
  const saveBufferedQuotes = async () => {
    setIsLoading(true);
    try {
      for (const q of tempQuotes) {
        const o = quote.find((x) => x.id === q.id);
        if (
          o &&
          (o.quantita !== q.quantita || o.importo_versato !== q.importo_versato)
        )
          await window.api.updateQuota({
            id: q.id,
            qta: q.quantita,
            versato: q.importo_versato,
          });
      }
      setQuote(await window.api.getQuote(selectedAcquisto.id));
      setSituazione(await window.api.getSituazione());
      setIsEditingQuotes(false);
    } finally {
      setIsLoading(false);
    }
  };
  const enableQuoteEditing = () => {
    setTempQuotes([...quote]);
    setIsEditingQuotes(true);
  };
  const requestRestoreBackup = (filename: string) =>
    setModal({ view: "confirm_restore", data: { filename } });
  const confirmRestoreBackup = async () => {
    if (!modal.data?.filename) return;
    setIsLoading(true);
    const success = await window.api.restoreBackup(modal.data.filename);
    if (!success) {
      setModal({
        view: "alert",
        data: { title: "Errore", msg: "Ripristino fallito." },
      });
      setIsLoading(false);
    } else {
      setModal({ view: "none" });
    }
  };
  const confirmDeleteAcquisto = async () => {
    await window.api.deleteAcquisto(modal.data.id);
    if (selectedAcquisto && selectedAcquisto.id === modal.data.id)
      setSelectedAcquisto(null);
    setModal({ view: "none" });
    loadData();
  };
  const selectAcquistoAndReset = async (a: any) => {
    setSelectedAcquisto(a);
    if (a) {
      setQuote(await window.api.getQuote(a.id));
    }
    setIsEditingQuotes(false);
    setSearchQuota("");
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
      setQuote(await window.api.getQuote(selectedAcquisto.id));
      loadData();
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
      setExcelMatches(matches);
      setSelectedMatches(matches.map((_: any, i: any) => i));
      setModal({ view: "excel_bank" });
    } catch (e: any) {
      setModal({ view: "alert", data: { title: "Errore", msg: e.message } });
    } finally {
      setIsLoading(false);
    }
  };
  const handleImportMembriExcel = async () => {
    const path = await window.api.selectFile();
    if (!path) return;
    setIsLoading(true);
    try {
      const count = await window.api.importMembriExcel(path);
      setModal({
        view: "alert",
        data: { title: "Importazione", msg: `Aggiunti ${count} membri.` },
      });
      loadData();
    } catch (e: any) {
      setModal({ view: "alert", data: { title: "Errore", msg: e.message } });
    } finally {
      setIsLoading(false);
    }
  };
  const handleDeleteALLMembriRequest = () =>
    setModal({ view: "confirm_delete_ALL_membri" });
  const confirmDeleteALLMembri = async () => {
    await window.api.deleteAllMembri();
    setModal({ view: "none" });
    loadData();
  };
  const confirmDeleteMembro = async () => {
    await window.api.deleteMembro(modal.data.id);
    setModal({ view: "none" });
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
  const selectAllMembers = () => {
    setSelectedMembersForPurchase(
      selectedMembersForPurchase.length === membri.length
        ? []
        : membri.map((m) => m.id),
    );
  };

  // TOGGLE VISIBILITA DASHBOARD
  const toggleRowVisibility = async (uniqueId: string) => {
    await window.api.toggleDashboardVisibility(uniqueId);
    loadData();
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={64} />
        </div>
      )}

      {/* --- MODALE SELECT MEMBERS (FIX CONTESTO) --- */}
      {modal.view === "select_members" && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-2xl h-[80vh] rounded-2xl border border-gray-700 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
              <h3 className="font-bold text-xl flex items-center">
                <ListChecks className="mr-2" /> Seleziona Destinatari
              </h3>
              <button
                onClick={() =>
                  setModal({ view: editingAcq ? "edit_acquisto" : "none" })
                }
              >
                <X />
              </button>
            </div>
            {(() => {
              const isEditContext = modal.data?.context === "edit";
              const currentList = isEditContext
                ? editingMemberSelection
                : selectedMembersForPurchase;
              const setList = isEditContext
                ? setEditingMemberSelection
                : setSelectedMembersForPurchase;
              return (
                <>
                  <div className="p-4 bg-gray-800/50 flex gap-2 border-b border-gray-700">
                    <button
                      onClick={() =>
                        setList(
                          currentList.length === membri.length
                            ? []
                            : membri.map((m) => m.id),
                        )
                      }
                      className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-xs font-bold"
                    >
                      {currentList.length === membri.length
                        ? "DESELEZIONA"
                        : "TUTTI"}
                    </button>
                    <input
                      className="bg-black border border-gray-600 rounded-full px-10 py-2 text-sm w-full outline-none"
                      placeholder="Cerca..."
                      value={searchMemberSelector}
                      onChange={(e) => setSearchMemberSelector(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {filteredMembriSelector.map((m) => (
                      <div
                        key={m.id}
                        onClick={() =>
                          setList((prev) =>
                            prev.includes(m.id)
                              ? prev.filter((x) => x !== m.id)
                              : [...prev, m.id],
                          )
                        }
                        className={`flex items-center p-3 rounded cursor-pointer border transition ${currentList.includes(m.id) ? "bg-blue-900/40 border-blue-500" : "bg-gray-800 border-transparent hover:bg-gray-700"}`}
                      >
                        <div
                          className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${currentList.includes(m.id) ? "bg-blue-500 border-blue-500" : "border-gray-500"}`}
                        >
                          {currentList.includes(m.id) && (
                            <CheckCircle size={14} className="text-white" />
                          )}
                        </div>
                        <span className="font-bold">
                          {m.cognome} {m.nome}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-gray-700 bg-gray-800 flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      Selezionati:{" "}
                      <b className="text-white">{currentList.length}</b>
                    </span>
                    <button
                      onClick={() =>
                        setModal({
                          view: isEditContext ? "edit_acquisto" : "none",
                        })
                      }
                      className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold"
                    >
                      CONFERMA
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <CustomModal
        isOpen={modal.view === "edit_acquisto"}
        title="Modifica Dati Movimento"
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
                <label className="text-xs text-gray-500">
                  IMPORTO / PREZZO
                </label>
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
            {selectedAcquisto && selectedAcquisto.tipo !== "spesa_fondo" && (
              <button
                type="button"
                onClick={() =>
                  setModal({
                    view: "select_members",
                    data: { context: "edit" },
                  })
                }
                className="w-full bg-gray-800 text-gray-300 p-3 rounded font-bold flex justify-between items-center text-sm border border-gray-600 hover:bg-gray-700"
              >
                <span>Modifica Destinatari:</span>
                <span className="text-white bg-gray-900 px-2 py-1 rounded">
                  {editingMemberSelection.length} Selezionati
                </span>
              </button>
            )}
            <button className="w-full bg-blue-600 p-3 rounded font-bold hover:bg-blue-500">
              SALVA DATI
            </button>
          </form>
        )}
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
              Indietro
            </button>
            <button
              onClick={async () => {
                await window.api.completaAcquisto(modal.data.id);
                await loadData();
                selectAcquistoAndReset(null);
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
              className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center ${modal.data.diff > 0 ? "bg-red-900/10 border-red-500/30 text-red-400" : modal.data.diff < 0 ? "bg-green-900/10 border-green-500/30 text-green-400" : "bg-gray-800/50 border-gray-600 text-gray-300"}`}
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
      <CustomModal
        isOpen={modal.view === "confirm_delete_acquisto"}
        title="Elimina Movimento"
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
        <p>Sei sicuro? I dati verranno persi.</p>
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
        <p>{modal.data?.msg}</p>
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
              className="px-4 py-2 rounded font-bold hover:bg-white/10"
            >
              Annulla
            </button>
            <button
              onClick={confirmDeleteMembro}
              className="bg-red-600 text-white px-4 py-2 rounded font-bold shadow-lg"
            >
              Conferma
            </button>
          </>
        }
      >
        <p>Vuoi nascondere questo membro?</p>
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
        <p>Stai per rimuovere TUTTI i membri.</p>
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
              className="px-4 py-2 rounded font-bold hover:bg-white/10"
            >
              Annulla
            </button>
            <button
              onClick={confirmRestoreBackup}
              className="bg-yellow-600 text-black px-4 py-2 rounded font-bold shadow-lg"
            >
              Conferma Ripristino
            </button>
          </>
        }
      >
        <p>
          Stai per ripristinare il database: {modal.data?.filename}. L'app si
          riavvierà.
        </p>
      </CustomModal>
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
            required
            autoFocus
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
              className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200"
            >
              Salva
            </button>
          </div>
        </form>
      </CustomModal>
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
                  />
                  <span className="text-gray-600">-</span>
                  <input
                    type="date"
                    className="bg-black border border-gray-600 rounded p-1 text-sm text-gray-300"
                    value={excelDateEnd}
                    onChange={(e) => setExcelDateEnd(e.target.value)}
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
                      className={`border-b border-gray-800 cursor-pointer transition-colors ${selectedMatches.includes(m.originalIndex) ? "bg-green-900/20 hover:bg-green-900/30" : "hover:bg-gray-800/50"}`}
                      onClick={() =>
                        setSelectedMatches((prev) =>
                          prev.includes(m.originalIndex)
                            ? prev.filter((x) => x !== m.originalIndex)
                            : [...prev, m.originalIndex],
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

      {/* SIDEBAR */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
        <h1 className="text-xl font-bold mb-8 px-2 text-green-500 flex items-center">
          <span className="bg-green-500 text-black w-8 h-8 flex items-center justify-center rounded-lg mr-2 font-bold">
            T
          </span>{" "}
          Tesoreria
        </h1>
        <nav className="flex-1 space-y-2">
          {["dashboard", "movimenti", "membri"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center w-full p-3 rounded-lg transition capitalize ${activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:bg-gray-800"}`}
            >
              {tab === "dashboard" && (
                <LayoutDashboard size={20} className="mr-3" />
              )}
              {tab === "membri" && <Users size={20} className="mr-3" />}
              {tab === "movimenti" && (
                <ShoppingCart size={20} className="mr-3" />
              )}
              {tab}
            </button>
          ))}
          <button
            onClick={() => setActiveTab("guida")}
            className={`flex items-center w-full p-3 rounded-lg transition capitalize ${activeTab === "guida" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:bg-gray-800"}`}
          >
            <Book size={20} className="mr-3" /> Guida & Privacy
          </button>
        </nav>
        <div className="mt-auto border-t border-gray-800 pt-4 space-y-2">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center w-full p-3 rounded-lg transition ${activeTab === "settings" ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800"}`}
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
        {/* DASHBOARD TAB (CON NASCOSTI COMPATTI) */}
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
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden mb-4">
              <table className="w-full text-left">
                <thead className="bg-gray-800 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Descrizione</th>
                    <th className="p-4 text-right">Importo</th>
                    <th className="p-4 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFondo.map((m: any) => (
                    <tr
                      key={m.unique_id}
                      className="border-b border-gray-800 hover:bg-gray-800/30 group"
                    >
                      <td className="p-4 text-gray-400">
                        {new Date(m.data).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-bold text-white">
                        {m.descrizione}
                      </td>
                      <td
                        className={`p-4 text-right font-bold ${m.importo >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {m.importo > 0 ? "+" : ""}
                        {formatCurrency(m.importo)}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => toggleRowVisibility(m.unique_id)}
                          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                          title="Nascondi dalla dashboard"
                        >
                          <EyeOff size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* SEZIONE COMPATTATA PER I NASCOSTI */}
            {hiddenFondo.length > 0 && (
              <div className="opacity-80">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex items-center text-xs font-bold text-gray-500 uppercase mb-2 ml-2 hover:text-white transition group"
                >
                  {showArchived ? (
                    <ChevronDown size={16} className="mr-1" />
                  ) : (
                    <ChevronRight size={16} className="mr-1" />
                  )}
                  <span>Transazioni Nascoste ({hiddenFondo.length})</span>
                </button>
                {showArchived && (
                  <div className="bg-gray-900/50 rounded-xl border border-gray-800/50 overflow-hidden animate-in slide-in-from-top-2">
                    <table className="w-full text-left text-sm opacity-60">
                      <tbody>
                        {hiddenFondo.map((m: any) => (
                          <tr
                            key={m.unique_id}
                            className="border-b border-gray-800 hover:bg-gray-800/30"
                          >
                            <td className="p-4 w-32 text-gray-500">
                              {new Date(m.data).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-gray-400 italic">
                              {m.descrizione}
                            </td>
                            <td className="p-4 text-right w-32 text-gray-500">
                              {formatCurrency(m.importo)}
                            </td>
                            <td className="p-4 w-10 text-right">
                              <button
                                onClick={() => toggleRowVisibility(m.unique_id)}
                                className="text-gray-500 hover:text-green-400 transition"
                                title="Ripristina"
                              >
                                <Eye size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "movimenti" && (
          <div className="grid grid-cols-12 gap-8 h-full">
            <div className="col-span-4 flex flex-col h-full overflow-hidden">
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 mb-6 space-y-3">
                <h3 className="font-bold text-green-400 mb-2">
                  NUOVO MOVIMENTO
                </h3>
                <input
                  placeholder="Nome / Descrizione"
                  className="w-full bg-black p-3 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                  value={newAcq.nome}
                  onChange={(e) =>
                    setNewAcq({ ...newAcq, nome: e.target.value })
                  }
                />
                <div className="relative">
                  <select
                    value={newAcqType}
                    onChange={(e) => setNewAcqType(e.target.value)}
                    className="w-full bg-black p-3 rounded border border-gray-700 text-white appearance-none outline-none focus:border-blue-500 font-bold cursor-pointer"
                  >
                    <option value="acquisto">
                      ACQUISTO (Uscita Fornitore)
                    </option>
                    <option value="spesa_fondo">SPESA DIRETTA FONDO</option>
                    <option value="raccolta_fondo">
                      RACCOLTA FONDO (Entrata)
                    </option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                    ▼
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder={
                      newAcqType === "raccolta_fondo"
                        ? "Quota a Testa"
                        : "Prezzo Unitario"
                    }
                    className="w-full bg-black p-3 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                    value={newAcq.prezzo}
                    onChange={(e) =>
                      setNewAcq({ ...newAcq, prezzo: e.target.value })
                    }
                  />
                  {newAcqType !== "raccolta_fondo" &&
                    newAcqType !== "spesa_fondo" && (
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
                {newAcqType !== "spesa_fondo" && (
                  <button
                    onClick={() =>
                      setModal({
                        view: "select_members",
                        data: { context: "create" },
                      })
                    }
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
                    onClick={() => selectAcquistoAndReset(a)}
                    className={`p-4 rounded border cursor-pointer flex justify-between items-center transition ${selectedAcquisto?.id === a.id ? "border-blue-500 bg-blue-900/20" : "border-gray-800 bg-gray-900 hover:bg-gray-800"}`}
                  >
                    <div>
                      <p className="font-bold text-white">{a.nome_acquisto}</p>
                      <p className="text-sm text-gray-400 flex items-center gap-2">
                        {formatCurrency(a.prezzo_unitario)}
                        {a.tipo === "spesa_fondo" && (
                          <span className="text-xs bg-purple-900 text-purple-300 px-1 rounded flex items-center">
                            <Wallet size={10} className="mr-1" /> DIRETTA
                          </span>
                        )}
                        {a.tipo === "raccolta_fondo" && (
                          <span className="text-xs bg-green-900 text-green-300 px-1 rounded flex items-center">
                            <PiggyBank size={10} className="mr-1" /> RACCOLTA
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
            <div className="col-span-8 flex flex-col h-full overflow-hidden">
              {selectedAcquisto ? (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 h-full flex flex-col">
                  <div className="p-6 border-b border-gray-800 flex flex-col gap-4 bg-gray-800/50 rounded-t-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-1">
                          {selectedAcquisto.nome_acquisto}
                        </h2>
                        <div className="text-xs text-gray-500 mb-2 font-mono flex items-center">
                          <CalendarDays size={12} className="mr-1" /> Creazione:{" "}
                          {new Date(
                            selectedAcquisto.data_creazione,
                          ).toLocaleDateString()}
                          {selectedAcquisto.completato && (
                            <span className="ml-3 text-green-600 flex items-center">
                              <CheckCircle size={12} className="mr-1" /> Chiuso:{" "}
                              {new Date(
                                selectedAcquisto.data_chiusura,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {selectedAcquisto.tipo === "spesa_fondo" ? (
                          <div className="text-purple-400 font-bold flex items-center mt-2">
                            <Wallet className="mr-2" size={18} /> USCITA DIRETTA
                            FONDO
                          </div>
                        ) : selectedAcquisto.tipo === "raccolta_fondo" ? (
                          <div className="text-green-400 font-bold flex items-center mt-2">
                            <PiggyBank className="mr-2" size={18} /> RACCOLTA
                            FONDI (ENTRATA)
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400 flex gap-4 items-center">
                            <span>
                              Prezzo Totale:{" "}
                              <b className="text-white text-lg">
                                {formatCurrency(
                                  selectedAcquisto.prezzo_unitario,
                                )}
                              </b>
                            </span>
                            <span>
                              Acconto:{" "}
                              <b className="text-blue-300 text-lg">
                                {formatCurrency(
                                  selectedAcquisto.acconto_fornitore || 0,
                                )}
                              </b>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={startEditAcquistoLogic}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded font-bold text-xs flex items-center shadow-lg"
                        >
                          <Edit2 size={14} className="mr-1" /> MODIFICA
                        </button>
                        <button
                          onClick={() => {
                            setModal({
                              view: "confirm_delete_acquisto",
                              data: { id: selectedAcquisto.id },
                            });
                          }}
                          className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded font-bold text-xs flex items-center shadow-lg"
                        >
                          <Trash2 size={14} className="mr-1" /> ELIMINA
                        </button>
                      </div>
                    </div>
                    {!selectedAcquisto.completato &&
                      selectedAcquisto.tipo !== "spesa_fondo" && (
                        <div className="flex justify-between items-end border-t border-gray-700 pt-4">
                          <div className="relative">
                            <Search
                              className="absolute left-3 top-2 text-gray-500"
                              size={16}
                            />
                            <input
                              placeholder="Cerca..."
                              className="bg-black border border-gray-700 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:border-blue-500 outline-none"
                              value={searchQuota}
                              onChange={(e) => setSearchQuota(e.target.value)}
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={async () => {
                                const debtors = quote
                                  .filter(
                                    (q) =>
                                      q.importo_versato <
                                      q.quantita *
                                        selectedAcquisto.prezzo_unitario,
                                  )
                                  .map((q) => ({
                                    Cognome: q.cognome,
                                    Nome: q.nome,
                                    Matricola: q.matricola,
                                    DaPagare:
                                      q.quantita *
                                        selectedAcquisto.prezzo_unitario -
                                      q.importo_versato,
                                  }));
                                if (debtors.length === 0)
                                  return setModal({
                                    view: "alert",
                                    data: {
                                      title: "Nessun Moroso",
                                      variant: "success",
                                      msg: "Tutti hanno pagato!",
                                    },
                                  });
                                await window.api.exportDebtors({
                                  acquistoNome: selectedAcquisto.nome_acquisto,
                                  debtors,
                                });
                              }}
                              className="bg-orange-700 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center transition"
                              title="Scarica Excel"
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
                    {selectedAcquisto.completato &&
                      selectedAcquisto.tipo !== "spesa_fondo" && (
                        <div className="flex justify-between items-center border-t border-gray-700 pt-4 bg-gray-800/30 p-2 rounded mt-2">
                          <span className="text-sm text-gray-400 flex items-center">
                            <Lock size={14} className="mr-2" /> Movimento
                            Concluso.
                          </span>
                          {!isEditingQuotes ? (
                            <button
                              onClick={enableQuoteEditing}
                              className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded font-bold text-xs flex items-center transition shadow-lg"
                            >
                              <Unlock size={14} className="mr-2" /> MODIFICA
                              QUOTE
                            </button>
                          ) : (
                            <button
                              onClick={saveBufferedQuotes}
                              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded font-bold text-xs flex items-center transition shadow-lg animate-pulse"
                            >
                              <Save size={14} className="mr-2" /> SALVA
                              MODIFICHE
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {selectedAcquisto.tipo === "spesa_fondo" ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <CheckSquare size={64} className="mb-4 opacity-20" />
                        <p>Questa spesa è registrata come uscita diretta.</p>
                        <p className="text-sm opacity-60">
                          Nessuna quota soci da gestire.
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
                          {filteredQuote.length > 0 &&
                            filteredQuote.map((q: any) => {
                              const dov =
                                q.quantita * selectedAcquisto.prezzo_unitario;
                              const isDisabled =
                                selectedAcquisto.completato && !isEditingQuotes;
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
                                    <div className="flex justify-center">
                                      {selectedAcquisto.tipo ===
                                      "raccolta_fondo" ? (
                                        <span className="text-gray-500 font-bold">
                                          -
                                        </span>
                                      ) : (
                                        <QuantityControl
                                          value={q.quantita}
                                          onChange={(v) =>
                                            handleUpdateQuotaUser(
                                              q,
                                              "quantita",
                                              v,
                                            )
                                          }
                                          disabled={isDisabled}
                                        />
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-4 text-right font-mono font-bold text-white">
                                    {formatCurrency(dov)}
                                  </td>
                                  <td className="p-4 text-right">
                                    <input
                                      type="number"
                                      disabled={isDisabled}
                                      className={`bg-black border rounded p-2 w-24 text-right font-bold text-lg outline-none ${q.importo_versato < 0 || q.importo_versato > dov ? "border-red-500 text-red-500" : "border-gray-700 text-white focus:border-blue-500"} ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                                      value={q.importo_versato}
                                      onChange={(e) =>
                                        handleUpdateQuotaUser(
                                          q,
                                          "importo_versato",
                                          e.target.value,
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
                  <p>Seleziona un movimento</p>
                </div>
              )}
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
                  className="bg-red-900/30 border border-red-900 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded flex items-center font-bold text-xs"
                >
                  <Trash2 className="mr-2" size={16} /> ELIMINA TUTTI
                </button>
                <button
                  onClick={handleImportMembriExcel}
                  className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center font-bold"
                >
                  <Download className="mr-2" size={18} /> Importa Excel
                </button>
              </div>
            </div>
            <form
              onSubmit={handleSaveMembro}
              className={`p-6 rounded-xl border mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end transition-colors ${editingMembroId ? "bg-blue-900/20 border-blue-500" : "bg-gray-900 border-gray-800"}`}
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
                    className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded font-bold flex-1"
                  >
                    ANNULLA
                  </button>
                )}
                <button
                  type="submit"
                  className={`${editingMembroId ? "bg-blue-600 hover:bg-blue-500" : "bg-green-600 hover:bg-green-500"} text-white p-3 rounded font-bold flex-1`}
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
                  {filteredMembri.map((m: any) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition"
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
                          onClick={() =>
                            setModal({
                              view: "confirm_delete_membro",
                              data: { id: m.id },
                            })
                          }
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
                    file Excel. Se elimini un membro, questo viene solo
                    "nascosto" per preservare lo storico dei pagamenti
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
                  SQLite.
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
      </main>
    </div>
  );
}

export default App;
