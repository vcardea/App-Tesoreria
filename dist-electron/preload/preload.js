"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  logAction: (msg) => electron.ipcRenderer.invoke("log-ui-action", msg),
  openLogFile: () => electron.ipcRenderer.invoke("open-log-file"),
  quitApp: () => electron.ipcRenderer.invoke("quit-app"),
  getBackups: () => electron.ipcRenderer.invoke("get-backups"),
  openBackupFolder: () => electron.ipcRenderer.invoke("open-backup-folder"),
  restoreBackup: (filename) => electron.ipcRenderer.invoke("restore-backup", filename),
  getSituazione: () => electron.ipcRenderer.invoke("get-situazione"),
  addMovimentoFondo: (data) => electron.ipcRenderer.invoke("add-movimento-fondo", data),
  getMovimentiFondo: () => electron.ipcRenderer.invoke("get-movimenti-fondo"),
  getMembri: () => electron.ipcRenderer.invoke("get-membri"),
  addMembro: (m) => electron.ipcRenderer.invoke("add-membro", m),
  updateMembro: (id, m) => electron.ipcRenderer.invoke("update-membro", { id, membro: m }),
  deleteMembro: (id) => electron.ipcRenderer.invoke("delete-membro", id),
  importMembriExcel: (path) => electron.ipcRenderer.invoke("import-membri-excel", path),
  // ACQUISTI
  createAcquisto: (data) => electron.ipcRenderer.invoke("create-acquisto", data),
  updateAcquisto: (data) => electron.ipcRenderer.invoke("update-acquisto", data),
  deleteAcquisto: (id) => electron.ipcRenderer.invoke("delete-acquisto", id),
  getAcquisti: (attivi) => electron.ipcRenderer.invoke("get-acquisti", attivi),
  getQuote: (id) => electron.ipcRenderer.invoke("get-quote", id),
  updateQuota: (data) => electron.ipcRenderer.invoke("update-quota", data),
  completaAcquisto: (id) => electron.ipcRenderer.invoke("completa-acquisto", id),
  selectFile: () => electron.ipcRenderer.invoke("select-file"),
  analyzeExcelBank: (path) => electron.ipcRenderer.invoke("analyze-excel-bank", path)
});
