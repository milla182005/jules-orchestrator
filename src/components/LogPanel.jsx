import { useState, useEffect, useRef } from 'react'
import { fetchLogs, fetchAllLogs } from '../services/agentService'

export default function LogPanel ({ agent, onBack }) {
  const [lines, setLines]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [autoScroll, setAuto]   = useState(true)
  const bottomRef               = useRef(null)
  const intervalRef             = useRef(null)

  const isGlobal = !agent

  async function load () {
    const data = isGlobal
      ? await fetchAllLogs()
      : await fetchLogs(agent.id)
    if (isGlobal) {
      setLines(data.map(({ agentId, line }) => ({ agentId, text: line })))
    } else {
      setLines(data.map(text => ({ agentId: agent.id, text })))
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Polling toutes les 2s
    intervalRef.current = setInterval(load, 2000)
    return () => clearInterval(intervalRef.current)
  }, [agent?.id])

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines, autoScroll])

  function levelColor (line) {
    if (line.includes('[ERROR]')) return 'var(--red)'
    if (line.includes('[WARN]'))  return 'var(--yellow)'
    if (line.includes('[INFO]'))  return 'var(--text2)'
    return 'var(--text3)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {isGlobal ? 'Logs globaux' : `Logs — ${agent.name}`}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            Actualisé toutes les 2 secondes · {lines.length} ligne{lines.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            fontSize: 12, color: 'var(--text2)', textTransform: 'none', letterSpacing: 0, fontWeight: 400,
          }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={e => setAuto(e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            Auto-scroll
          </label>
          <button
            onClick={onBack}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '8px 14px',
              color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
            }}
          >
            ← Retour
          </button>
        </div>
      </header>

      {/* Log output */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--bg)',
        padding: '16px 24px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        lineHeight: 1.7,
      }}>
        {loading ? (
          <span style={{ color: 'var(--text3)' }}>Chargement...</span>
        ) : lines.length === 0 ? (
          <span style={{ color: 'var(--text3)' }}>Aucun log pour le moment.</span>
        ) : (
          lines.map((item, i) => (
            <div key={i} style={{
              color: levelColor(item.text),
              borderBottom: '1px solid rgba(42,45,62,0.4)',
              padding: '2px 0',
              wordBreak: 'break-all',
            }}>
              {isGlobal && (
                <span style={{
                  color: 'var(--accent)', marginRight: 8, fontSize: 10,
                  background: 'rgba(79,142,247,0.1)', padding: '1px 6px', borderRadius: 4,
                }}>
                  {item.agentId.slice(0, 8)}
                </span>
              )}
              {item.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
