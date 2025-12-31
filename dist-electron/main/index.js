"use strict";
const electron = require("electron");
const path = require("path");
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}
electron.app.whenReady().then(createWindow);
