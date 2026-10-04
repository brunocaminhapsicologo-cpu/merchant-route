const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: "Merchant Route — Wasteland Caravan RPG",
    backgroundColor: "#14110e",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devUrl = process.env.ELECTRON_START_URL || "http://localhost:3000";
  const staticIndex = path.join(__dirname, "../out/index.html");

  if (process.env.ELECTRON_START_URL) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(staticIndex).catch(() => {
      win.loadURL(devUrl);
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
