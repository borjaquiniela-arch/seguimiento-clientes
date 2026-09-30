const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let serverProc = null;
const remote = process.env.PUBLIC_URL || process.env.SERVER_URL || "";

function startServer() {
  const serverPath = path.join(__dirname, "..", "server", "index.js");
  serverProc = spawn(process.execPath, [serverPath], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PORT: "8787" },
    stdio: "inherit",
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    backgroundColor: "#F5F4EF",
    webPreferences: { contextIsolation: true },
  });
  win.loadURL(remote || "http://127.0.0.1:8787");
}

app.whenReady().then(() => {
  if (!remote) startServer();
  setTimeout(createWindow, remote ? 200 : 700);
});

app.on("window-all-closed", () => {
  if (serverProc) serverProc.kill();
  app.quit();
});
