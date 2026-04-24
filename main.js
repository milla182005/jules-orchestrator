const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

// ─── Chemins des dossiers de données ────────────────────────────────────────
const AGENTS_DIR = path.join(__dirname, 'agents')
const LOGS_DIR   = path.join(__dirname, 'logs')

;[AGENTS_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// ─── Fenêtre principale ──────────────────────────────────────────────────────
let mainWindow
let tray = null

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
  })

  // En dev, charge Vite ; en prod, le build statique
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())

  // Minimiser dans le tray plutôt que fermer
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

// ─── System Tray ────────────────────────────────────────────────────────────
function createTray () {
  // Icône simple en base64 (16x16 carré bleu) si pas d'asset
  const iconPath = path.join(__dirname, 'assets', 'tray.png')
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()

  tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Ouvrir Jules Orchestrator', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quitter', click: () => { app.isQuitting = true; app.quit() } },
  ])
  tray.setToolTip('Jules Orchestrator')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow.show())
}

// ─── App lifecycle ───────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function writeLog (agentId, message, level = 'INFO') {
  const logFile = path.join(LOGS_DIR, `${agentId}.log`)
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`
  fs.appendFileSync(logFile, line, 'utf8')
}

function notify (title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  }
}

// ─── IPC : Gestion des configurations d'agents (fichiers JSON) ───────────────

// Lire toutes les configs agents
ipcMain.handle('agents:list', async () => {
  try {
    const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.json'))
    return files.map(file => {
      const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')
      return JSON.parse(content)
    })
  } catch (err) {
    return []
  }
})

// Sauvegarder une config agent
ipcMain.handle('agents:save', async (_event, agent) => {
  try {
    const filePath = path.join(AGENTS_DIR, `${agent.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(agent, null, 2), 'utf8')
    writeLog(agent.id, `Configuration sauvegardée : ${agent.name}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Supprimer une config agent
ipcMain.handle('agents:delete', async (_event, agentId) => {
  try {
    const filePath = path.join(AGENTS_DIR, `${agentId}.json`)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ─── IPC : Logs ──────────────────────────────────────────────────────────────
ipcMain.handle('logs:read', async (_event, agentId) => {
  try {
    const logFile = path.join(LOGS_DIR, `${agentId}.log`)
    if (!fs.existsSync(logFile)) return []
    const content = fs.readFileSync(logFile, 'utf8')
    return content.trim().split('\n').filter(Boolean).slice(-200) // 200 dernières lignes
  } catch {
    return []
  }
})

ipcMain.handle('logs:readAll', async () => {
  try {
    const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.log'))
    const allLogs = []
    files.forEach(file => {
      const agentId = file.replace('.log', '')
      const content = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8')
      content.trim().split('\n').filter(Boolean).forEach(line => {
        allLogs.push({ agentId, line })
      })
    })
    return allLogs.slice(-500)
  } catch {
    return []
  }
})

// ─── IPC : Lancer un agent Jules via l'API ───────────────────────────────────
// Map des processus actifs : agentId → { process, taskId }
const activeAgents = new Map()

ipcMain.handle('agent:start', async (_event, agent) => {
  try {
    writeLog(agent.id, `Démarrage de l'agent "${agent.name}" sur ${agent.repoUrl}`)

    // ── Appel réel à l'API Jules ──
    // On utilise un script Node inline via child_process pour ne pas bloquer le main process
    const scriptCode = `
const https = require('https');
const payload = JSON.stringify({
  repo_url: ${JSON.stringify(agent.repoUrl)},
  description: ${JSON.stringify(agent.taskDescription)},
  branch: ${JSON.stringify(agent.branch || 'main')}
});
const options = {
  hostname: 'jules.google.com',
  path: '/api/v1/tasks',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${agent.julesToken}',
    'Content-Length': Buffer.byteLength(payload)
  }
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      process.stdout.write(JSON.stringify({ success: true, taskId: parsed.task_id || parsed.id, raw: parsed }));
    } catch(e) {
      process.stdout.write(JSON.stringify({ success: false, error: 'Parse error: ' + data }));
    }
    process.exit(0);
  });
});
req.on('error', (e) => {
  process.stdout.write(JSON.stringify({ success: false, error: e.message }));
  process.exit(1);
});
req.write(payload);
req.end();
`
    const child = spawn(process.execPath, ['-e', scriptCode], { stdio: ['ignore', 'pipe', 'pipe'] })
    activeAgents.set(agent.id, { process: child, startedAt: new Date().toISOString() })

    let stdout = ''
    child.stdout.on('data', d => { stdout += d.toString() })
    child.stderr.on('data', d => writeLog(agent.id, d.toString().trim(), 'ERROR'))

    child.on('close', (code) => {
      try {
        const result = JSON.parse(stdout)
        if (result.success) {
          writeLog(agent.id, `Tâche créée avec succès. Task ID: ${result.taskId}`)
          notify('Jules Orchestrator', `✅ Agent "${agent.name}" démarré ! Task ID: ${result.taskId}`)
          // Mettre à jour le fichier agent avec le taskId
          const filePath = path.join(AGENTS_DIR, `${agent.id}.json`)
          if (fs.existsSync(filePath)) {
            const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'))
            saved.lastTaskId = result.taskId
            saved.lastStartedAt = new Date().toISOString()
            saved.status = 'running'
            fs.writeFileSync(filePath, JSON.stringify(saved, null, 2), 'utf8')
          }
          mainWindow?.webContents.send('agent:update', { id: agent.id, status: 'running', taskId: result.taskId })
        } else {
          writeLog(agent.id, `Erreur API: ${result.error}`, 'ERROR')
          mainWindow?.webContents.send('agent:update', { id: agent.id, status: 'error', error: result.error })
        }
      } catch (e) {
        writeLog(agent.id, `Réponse inattendue: ${stdout}`, 'WARN')
        mainWindow?.webContents.send('agent:update', { id: agent.id, status: 'error', error: 'Réponse inattendue' })
      }
      activeAgents.delete(agent.id)
    })

    return { success: true, message: 'Agent démarré, en attente de réponse API...' }
  } catch (err) {
    writeLog(agent.id, `Exception: ${err.message}`, 'ERROR')
    return { success: false, error: err.message }
  }
})

// ─── IPC : Arrêter un agent ───────────────────────────────────────────────────
ipcMain.handle('agent:stop', async (_event, agentId) => {
  const entry = activeAgents.get(agentId)
  if (entry) {
    entry.process.kill()
    activeAgents.delete(agentId)
    writeLog(agentId, 'Agent arrêté manuellement', 'WARN')
    notify('Jules Orchestrator', '⛔ Agent arrêté.')
    return { success: true }
  }
  return { success: false, error: 'Agent non trouvé ou déjà arrêté' }
})

// ─── IPC : Vérifier le statut d'une tâche Jules ──────────────────────────────
ipcMain.handle('agent:status', async (_event, { agentId, taskId, julesToken }) => {
  try {
    const scriptCode = `
const https = require('https');
const options = {
  hostname: 'jules.google.com',
  path: '/api/v1/tasks/${taskId || ''}',
  method: 'GET',
  headers: { 'Authorization': 'Bearer ${julesToken}' }
};
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try { process.stdout.write(JSON.stringify({ success: true, data: JSON.parse(data) })); }
    catch(e) { process.stdout.write(JSON.stringify({ success: false, error: data })); }
    process.exit(0);
  });
});
req.on('error', e => { process.stdout.write(JSON.stringify({ success: false, error: e.message })); process.exit(1); });
req.end();
`
    return await new Promise((resolve) => {
      const child = spawn(process.execPath, ['-e', scriptCode], { stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''
      child.stdout.on('data', d => { stdout += d.toString() })
      child.on('close', () => {
        try { resolve(JSON.parse(stdout)) }
        catch { resolve({ success: false, error: 'Parse error' }) }
      })
    })
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ─── IPC : Divers ─────────────────────────────────────────────────────────────
ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getPaths', () => ({ agents: AGENTS_DIR, logs: LOGS_DIR }))
