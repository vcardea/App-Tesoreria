import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  logAction: (msg: string) => ipcRenderer.invoke("log-ui-action", msg),
  openLogFile: () => ipcRenderer.invoke("open-log-file"),
  quitApp: () => ipcRenderer.invoke("quit-app"),
  getBackups: () => ipcRenderer.invoke("get-backups"),
  openBackupFolder: () => ipcRenderer.invoke("open-backup-folder"),
  restoreBackup: (filename: string) =>
    ipcRenderer.invoke("restore-backup", filename),

  getSituazione: () => ipcRenderer.invoke("get-situazione"),
  addMovimentoFondo: (data: any) =>
    ipcRenderer.invoke("add-movimento-fondo", data),
  getMovimentiFondo: () => ipcRenderer.invoke("get-movimenti-fondo"),

  getMembri: () => ipcRenderer.invoke("get-membri"),
  addMembro: (m: any) => ipcRenderer.invoke("add-membro", m),
  updateMembro: (id: number, m: any) =>
    ipcRenderer.invoke("update-membro", { id, membro: m }),
  deleteMembro: (id: number) => ipcRenderer.invoke("delete-membro", id),
  importMembriExcel: (path: string) =>
    ipcRenderer.invoke("import-membri-excel", path),

  // ACQUISTI
  createAcquisto: (data: any) => ipcRenderer.invoke("create-acquisto", data),
  updateAcquisto: (data: any) => ipcRenderer.invoke("update-acquisto", data),
  deleteAcquisto: (id: number) => ipcRenderer.invoke("delete-acquisto", id),
  getAcquisti: (attivi?: boolean) => ipcRenderer.invoke("get-acquisti", attivi),
  getQuote: (id: number) => ipcRenderer.invoke("get-quote", id),
  updateQuota: (data: any) => ipcRenderer.invoke("update-quota", data),
  completaAcquisto: (id: number) => ipcRenderer.invoke("completa-acquisto", id),

  selectFile: () => ipcRenderer.invoke("select-file"),
  analyzeExcelBank: (path: string) =>
    ipcRenderer.invoke("analyze-excel-bank", path),
});
