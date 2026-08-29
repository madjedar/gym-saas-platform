const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require("electron");
const path = require("path");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow;

function getAppUrl() {
  if (isDev) {
    return "http://localhost:3000";
  }
  return process.env.APP_URL || "http://localhost:3000";
}

function getErrorPageHtml(targetUrl) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>GymOS - Connexion au Serveur</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 24px;
      padding: 40px;
      max-width: 480px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .logo-container {
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .logo-container img {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      object-fit: cover;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #10b981;
    }
    h1 span {
      color: #ffffff;
    }
    p {
      color: #a1a1aa;
      font-size: 13px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .badge {
      display: inline-block;
      background: #27272a;
      color: #e4e4e7;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-family: monospace;
      margin-bottom: 24px;
    }
    button {
      background: #10b981;
      color: #09090b;
      font-weight: 700;
      border: none;
      padding: 12px 24px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 13px;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 0.9;
    }
    .spinner {
      margin-top: 16px;
      font-size: 11px;
      color: #71717a;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-container">
      <img src="file://${path.join(__dirname, "../public/icon.png").replace(/\\/g, "/")}" alt="GymOS" onerror="this.style.display='none'">
    </div>
    <h1>GYM<span>OS</span></h1>
    <p>Impossible de se connecter au serveur GymOS. Assurez-vous que le serveur est démarré ou vérifiez votre connexion réseau.</p>
    <div class="badge">Cible: ${targetUrl}</div>
    <br>
    <button onclick="window.location.reload()">Réessayer la connexion</button>
    <div class="spinner" id="timer">Nouvelle tentative automatique dans <span id="sec">5</span>s...</div>
  </div>
  <script>
    let timeLeft = 5;
    const secSpan = document.getElementById("sec");
    setInterval(() => {
      timeLeft--;
      if (secSpan) secSpan.innerText = timeLeft;
      if (timeLeft <= 0) {
        window.location.reload();
      }
    }, 1000);
  </script>
</body>
</html>`;
}

function createWindow() {
  const iconPath = path.join(__dirname, "../public/icon.png");

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: "GymOS - Enterprise Gym Management",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    backgroundColor: "#09090b",
    show: true,
  });

  const appUrl = getAppUrl();

  // Load target URL
  mainWindow.loadURL(appUrl);

  // Catch connection failures and show a sleek fallback instead of a blank screen
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    // Ignore aborts (e.g. user navigation)
    if (errorCode === -3) return;
    
    console.log(`[Electron] Failed to load ${appUrl}: ${errorDescription} (${errorCode})`);
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getErrorPageHtml(appUrl))}`);
  });

  // Optional: Remove default menu bar for clean app feel
  Menu.setApplicationMenu(null);

  // Open DevTools in dev mode if needed
  if (isDev && process.env.OPEN_DEVTOOLS === "true") {
    mainWindow.webContents.openDevTools();
  }

  // Handle Window Close
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC Handlers for React Frontend
ipcMain.handle("app:toggle-fullscreen", () => {
  if (mainWindow) {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    return !isFullScreen;
  }
  return false;
});

ipcMain.handle("app:get-info", () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    isDesktop: true,
  };
});

app.whenReady().then(() => {
  createWindow();

  // Register F11 shortcut for Kiosk / Fullscreen mode
  globalShortcut.register("F11", () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

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

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
