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
  HelpCircle,
  Info,
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
    className={`flex items-center bg-gray-950 border border-gray-600 rounded-lg overflow-hidden w-40 h-10 shadow-lg ${
      disabled ? "opacity-50 pointer-events-none" : ""
    }`}
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

  const [newAcqDate, setNewAcqDate] = useState("");
  const [selectedMembersForPurchase, setSelectedMembersForPurchase] = useState<
    any[]
  >([]);
  const [editingMemberSelection, setEditingMemberSelection] = useState<
    number[]
  >([]);
  const [showArchived, setShowArchived] = useState(false);

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

  // STATI WIZARD IMPORTAZIONE (CREAZIONE)
  const [importCreationMatches, setImportCreationMatches] = useState<any[]>([]);
  const [selectedMatchesForCreation, setSelectedMatchesForCreation] = useState<
    number[]
  >([]);
  const [markAsPaid, setMarkAsPaid] = useState(false);
  // Filtri Wizard
  const [wizardSearch, setWizardSearch] = useState("");
  const [wizardDateStart, setWizardDateStart] = useState("");
  const [wizardDateEnd, setWizardDateEnd] = useState("");

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

  // FILTRO WIZARD IMPORTAZIONE (NUOVO)
  const filteredWizardMatches = useMemo(() => {
    return importCreationMatches
      .map((m, i) => ({ ...m, originalIndex: i }))
      .filter((m) => {
        const textMatch =
          m.nome_trovato.toUpperCase().includes(wizardSearch.toUpperCase()) ||
          m.linea_originale.toUpperCase().includes(wizardSearch.toUpperCase());
        if (!textMatch) return false;
        if (m.data_movimento && (wizardDateStart || wizardDateEnd)) {
          const mDate = new Date(m.data_movimento);
          mDate.setHours(0, 0, 0, 0);
          if (wizardDateStart && mDate < new Date(wizardDateStart))
            return false;
          if (wizardDateEnd && mDate > new Date(wizardDateEnd)) return false;
        }
        return true;
      });
  }, [importCreationMatches, wizardSearch, wizardDateStart, wizardDateEnd]);

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

    // CONTROLLO DATA FUTURA
    if (newAcqType === "storico") {
      if (!newAcqDate) {
        setModal({
          view: "alert",
          data: {
            title: "Data Mancante",
            msg: "Inserisci la data della transazione storica.",
          },
        });
        return;
      }
      // Confronto date (solo giorno/mese/anno)
      const selected = new Date(newAcqDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Ignora l'ora di oggi

      if (selected > today) {
        setModal({
          view: "alert",
          data: {
            title: "Data Invalida",
            msg: "Non puoi registrare transazioni nel futuro.",
          },
        });
        return;
      }
    }

    const p = parseFloat(newAcq.prezzo);
    const a = newAcq.acconto ? parseFloat(newAcq.acconto) : 0;

    if (p < 0 || a < 0) {
      setModal({
        view: "alert",
        data: { title: "Errore Valori", msg: "No negativi." },
      });
      return;
    }

    let targetIds: any = null;
    if (
      newAcqType !== "spesa_fondo" &&
      newAcqType !== "storico" &&
      selectedMembersForPurchase.length > 0
    )
      targetIds = selectedMembersForPurchase;

    await window.api.createAcquisto({
      nome: newAcq.nome,
      prezzo: p,
      acconto: newAcqType === "spesa_fondo" || newAcqType === "storico" ? 0 : a,
      targetMemberIds: targetIds,
      tipo: newAcqType,
      date: newAcqDate || null,
    });

    setNewAcq({ nome: "", prezzo: "", acconto: "" });
    setNewAcqDate("");
    setSelectedMembersForPurchase([]);
    loadData();
  };

  const startEditAcquistoLogic = async () => {
    const q = await window.api.getQuote(selectedAcquisto.id);
    const currentMemberIds = q.map((i: any) => i.membro_id);
    setEditingMemberSelection(currentMemberIds);
    const currentDate = selectedAcquisto.data_creazione
      ? new Date(selectedAcquisto.data_creazione).toISOString().split("T")[0]
      : "";
    setEditingAcq({
      id: selectedAcquisto.id,
      nome: selectedAcquisto.nome_acquisto,
      prezzo: String(selectedAcquisto.prezzo_unitario),
      acconto: String(selectedAcquisto.acconto_fornitore || 0),
      date: currentDate,
      tipo: selectedAcquisto.tipo,
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
      date: editingAcq.date,
    });
    setModal({ view: "none" });
    if (selectedAcquisto && selectedAcquisto.id === editingAcq.id) {
      const updatedList = await window.api.getAcquisti();
      const newItem = updatedList.find((a: any) => a.id === editingAcq.id);
      setSelectedAcquisto(newItem);
      setQuote(await window.api.getQuote(newItem.id));
    }
    setEditingAcq(null);
    loadData();
  };

  const handleUpdateQuotaUser = async (
    q: Quota,
    field: string,
    val: string | number,
  ) => {
    let v = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(v) || v < 0) return;
    const newQta = field === "quantita" ? v : q.quantita;
    const newVersato = field === "importo_versato" ? v : q.importo_versato;
    if (isEditingQuotes) {
      setTempQuotes((prev) =>
        prev.map((i) =>
          i.id === q.id
            ? { ...i, quantita: newQta, importo_versato: newVersato }
            : i,
        ),
      );
    } else {
      await window.api.updateQuota({
        id: q.id,
        qta: newQta,
        versato: newVersato,
      });
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

  // --- FIX BUG SCHERMO BIANCO (Gestione vecchio Excel) ---
  const handleBankExcelUpload = async () => {
    const path = await window.api.selectFile();
    if (!path) return;
    setIsLoading(true);
    try {
      // result ora è { matched, unmatched }
      const result = await window.api.analyzeExcelBank(path);
      // Prendo solo MATCHED per la vecchia funzione
      const matches = result.matched;
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

  const toggleRowVisibility = async (uniqueId: string) => {
    await window.api.toggleDashboardVisibility(uniqueId);
    loadData();
  };

  const handleDeleteMovimentoFondo = async () => {
    const id = modal.data?.id;
    if (id) {
      await window.api.deleteMovimentoFondo(id);
      setModal({ view: "none" });
      loadData();
    }
  };

  // --- NUOVI HANDLER IMPOSTAZIONI ---
  const handleManualBackup = async () => {
    setIsLoading(true);
    const res = await window.api.triggerManualBackup();
    setIsLoading(false);
    if (res) {
      setModal({
        view: "alert",
        data: {
          title: "Backup Completato",
          variant: "success",
          msg: `Creato file: ${res}`,
        },
      });
      loadData(); // Ricarica lista backup
    } else {
      setModal({
        view: "alert",
        data: { title: "Errore", msg: "Impossibile creare backup." },
      });
    }
  };

  const handleResetAnnualData = async () => {
    setIsLoading(true);
    const success = await window.api.resetAnnualData();
    setIsLoading(false);
    setModal({ view: "none" });
    if (success) {
      setModal({
        view: "alert",
        data: {
          title: "Reset Completato",
          variant: "success",
          msg: "Tutti i movimenti sono stati archiviati. I membri sono stati mantenuti.",
        },
      });
      loadData();
    } else {
      setModal({
        view: "alert",
        data: { title: "Errore", msg: "Reset fallito." },
      });
    }
  };

  const handleExportMembri = async () => {
    try {
      const success = await window.api.exportMembri();
      if (success)
        setModal({
          view: "alert",
          data: {
            title: "Successo",
            variant: "success",
            msg: "Lista membri esportata correttamente.",
          },
        });
    } catch (e: any) {
      setModal({
        view: "alert",
        data: { title: "Errore Export", msg: e.message },
      });
    }
  };

  const handleBankImportForCreation = async () => {
    const path = await window.api.selectFile();
    if (!path) return;
    setIsLoading(true);
    try {
      const result = await window.api.analyzeExcelBank(path);
      setImportCreationMatches(result.matched);
      // Seleziona di default tutti i match trovati
      setSelectedMatchesForCreation(
        result.matched.map((_: any, i: number) => i),
      );
      setModal({ view: "import_creation_wizard" });
    } catch (e: any) {
      setModal({ view: "alert", data: { title: "Errore", msg: e.message } });
    } finally {
      setIsLoading(false);
    }
  };

  const confirmCreationFromBank = () => {
    // 1. Crea una Mappa per aggregare (chiave: membro_id)
    const aggregationMap = new Map<number, number>();

    // 2. Cicla su tutte le righe selezionate
    selectedMatchesForCreation.forEach((idx) => {
      const m = importCreationMatches[idx];
      const currentTotal = aggregationMap.get(m.membro_id) || 0;

      // Se l'utente ha spuntato "Registra come PAGATI", sommiamo l'importo.
      // Altrimenti sommiamo 0 (ma registriamo comunque l'ID per la selezione).
      const amountToAdd = markAsPaid ? m.importo_trovato : 0;

      aggregationMap.set(m.membro_id, currentTotal + amountToAdd);
    });

    // 3. Converti la Mappa in un array pulito di oggetti
    const selectedPeople = Array.from(aggregationMap.entries()).map(
      ([id, versato]) => ({
        id: id,
        versato: versato,
      }),
    );

    // 4. Salva nello stato (usando 'as any' perché lo stato era number[], ma ora gestiamo oggetti)
    setSelectedMembersForPurchase(selectedPeople as any);
    setModal({ view: "none" });
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden relative">
      {isLoading && (
        <div className="absolute inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={64} />
        </div>
      )}

      {/* --- MODALE SELECT MEMBERS --- */}
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
                          setList((prev: any[]) =>
                            prev.includes(m.id)
                              ? prev.filter((x: any) => x !== m.id)
                              : [...prev, m.id],
                          )
                        }
                        className={`flex items-center p-3 rounded cursor-pointer border transition ${
                          currentList.includes(m.id)
                            ? "bg-blue-900/40 border-blue-500"
                            : "bg-gray-800 border-transparent hover:bg-gray-700"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${
                            currentList.includes(m.id)
                              ? "bg-blue-500 border-blue-500"
                              : "border-gray-500"
                          }`}
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

      {/* --- MODALE EDIT ACQUISTO --- */}
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
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold">
                Data (Opzionale)
              </label>
              <input
                type="date"
                value={editingAcq.date || ""}
                onChange={(e) =>
                  setEditingAcq({ ...editingAcq, date: e.target.value })
                }
                className="w-full bg-black p-3 rounded border border-gray-700 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase font-bold">
                  Importo
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
              {editingAcq.tipo !== "storico" && (
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">
                    Acconto
                  </label>
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
              )}
            </div>
            {selectedAcquisto &&
              selectedAcquisto.tipo !== "spesa_fondo" &&
              selectedAcquisto.tipo !== "storico" && (
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
      <CustomModal
        isOpen={modal.view === "confirm_delete_fondo"}
        title="Storno Movimento"
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
              onClick={handleDeleteMovimentoFondo}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 font-bold text-white shadow-lg"
            >
              CONFERMA STORNO
            </button>
          </>
        }
      >
        <p>
          Attenzione: stai per eliminare definitivamente questo movimento dal
          Fondo Cassa. L'operazione ricalcolerà il saldo.
        </p>
      </CustomModal>

      <CustomModal
        isOpen={modal.view === "confirm_delete_fondo"}
        title="Storno Movimento"
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
              onClick={handleDeleteMovimentoFondo}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 font-bold text-white shadow-lg"
            >
              CONFERMA STORNO
            </button>
          </>
        }
      >
        <p>
          Attenzione: stai per eliminare definitivamente questo movimento dal
          Fondo Cassa. L'operazione ricalcolerà il saldo.
        </p>
      </CustomModal>

      <CustomModal
        isOpen={modal.view === "confirm_reset_annual"}
        title="Conferma Reset Annuale"
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
              onClick={handleResetAnnualData}
              className="bg-red-600 text-white px-4 py-2 rounded font-bold shadow-lg hover:bg-red-500"
            >
              CONFERMA E AZZERA
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-lg font-bold text-red-400">SEI DAVVERO SICURO?</p>
          <p>Questa operazione:</p>
          <ul className="list-disc list-inside text-gray-300 ml-2">
            <li>
              Cancellerà <b>TUTTI</b> i movimenti di acquisto.
            </li>
            <li>
              Cancellerà <b>TUTTO</b> lo storico del fondo cassa.
            </li>
            <li>
              Manterrà <b>SOLO</b> l'anagrafica dei membri.
            </li>
          </ul>
          <p className="text-sm text-gray-400 mt-4">
            Verrà creato un backup di sicurezza prima di procedere, ma
            l'operazione è drastica.
          </p>
        </div>
      </CustomModal>

      {/* --- MODALE EXCEL BANK (VECCHIO, PER I SALDI) --- */}
      {modal.view === "excel_bank" && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-8">
          <div className="bg-gray-900 w-full max-w-6xl h-[90vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between bg-gray-800">
              <h3 className="text-xl font-bold flex items-center text-green-500">
                <FileSpreadsheet className="mr-2" /> Salda Debiti da Banca
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
                      className={`border-b border-gray-800 cursor-pointer transition-colors ${
                        selectedMatches.includes(m.originalIndex)
                          ? "bg-green-900/20 hover:bg-green-900/30"
                          : "hover:bg-gray-800/50"
                      }`}
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

      {/* --- MODALE WIZARD IMPORTAZIONE (NUOVO STILE) --- */}
      {modal.view === "import_creation_wizard" && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-8">
          <div className="bg-gray-900 w-full max-w-6xl h-[90vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between bg-gray-800">
              <h3 className="text-xl font-bold flex items-center text-green-500">
                <FileSpreadsheet className="mr-2" /> Seleziona Partecipanti da
                Excel
              </h3>
              <button onClick={() => setModal({ view: "none" })}>
                <X size={24} />
              </button>
            </div>

            {/* FILTRI SUPERIORI (Stile uguale all'altro) */}
            <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-2 items-center">
                <button
                  onClick={() =>
                    setSelectedMatchesForCreation(
                      filteredWizardMatches.map((m) => m.originalIndex),
                    )
                  }
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded flex items-center"
                >
                  <ListChecks size={14} className="mr-1" /> TUTTI VISIBILI
                </button>
                <button
                  onClick={() => setSelectedMatchesForCreation([])}
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
                    value={wizardDateStart}
                    onChange={(e) => setWizardDateStart(e.target.value)}
                  />
                  <span className="text-gray-600">-</span>
                  <input
                    type="date"
                    className="bg-black border border-gray-600 rounded p-1 text-sm text-gray-300"
                    value={wizardDateEnd}
                    onChange={(e) => setWizardDateEnd(e.target.value)}
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
                  placeholder="Cerca..."
                  className="bg-black border border-gray-600 rounded-full pl-10 pr-4 py-2 text-sm w-48 focus:border-green-500 outline-none"
                  value={wizardSearch}
                  onChange={(e) => setWizardSearch(e.target.value)}
                />
              </div>
            </div>

            {/* BARRA OPZIONI (Mark as Paid) */}
            <div className="p-3 bg-blue-900/20 border-b border-gray-700 flex justify-between items-center">
              <label className="flex items-center cursor-pointer text-sm hover:text-white text-gray-300 select-none">
                <input
                  type="checkbox"
                  checked={markAsPaid}
                  onChange={(e) => setMarkAsPaid(e.target.checked)}
                  className="mr-3 w-5 h-5 accent-green-500"
                />
                Registra come già pagati (Usa importo Excel come versato)
              </label>
              <div className="text-sm text-gray-400">
                Selezionati:{" "}
                <b className="text-white">
                  {selectedMatchesForCreation.length}
                </b>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="text-gray-500 uppercase text-xs sticky top-0 bg-gray-900 z-10 shadow-sm">
                  <tr>
                    <th className="p-4 w-10 text-center">✓</th>
                    <th className="p-4">Data</th>
                    <th className="p-4">Membro Riconosciuto</th>
                    <th className="p-4">Importo</th>
                    <th className="p-4">Dettaglio Originale</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWizardMatches.length > 0 ? (
                    filteredWizardMatches.map((m) => (
                      <tr
                        key={m.originalIndex}
                        className={`border-b border-gray-800 cursor-pointer transition-colors ${
                          selectedMatchesForCreation.includes(m.originalIndex)
                            ? "bg-green-900/20 hover:bg-green-900/30"
                            : "hover:bg-gray-800/50"
                        }`}
                        onClick={() =>
                          setSelectedMatchesForCreation((prev) =>
                            prev.includes(m.originalIndex)
                              ? prev.filter((x) => x !== m.originalIndex)
                              : [...prev, m.originalIndex],
                          )
                        }
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMatchesForCreation.includes(
                              m.originalIndex,
                            )}
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        Nessun risultato trovato con i filtri attuali.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 border-t border-gray-700 bg-gray-800 flex justify-end">
              <button
                onClick={confirmCreationFromBank}
                className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-bold shadow-lg text-white"
              >
                CONFERMA SELEZIONE
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
              {tab === "movimenti" && (
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
                    <th className="p-4 w-20 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFondo.map((m: any) => (
                    <tr
                      key={m.unique_id}
                      className="border-b border-gray-800 group hover:bg-gray-800/30 transition-colors"
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
                      <td className="p-4 text-right flex justify-end gap-2">
                        {/* Tasto Delete SOLO per Fondo Cassa (F-...) */}
                        {m.unique_id.startsWith("F-") && (
                          <button
                            onClick={() =>
                              setModal({
                                view: "confirm_delete_fondo",
                                data: {
                                  id: parseInt(m.unique_id.substring(2)),
                                },
                              })
                            }
                            className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                            title="Elimina definitivamente (Storno)"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {/* Tasto Nascondi */}
                        <button
                          onClick={() => toggleRowVisibility(m.unique_id)}
                          className="text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition"
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

        {/* GUIDA TAB (RISCRITTA) */}
        {activeTab === "guida" && (
          <div className="max-w-5xl mx-auto space-y-12 animate-in slide-in-from-bottom duration-500">
            {/* Header Guida */}
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 text-white">
                Manuale d'Uso
              </h2>
              <p className="text-gray-400">
                Benvenuto nel gestionale di Tesoreria. Ecco come iniziare in
                pochi passi.
              </p>
            </div>

            {/* Step 1: Membri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <div className="bg-blue-900/20 text-blue-400 font-bold px-3 py-1 rounded inline-block mb-4">
                  PASSO 1
                </div>
                <h3 className="text-2xl font-bold mb-3 flex items-center">
                  <Users className="mr-3" /> Gestione Membri
                </h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Prima di tutto, devi popolare il database con i tuoi soci.
                  Puoi farlo in due modi:
                </p>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>
                    <b className="text-white">Manualmente:</b> Inserisci nome,
                    cognome e matricola nel form dedicato.
                  </li>
                  <li>
                    <b className="text-white">Import Excel:</b> Carica un file
                    `.xlsx` contenente le colonne "NOME" e "COGNOME". Il sistema
                    li importerà automaticamente.
                  </li>
                </ul>
              </div>
              <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                <div className="flex items-center text-yellow-500 mb-2 font-bold">
                  <Info size={18} className="mr-2" /> Nota Bene
                </div>
                <p className="text-sm text-gray-400">
                  L'eliminazione di un membro è "logica": i suoi dati vengono
                  nascosti ma non cancellati per preservare lo storico dei
                  pagamenti passati.
                </p>
              </div>
            </div>

            <hr className="border-gray-800" />

            {/* Step 2: Movimenti */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div>
                <div className="bg-green-900/20 text-green-400 font-bold px-3 py-1 rounded inline-block mb-4">
                  PASSO 2
                </div>
                <h3 className="text-2xl font-bold mb-3 flex items-center">
                  <ShoppingCart className="mr-3" /> Creazione Movimenti
                </h3>
                <p className="text-gray-300 leading-relaxed mb-4">
                  Un "Movimento" è qualsiasi operazione che coinvolge denaro.
                  Scegli il tipo corretto:
                </p>
                <ul className="space-y-4">
                  <li className="bg-gray-900 p-4 rounded border border-gray-800">
                    <strong className="text-white block mb-1">
                      Acquisto Standard
                    </strong>
                    <span className="text-gray-400 text-sm">
                      Spese divise tra i soci (es. Felpe, Cene). Genera un
                      debito per ogni membro selezionato.
                    </span>
                  </li>
                  <li className="bg-gray-900 p-4 rounded border border-gray-800">
                    <strong className="text-white block mb-1">
                      Spesa Fondo (Diretta)
                    </strong>
                    <span className="text-gray-400 text-sm">
                      Uscite immediate dalla cassa per spese comuni (es.
                      Cancelleria, Sito Web). Non tocca i conti dei singoli
                      soci.
                    </span>
                  </li>
                  <li className="bg-gray-900 p-4 rounded border border-gray-800">
                    <strong className="text-white block mb-1">
                      Raccolta Fondo
                    </strong>
                    <span className="text-gray-400 text-sm">
                      Entrate richieste ai soci (es. Quota associativa annuale).
                    </span>
                  </li>
                </ul>
              </div>
              <div className="space-y-6">
                <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                  <h4 className="font-bold text-white mb-2 flex items-center">
                    <FileSpreadsheet
                      size={18}
                      className="mr-2 text-green-500"
                    />
                    Novità: Importazione da Banca
                  </h4>
                  <p className="text-sm text-gray-400 mb-3">
                    Quando crei un movimento, puoi caricare l'estratto conto
                    bancario (Excel). Il sistema cercherà automaticamente i nomi
                    dei soci nella descrizione dei bonifici.
                  </p>
                  <p className="text-sm text-gray-400">
                    Se selezioni <b>"Registra come GIÀ PAGATI"</b>, il sistema
                    segnerà automaticamente che quei soci hanno già saldato la
                    loro quota.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-gray-800" />

            {/* Step 3: Gestione Quote */}
            <div>
              <div className="bg-purple-900/20 text-purple-400 font-bold px-3 py-1 rounded inline-block mb-4">
                PASSO 3
              </div>
              <h3 className="text-2xl font-bold mb-3 flex items-center">
                <Edit2 className="mr-3" /> Gestione Quote e Saldi
              </h3>
              <p className="text-gray-300 leading-relaxed max-w-3xl">
                Una volta creato un movimento, selezionalo dalla lista. A destra
                vedrai l'elenco di chi deve pagare.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-gray-900 p-4 rounded border border-gray-800">
                  <strong className="text-white">Modifica Quote</strong>
                  <p className="text-sm text-gray-400 mt-2">
                    Usa i tasti + e - per cambiare la quantità se un socio ha
                    preso più pezzi (es. 2 magliette).
                  </p>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-gray-800">
                  <strong className="text-white">Registra Pagamento</strong>
                  <p className="text-sm text-gray-400 mt-2">
                    Scrivi l'importo nella casella "Versato" quando ricevi i
                    soldi (contanti o altro).
                  </p>
                </div>
                <div className="bg-gray-900 p-4 rounded border border-gray-800">
                  <strong className="text-white">Import Banca</strong>
                  <p className="text-sm text-gray-400 mt-2">
                    Usa il tasto "Banca" per caricare un Excel e far saldare
                    automaticamente chi ha fatto il bonifico.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="mt-16 pt-8 border-t-2 border-gray-800">
              <h2 className="text-3xl font-bold mb-6 flex items-center">
                <ShieldCheck className="mr-3 text-green-500" /> Informativa
                Privacy e Sicurezza
              </h2>
              <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 text-gray-300 text-sm space-y-4">
                <p>
                  <strong>1. Natura Offline del Software</strong>
                  <br />
                  Questa applicazione opera in modalità completamente offline.
                  Nessun dato viene mai inviato a server esterni, cloud o terze
                  parti. L'intero database risiede fisicamente sul disco rigido
                  della macchina in uso.
                </p>
                <p>
                  <strong>2. Localizzazione dei Dati</strong>
                  <br />
                  Tutti i dati sensibili (nomi, cognomi, transazioni
                  finanziarie) sono salvati in un database SQLite criptato
                  situato nella cartella utente del sistema operativo (
                  <code>%APPDATA%</code> su Windows).
                </p>
                <p>
                  <strong>3. Responsabilità e Backup</strong>
                  <br />
                  Il sistema esegue backup automatici locali ad ogni avvio.
                  Tuttavia, essendo i dati residenti sul dispositivo, è
                  responsabilità esclusiva dell'utente proteggere l'accesso al
                  computer e provvedere a copie di sicurezza esterne se
                  necessario.
                </p>
                <p>
                  <strong>4. Conformità</strong>
                  <br />
                  Il software è uno strumento di ausilio alla gestione
                  contabile. L'operatore che utilizza il software agisce in
                  qualità di Titolare del Trattamento dei dati inseriti.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ALTRE TAB INVARIATE */}
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
                    <option value="storico">STORICO (Solo Memoria)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-500">
                    ▼
                  </div>
                </div>

                {/* DATA INPUT (Solo per Storico) */}
                {newAcqType === "storico" && (
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-500 font-bold mb-1">
                      DATA TRANSAZIONE
                    </label>
                    <input
                      type="date"
                      className="w-full bg-black p-3 rounded border border-gray-700 text-white focus:border-blue-500 outline-none"
                      value={newAcqDate}
                      onChange={(e) => setNewAcqDate(e.target.value)}
                      required
                    />
                  </div>
                )}

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
                    newAcqType !== "spesa_fondo" &&
                    newAcqType !== "storico" && (
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

                {newAcqType !== "spesa_fondo" && newAcqType !== "storico" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setModal({
                          view: "select_members",
                          data: { context: "create" },
                        })
                      }
                      className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 p-3 rounded font-bold transition flex justify-between items-center text-sm"
                    >
                      <span>Manuale:</span>
                      <span className="text-white bg-gray-900 px-2 py-1 rounded">
                        {selectedMembersForPurchase.length === 0
                          ? "TUTTI"
                          : `${selectedMembersForPurchase.length} Scelti`}
                      </span>
                    </button>
                    <button
                      onClick={handleBankImportForCreation}
                      className="bg-green-800 hover:bg-green-700 text-white px-4 rounded font-bold border border-green-600 flex items-center justify-center"
                      title="Importa da Excel Banca"
                    >
                      <FileSpreadsheet size={20} />
                    </button>
                  </div>
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
                    className={`p-4 rounded border cursor-pointer flex justify-between items-center transition ${
                      selectedAcquisto?.id === a.id
                        ? "border-blue-500 bg-blue-900/20"
                        : "border-gray-800 bg-gray-900 hover:bg-gray-800"
                    }`}
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
                          {filteredQuote.map((q: any) => {
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
                                    className={`bg-black border rounded p-2 w-24 text-right font-bold text-lg outline-none ${
                                      q.importo_versato < 0 ||
                                      q.importo_versato > dov
                                        ? "border-red-500 text-red-500"
                                        : "border-gray-700 text-white focus:border-blue-500"
                                    } ${
                                      isDisabled
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }`}
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
                  onClick={handleExportMembri}
                  className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center font-bold"
                >
                  <FileSpreadsheet className="mr-2" size={18} /> Esporta Lista
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
                    className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded font-bold flex-1"
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
                  } text-white p-3 rounded font-bold flex-1`}
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

            {/* NUOVO PANNELLO AZIONI RAPIDE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h3 className="text-xl font-bold text-white mb-2">
                  Sicurezza Dati
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Esegui un backup manuale istantaneo prima di operazioni
                  importanti.
                </p>
                <button
                  onClick={handleManualBackup}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded font-bold transition flex items-center justify-center"
                >
                  <Save className="mr-2" size={18} /> BACKUP ADESSO
                </button>
              </div>

              <div className="bg-red-900/10 p-6 rounded-2xl border border-red-900/30">
                <h3 className="text-xl font-bold text-red-400 mb-2">
                  Zona Pericolo
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Azzera tutti i movimenti e il fondo cassa per il nuovo anno.{" "}
                  <b className="text-white">I membri NON vengono cancellati.</b>{" "}
                  Viene creato un backup automatico prima di procedere.
                </p>
                <button
                  onClick={() => setModal({ view: "confirm_reset_annual" })}
                  className="w-full bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 p-3 rounded font-bold transition flex items-center justify-center"
                >
                  <AlertTriangle className="mr-2" size={18} /> NUOVO ANNO
                  CONTABILE
                </button>
              </div>
            </div>

            <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-blue-400">
                  Storico Backup e Log
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
