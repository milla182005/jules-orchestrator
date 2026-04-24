import { useState } from 'react'
import AgentCard from './AgentCard'

export default function Dashboard ({ agents, loading, onNew, onEdit, onViewLogs, onRefresh }) {
  const [search, setSearch] = useState('')

  const filtered = agents.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.repoUrl?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexShrink: 0,
        background: 'var(--bg2)',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Tour de contrôle</h1>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''} configuré{agents.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200, fontSize: 12 }}
          />
          <IconBtn title="Rafraîchir" onClick={onRefresh}>↻</IconBtn>
          <PrimaryBtn onClick={onNew}>+ Nouvel agent</PrimaryBtn>
        </div>
      </header>

      {/* Grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {loading ? (
          <div style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={onNew} searching={!!search} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}>
            {filtered.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={() => onEdit(agent)}
                onViewLogs={() => onViewLogs(agent)}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState ({ onNew, searching }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: 340, gap: 16, color: 'var(--text3)',
    }}>
      <div style={{ fontSize: 48 }}>⬡</div>
      {searching ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>Aucun agent trouvé</p>
      ) : (
        <>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>Aucun agent configuré</p>
          <PrimaryBtn onClick={onNew}>+ Créer le premier agent</PrimaryBtn>
        </>
      )}
    </div>
  )
}

function PrimaryBtn ({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 18px',
        background: 'var(--accent)',
        color: '#fff',
        borderRadius: 'var(--radius)',
        fontWeight: 700,
        fontSize: 13,
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      {children}
    </button>
  )
}

function IconBtn ({ children, onClick, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 34, height: 34,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        color: 'var(--text2)',
        fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text2)'}
    >
      {children}
    </button>
  )
}
