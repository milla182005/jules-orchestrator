import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import AgentForm from './components/AgentForm'
import LogPanel from './components/LogPanel'
import { fetchAgents } from './services/agentService'

export default function App () {
  const [view, setView] = useState('dashboard')   // 'dashboard' | 'new' | 'edit' | 'logs'
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAgents = useCallback(async () => {
    setLoading(true)
    const list = await fetchAgents()
    setAgents(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadAgents()

    // Écoute les mises à jour en temps réel depuis le main process
    const unsub = window.electronAPI.onAgentUpdate((update) => {
      setAgents(prev => prev.map(a =>
        a.id === update.id ? { ...a, ...update } : a
      ))
    })
    return unsub
  }, [loadAgents])

  function handleNewAgent () {
    setSelectedAgent(null)
    setView('new')
  }

  function handleEditAgent (agent) {
    setSelectedAgent(agent)
    setView('edit')
  }

  function handleViewLogs (agent) {
    setSelectedAgent(agent)
    setView('logs')
  }

  function handleSaved () {
    loadAgents()
    setView('dashboard')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        activeView={view}
        onNavigate={setView}
        agentCount={agents.length}
        runningCount={agents.filter(a => a.status === 'running').length}
      />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {(view === 'dashboard') && (
          <Dashboard
            agents={agents}
            loading={loading}
            onNew={handleNewAgent}
            onEdit={handleEditAgent}
            onViewLogs={handleViewLogs}
            onRefresh={loadAgents}
          />
        )}
        {(view === 'new' || view === 'edit') && (
          <AgentForm
            agent={selectedAgent}
            onSaved={handleSaved}
            onCancel={() => setView('dashboard')}
          />
        )}
        {view === 'logs' && (
          <LogPanel
            agent={selectedAgent}
            onBack={() => setView('dashboard')}
          />
        )}
      </main>
    </div>
  )
}
