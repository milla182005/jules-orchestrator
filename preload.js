const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Agents (fichiers JSON) ──────────────────────────────────────────────
  listAgents:   ()        => ipcRenderer.invoke('agents:list'),
  saveAgent:    (agent)   => ipcRenderer.invoke('agents:save', agent),
  deleteAgent:  (id)      => ipcRenderer.invoke('agents:delete', id),

  // ── Logs ────────────────────────────────────────────────────────────────
  readLogs:     (agentId) => ipcRenderer.invoke('logs:read', agentId),
  readAllLogs:  ()        => ipcRenderer.invoke('logs:readAll'),

  // ── Contrôle des agents Jules ───────────────────────────────────────────
  startAgent:   (agent)   => ipcRenderer.invoke('agent:start', agent),
  stopAgent:    (agentId) => ipcRenderer.invoke('agent:stop', agentId),
  checkStatus:  (params)  => ipcRenderer.invoke('agent:status', params),

  // ── Événements push depuis le main process ──────────────────────────────
  onAgentUpdate: (callback) => {
    ipcRenderer.on('agent:update', (_event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('agent:update')
  },

  // ── App ─────────────────────────────────────────────────────────────────
  getVersion:   () => ipcRenderer.invoke('app:getVersion'),
  getPaths:     () => ipcRenderer.invoke('app:getPaths'),
})
