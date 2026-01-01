import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  logAction: (msg: string) => ipcRenderer.invoke("log-ui-action", msg),
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
  deleteMembro: (id: number) => ipcRenderer.invoke("delete-membro", id),

  createAcquisto: (data: any) => ipcRenderer.invoke("create-acquisto", data),
  getAcquisti: (attivi?: boolean) => ipcRenderer.invoke("get-acquisti", attivi),
  getQuote: (id: number) => ipcRenderer.invoke("get-quote", id),
  updateQuota: (data: any) => ipcRenderer.invoke("update-quota", data),
  completaAcquisto: (id: number) => ipcRenderer.invoke("completa-acquisto", id),

  selectFile: () => ipcRenderer.invoke("select-file"),
  analyzePdf: (path: string) => ipcRenderer.invoke("analyze-pdf", path),
});
