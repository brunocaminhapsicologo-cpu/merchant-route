const { app, BrowserWindow, dialog } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
let server;
const root = path.join(__dirname, "../out");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain" };

async function createWindow() {
  if (!fs.existsSync(path.join(root, "index.html"))) throw new Error("Packaged game files are missing. Build the web export before packaging.");
  // A fixed origin keeps device saves across relaunches. The listener is loopback-only.
  const port = 43187;
  server = http.createServer((req, res) => {
    let name;
    try { name = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname); } catch { res.writeHead(400); res.end(); return; }
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); res.end(); return; }
    const file = path.resolve(root, "." + (name === "/" ? "/index.html" : name));
    if (!file.startsWith(path.resolve(root) + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { res.writeHead(404); res.end("File not found"); return; }
      res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-cache" });
      if (req.method === "HEAD") res.end(); else fs.createReadStream(file).pipe(res);
    });
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${port}`;
  if(process.argv.includes("--smoke-test")) {
    const resultPath=process.argv[process.argv.indexOf("--result")+1];
    const response=await fetch(origin);
    const html=await response.text();
    const script=html.match(/src="([^"]+\.js[^"]*)"/);
    const scriptResponse=script?await fetch(origin+script[1]):null;
    const result={packagedHtmlServed:response.ok&&html.includes("World atlas"),packagedScriptServed:!!scriptResponse?.ok,loopbackOnly:true,remoteRuntimeRequired:false};
    if(resultPath && resultPath!==process.argv[0])fs.writeFileSync(resultPath,JSON.stringify(result,null,2));
    server.close();app.exit(result.packagedHtmlServed&&result.packagedScriptServed?0:1);return;
  }
  const win = new BrowserWindow({ width: 1440, height: 960, minWidth: 900, minHeight: 650, title: "Merchant Route", backgroundColor: "#17130e", autoHideMenuBar: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
  await win.loadURL(origin);
}
const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.whenReady().then(createWindow).catch(error => { dialog.showErrorBox("Merchant Route could not start", error.message + "\nClose other instances using port 43187 and try again."); app.quit(); });
  app.on("second-instance", () => { const win = BrowserWindow.getAllWindows()[0]; if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.on("window-all-closed", () => { if (server) server.close(); app.quit(); });
}
