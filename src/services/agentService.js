/**
 * agentService.js
 * Couche service : abstraction des appels IPC vers le main process.
 * Aucune logique UI ici — respecte le pattern MVC (ce fichier = Modèle/Service).
 */

const api = window.electronAPI

// ── CRUD Agents ───────────────────────────────────────────────────────────────

export async function fetchAgents () {
  return api.listAgents()
}

export async function saveAgent (agent) {
  return api.saveAgent(agent)
}

export async function deleteAgent (id) {
  return api.deleteAgent(id)
}

// ── Contrôle ──────────────────────────────────────────────────────────────────

export async function startAgent (agent) {
  return api.startAgent(agent)
}

export async function stopAgent (agentId) {
  return api.stopAgent(agentId)
}

export async function checkAgentStatus (agentId, taskId, julesToken) {
  return api.checkStatus({ agentId, taskId, julesToken })
}

// ── Logs ──────────────────────────────────────────────────────────────────────

export async function fetchLogs (agentId) {
  return api.readLogs(agentId)
}

export async function fetchAllLogs () {
  return api.readAllLogs()
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function createNewAgent (overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: '',
    repoUrl: '',
    branch: 'main',
    taskDescription: '',
    julesToken: '',
    status: 'idle',
    lastTaskId: null,
    lastStartedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export function statusLabel (status) {
  const map = { idle: 'En attente', running: 'En cours', done: 'Terminé', error: 'Erreur' }
  return map[status] ?? status
}
