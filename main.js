const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const AGENTS_DIR = path.join(__dirname, 'agents')
const LOGS_DIR   = path.join(__dirname, 'logs')

;[AGENTS_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

let mainWindow
let tray = null

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  const isDev = !fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide() }
  })
}

function createTray () {
  tray = new Tray(nativeImage.createEmpty())
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Ouvrir Jules Orchestrator', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Quitter', click: () => { app.isQuitting = true; app.quit() } },
  ])
  tray.setToolTip('Jules Orchestrator')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow.show())
}

app.whenReady().then(() => { createWindow(); createTray() })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

function writeLog (agentId, message, level = 'INFO') {
  const logFile = path.join(LOGS_DIR, `${agentId}.log`)
  const line = `[${new Date().toISOString()}] [${level}] ${message}\n`
  fs.appendFileSync(logFile, line, 'utf8')
}

function notify (title, body) {
  if (Notification.isSupported()) new Notification({ title, body }).show()
}

ipcMain.handle('agents:list', async () => {
  try {
    const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.json'))
    return files.map(file => JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8')))
  } catch { return [] }
})

ipcMain.handle('agents:save', async (_event, agent) => {
  try {
    fs.writeFileSync(path.join(AGENTS_DIR, `${agent.id}.json`), JSON.stringify(agent, null, 2), 'utf8')
    writeLog(agent.id, `Configuration sauvegardée : ${agent.name}`)
    return { success: true }
  } catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('agents:delete', async (_event, agentId) => {
  try {
    const fp = path.join(AGENTS_DIR, `${agentId}.json`)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
    return { success: true }
  } catch (err) { return { success: false, error: err.message } }
})

ipcMain.handle('logs:read', async (_event, agentId) => {
  try {
    const logFile = path.join(LOGS_DIR, `${agentId}.log`)
    if (!fs.existsSync(logFile)) return []
    return fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).slice(-200)
  } catch { return [] }
})

ipcMain.handle('logs:readAll', async () => {
  try {
    const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.log'))
    const allLogs = []
    files.forEach(file => {
      const agentId = file.replace('.log', '')
      fs.readFileSync(path.join(LOGS_DIR, file), 'utf8').trim().split('\n').filter(Boolean)
        .forEach(line => allLogs.push({ agentId, line }))
    })
    return allLogs.slice(-500)
  } catch { return [] }
})

const activeAgents = new Map()

ipcMain.handle('agent:start', async (_event, agent) => {
  try {
    writeLog(agent.id, `Démarrage de l'agent "${agent.name}" sur ${agent.repoUrl}`)

    const mockTaskId = 'task-' + Date.now()
    const repoName = agent.repoUrl.replace('https://github.com/', '').replace('.git', '')

    // Mock Python 60s comme préconisé dans le sujet du projet
    const mockScript = `import time, sys
print("Jules Agent demarre - Task ID: ${mockTaskId}", flush=True)
print("Analyse du repo: ${repoName}", flush=True)
print("Lecture du code source...", flush=True)
time.sleep(20)
print("Identification des problemes...", flush=True)
time.sleep(20)
print("Application des corrections...", flush=True)
time.sleep(20)
print("Pull Request creee: https://github.com/${repoName}/pull/1", flush=True)
print("DONE", flush=True)
`
    const scriptPath = path.join(LOGS_DIR, `mock_${agent.id}.py`)
    fs.writeFileSync(scriptPath, mockScript, 'utf8')

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
    const child = spawn(pythonCmd, [scriptPath], { stdio: ['ignore', 'pipe', 'pipe'] })
    activeAgents.set(agent.id, { process: child, startedAt: new Date().toISOString(), taskId: mockTaskId })

    // Statut → running immédiatement
    const filePath = path.join(AGENTS_DIR, `${agent.id}.json`)
    if (fs.existsSync(filePath)) {
      const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      saved.lastTaskId = mockTaskId
      saved.lastStartedAt = new Date().toISOString()
      saved.status = 'running'
      fs.writeFileSync(filePath, JSON.stringify(saved, null, 2), 'utf8')
    }
    mainWindow?.webContents.send('agent:update', { id: agent.id, status: 'running', taskId: mockTaskId })
    notify('Jules Orchestrator', `▶ Agent "${agent.name}" démarré !`)
    writeLog(agent.id, `Task ID: ${mockTaskId} — Simulation en cours (60s)...`)

    child.stdout.on('data', (d) => {
      const line = d.toString().trim()
      writeLog(agent.id, line)
      mainWindow?.webContents.send('agent:log', { id: agent.id, line })
    })
    child.stderr.on('data', (d) => writeLog(agent.id, d.toString().trim(), 'ERROR'))

    child.on('close', (code) => {
      const status = code === 0 ? 'done' : 'error'
      writeLog(agent.id, `Agent terminé → statut: ${status}`)
      if (fs.existsSync(filePath)) {
        const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        saved.status = status
        saved.lastFinishedAt = new Date().toISOString()
        fs.writeFileSync(filePath, JSON.stringify(saved, null, 2), 'utf8')
      }
      mainWindow?.webContents.send('agent:update', { id: agent.id, status })
      if (status === 'done') notify('Jules Orchestrator', `✅ Agent "${agent.name}" terminé ! PR créée.`)
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath)
      activeAgents.delete(agent.id)
    })

    return { success: true, message: `Agent démarré (simulation 60s) — Task ID: ${mockTaskId}` }
  } catch (err) {
    writeLog(agent.id, `Exception: ${err.message}`, 'ERROR')
    return { success: false, error: err.message }
  }
})

ipcMain.handle('agent:stop', async (_event, agentId) => {
  const entry = activeAgents.get(agentId)
  if (entry) {
    entry.process.kill()
    activeAgents.delete(agentId)
    writeLog(agentId, 'Agent arrêté manuellement', 'WARN')
    notify('Jules Orchestrator', '⛔ Agent arrêté.')
    const filePath = path.join(AGENTS_DIR, `${agentId}.json`)
    if (fs.existsSync(filePath)) {
      const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      saved.status = 'idle'
      fs.writeFileSync(filePath, JSON.stringify(saved, null, 2), 'utf8')
    }
    mainWindow?.webContents.send('agent:update', { id: agentId, status: 'idle' })
    return { success: true }
  }
  return { success: false, error: 'Agent non trouvé ou déjà arrêté' }
})

ipcMain.handle('agent:status', async (_event, { agentId, taskId }) => {
  const entry = activeAgents.get(agentId)
  if (entry) return { success: true, data: { status: 'running', taskId, startedAt: entry.startedAt } }
  return { success: true, data: { status: 'idle', taskId } }
})

ipcMain.handle('app:getVersion', () => app.getVersion())
ipcMain.handle('app:getPaths', () => ({ agents: AGENTS_DIR, logs: LOGS_DIR }))