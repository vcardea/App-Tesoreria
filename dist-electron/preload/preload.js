"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("api", {
  logAction: (msg) => electron.ipcRenderer.invoke("log-ui-action", msg),
  quitApp: () => electron.ipcRenderer.invoke("quit-app"),
  getBackups: () => electron.ipcRenderer.invoke("get-backups"),
  openBackupFolder: () => electron.ipcRenderer.invoke("open-backup-folder"),
  restoreBackup: (filename) => electron.ipcRenderer.invoke("restore-backup", filename),
  getSituazione: () => electron.ipcRenderer.invoke("get-situazione"),
  addMovimentoFondo: (data) => electron.ipcRenderer.invoke("add-movimento-fondo", data),
  getMovimentiFondo: () => electron.ipcRenderer.invoke("get-movimenti-fondo"),
  getMembri: () => electron.ipcRenderer.invoke("get-membri"),
  addMembro: (m) => electron.ipcRenderer.invoke("add-membro", m),
  deleteMembro: (id) => electron.ipcRenderer.invoke("delete-membro", id),
  createAcquisto: (data) => electron.ipcRenderer.invoke("create-acquisto", data),
  getAcquisti: (attivi) => electron.ipcRenderer.invoke("get-acquisti", attivi),
  getQuote: (id) => electron.ipcRenderer.invoke("get-quote", id),
  updateQuota: (data) => electron.ipcRenderer.invoke("update-quota", data),
  completaAcquisto: (id) => electron.ipcRenderer.invoke("completa-acquisto", id),
  selectFile: () => electron.ipcRenderer.invoke("select-file"),
  analyzePdf: (path) => electron.ipcRenderer.invoke("analyze-pdf", path)
});
