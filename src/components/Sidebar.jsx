import { useState, useEffect } from 'react'

const NAV = [
  { id: 'dashboard', icon: '⬡', label: 'Dashboard' },
  { id: 'logs',      icon: '≡', label: 'Logs globaux' },
]

export default function Sidebar ({ activeView, onNavigate, agentCount, runningCount }) {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.electronAPI.getVersion().then(v => setVersion(v))
  }, [])

  return (
    <aside style={{
      width: 220,
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          lineHeight: 1,
        }}>
          <span style={{ color: 'var(--accent)' }}>Jules</span>
          <br />
          <span style={{ color: 'var(--text2)', fontWeight: 400, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Orchestrator
          </span>
        </div>
      </div>

      {/* Stats rapides */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        borderBottom: '1px solid var(--border)',
      }}>
        <StatBox label="Agents" value={agentCount} />
        <StatBox label="Actifs" value={runningCount} accent={runningCount > 0} />
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV.map(item => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeView === item.id || (activeView === 'edit' && item.id === 'dashboard') || (activeView === 'new' && item.id === 'dashboard')}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid var(--border)',
        color: 'var(--text3)',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
      }}>
        v{version}
      </div>
    </aside>
  )
}

function StatBox ({ label, value, accent }) {
  return (
    <div style={{
      padding: '12px 16px',
      textAlign: 'center',
      background: 'var(--bg2)',
    }}>
      <div style={{
        fontSize: 22,
        fontWeight: 800,
        color: accent ? 'var(--accent)' : 'var(--text)',
        lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
    </div>
  )
}

function NavItem ({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 12px',
        borderRadius: 'var(--radius)',
        background: active ? 'rgba(79,142,247,0.1)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text2)',
        fontSize: 13,
        fontWeight: active ? 700 : 400,
        fontFamily: 'var(--font-ui)',
        border: active ? '1px solid rgba(79,142,247,0.2)' : '1px solid transparent',
        textAlign: 'left',
        cursor: 'pointer',
        marginBottom: 2,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      {label}
    </button>
  )
}
