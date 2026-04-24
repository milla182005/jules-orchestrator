import { useState } from 'react'
import { startAgent, stopAgent, checkAgentStatus } from '../services/agentService'

const STATUS_BADGE = {
  idle:    { cls: 'badge badge-idle',    label: 'En attente' },
  running: { cls: 'badge badge-running', label: 'En cours' },
  done:    { cls: 'badge badge-done',    label: 'Terminé' },
  error:   { cls: 'badge badge-error',   label: 'Erreur' },
}

export default function AgentCard ({ agent, onEdit, onViewLogs, onRefresh }) {
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState('')

  const badge = STATUS_BADGE[agent.status] ?? STATUS_BADGE.idle

  async function handleStart () {
    setBusy(true)
    setMsg('Démarrage...')
    const res = await startAgent(agent)
    setMsg(res.success ? res.message : `Erreur : ${res.error}`)
    setBusy(false)
    onRefresh()
  }

  async function handleStop () {
    setBusy(true)
    setMsg('Arrêt...')
    await stopAgent(agent.id)
    setMsg('Agent arrêté.')
    setBusy(false)
    onRefresh()
  }

  async function handleCheckStatus () {
    if (!agent.lastTaskId) return setMsg('Aucune tâche connue.')
    setBusy(true)
    setMsg('Vérification...')
    const res = await checkAgentStatus(agent.id, agent.lastTaskId, agent.julesToken)
    if (res.success) {
      setMsg(`Statut API : ${JSON.stringify(res.data?.status ?? res.data)}`)
    } else {
      setMsg(`Erreur : ${res.error}`)
    }
    setBusy(false)
  }

  const isRunning = agent.status === 'running'

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${isRunning ? 'rgba(79,142,247,0.3)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'border-color 0.2s',
      boxShadow: isRunning ? '0 0 20px rgba(79,142,247,0.06)' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {agent.name || 'Agent sans nom'}
          </div>
          <div style={{
            fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 3,
          }}>
            {agent.repoUrl || '—'}
          </div>
        </div>
        <span className={badge.cls} style={{ marginLeft: 8, flexShrink: 0 }}>
          <span className="dot" />
          {badge.label}
        </span>
      </div>

      {/* Description tâche */}
      <div style={{
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '10px 12px',
        fontSize: 12,
        color: 'var(--text2)',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.6,
        minHeight: 48,
        maxHeight: 80,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
      }}>
        {agent.taskDescription || <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Aucune description</span>}
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
        <span>branch: <span style={{ color: 'var(--text2)' }}>{agent.branch || 'main'}</span></span>
        {agent.lastTaskId && (
          <span>task: <span style={{ color: 'var(--accent)', fontSize: 10 }}>{agent.lastTaskId.slice(0, 12)}…</span></span>
        )}
      </div>

      {/* Message feedback */}
      {msg && (
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: msg.startsWith('Erreur') ? 'var(--red)' : 'var(--green)',
          padding: '6px 10px',
          background: msg.startsWith('Erreur') ? 'rgba(244,63,94,0.08)' : 'rgba(34,211,165,0.08)',
          borderRadius: 'var(--radius)',
          border: `1px solid ${msg.startsWith('Erreur') ? 'rgba(244,63,94,0.2)' : 'rgba(34,211,165,0.2)'}`,
        }}>
          {msg}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!isRunning ? (
          <Btn variant="primary" onClick={handleStart} disabled={busy}>
            {busy ? '...' : '▶ Lancer'}
          </Btn>
        ) : (
          <Btn variant="danger" onClick={handleStop} disabled={busy}>
            {busy ? '...' : '⏹ Arrêter'}
          </Btn>
        )}
        <Btn variant="ghost" onClick={handleCheckStatus} disabled={busy || !agent.lastTaskId} title="Vérifier le statut via l'API Jules">
          ⟳ Statut
        </Btn>
        <Btn variant="ghost" onClick={onViewLogs}>≡ Logs</Btn>
        <Btn variant="ghost" onClick={onEdit} style={{ marginLeft: 'auto' }}>✎ Éditer</Btn>
      </div>
    </div>
  )
}

function Btn ({ children, variant = 'ghost', onClick, disabled, title, style: extraStyle }) {
  const styles = {
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
    danger:  { background: 'rgba(244,63,94,0.15)', color: 'var(--red)', border: '1px solid rgba(244,63,94,0.3)' },
    ghost:   { background: 'var(--bg)', color: 'var(--text2)', border: '1px solid var(--border)' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius)',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...styles[variant],
        ...extraStyle,
      }}
    >
      {children}
    </button>
  )
}
