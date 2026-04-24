import { useState } from 'react'
import { saveAgent, deleteAgent, createNewAgent } from '../services/agentService'

export default function AgentForm ({ agent, onSaved, onCancel }) {
  const isEdit = !!agent

  const [form, setForm] = useState(() =>
    agent ? { ...agent } : createNewAgent()
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set (field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit () {
    if (!form.name.trim())            return setError('Le nom est requis.')
    if (!form.repoUrl.trim())         return setError('L\'URL du dépôt est requise.')
    if (!form.julesToken.trim())      return setError('Le token Jules est requis.')
    if (!form.taskDescription.trim()) return setError('La description de la tâche est requise.')

    setSaving(true)
    setError('')
    const res = await saveAgent(form)
    setSaving(false)
    if (res.success) {
      onSaved()
    } else {
      setError(res.error || 'Erreur lors de la sauvegarde.')
    }
  }

  async function handleDelete () {
    if (!confirm(`Supprimer l'agent "${form.name}" ?`)) return
    await deleteAgent(form.id)
    onSaved()
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
            {isEdit ? 'Modifier l\'agent' : 'Nouvel agent'}
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            La config sera sauvegardée en JSON sur le disque
          </p>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '8px 14px',
            color: 'var(--text2)', fontSize: 13, cursor: 'pointer',
          }}
        >
          ← Retour
        </button>
      </header>

      {/* Form */}
      <div style={{ flex: 1, overflow: 'auto', padding: '28px', maxWidth: 680 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <Field label="Nom de l'agent *">
            <input
              type="text"
              placeholder="ex: Bug Fixer — API Backend"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="URL du dépôt GitHub *">
              <input
                type="text"
                placeholder="https://github.com/user/repo"
                value={form.repoUrl}
                onChange={e => set('repoUrl', e.target.value)}
              />
            </Field>
            <Field label="Branche cible">
              <input
                type="text"
                placeholder="main"
                value={form.branch}
                onChange={e => set('branch', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Token Jules API *">
            <input
              type="password"
              placeholder="Votre token d'authentification Jules"
              value={form.julesToken}
              onChange={e => set('julesToken', e.target.value)}
            />
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              Récupérez votre token sur jules.google.com → Paramètres → API
            </p>
          </Field>

          <Field label="Description de la tâche *">
            <textarea
              rows={5}
              placeholder="Décrivez en langage naturel ce que l'agent doit faire...&#10;ex: Corrige tous les bugs liés aux race conditions dans le module auth, ajoute les tests unitaires correspondants et ouvre une PR."
              value={form.taskDescription}
              onChange={e => set('taskDescription', e.target.value)}
              style={{ resize: 'vertical', lineHeight: 1.6 }}
            />
          </Field>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.3)',
              borderRadius: 'var(--radius)',
              color: 'var(--red)',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Boutons */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                padding: '10px 24px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius)',
                fontWeight: 700,
                fontSize: 14,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Sauvegarde...' : (isEdit ? '✓ Mettre à jour' : '✓ Créer l\'agent')}
            </button>

            <button
              onClick={onCancel}
              style={{
                padding: '10px 20px',
                background: 'var(--surface)',
                color: 'var(--text2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>

            {isEdit && (
              <button
                onClick={handleDelete}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(244,63,94,0.1)',
                  color: 'var(--red)',
                  border: '1px solid rgba(244,63,94,0.3)',
                  borderRadius: 'var(--radius)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                🗑 Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field ({ label, children }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  )
}
