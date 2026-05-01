/**
 * LogsPanel.jsx — Djamor redesign.
 */
import { useState } from 'react'
import { ScrollText, AlertTriangle } from 'lucide-react'

function LogRow({ entry }) {
  const lvl = entry?.lvl ?? 'INFO'
  const time = entry?.dt
    ? entry.dt.replace('T', ' ').replace('Z', '')
    : entry?.ts > 1000000
      ? new Date(entry.ts * 1000).toLocaleString('pt-BR')
      : `+${entry?.ts ?? 0}s`

  return (
    <div className={`log-row lvl-${lvl}`}>
      <span className="log-time">{time}</span>
      <span className="log-tag">{entry?.tag ?? ''}</span>
      <span className={`log-lvl ${lvl}`}>{lvl}</span>
      <span className="log-msg">{entry?.msg ?? ''}</span>
    </div>
  )
}

function toEntryArray(node) {
  if (!node) return []
  // RTDB stores logs.recent / logs.last_errors as either an array (sparse) or
  // an object keyed by ring-buffer index ({ "11": {...}, "12": {...} }).
  // Normalize both shapes to a plain array, sorted by their numeric key when
  // available so newer entries (higher index) come last.
  if (Array.isArray(node)) {
    return node.filter((e) => e && typeof e === 'object')
  }
  if (typeof node === 'object') {
    return Object.entries(node)
      .filter(([, v]) => v && typeof v === 'object')
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, v]) => v)
  }
  return []
}

export default function LogsPanel({ logs = {} }) {
  const [tab, setTab] = useState('recent')
  const recent      = toEntryArray(logs?.recent).slice().reverse()
  const last_errors = toEntryArray(logs?.last_errors).slice().reverse()
  const entries     = tab === 'errors' ? last_errors : recent

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <span className="header-icon">
            <ScrollText size={16} />
          </span>
          Logs Remotos
        </h3>
        <span className="status neutral">
          {logs.count ?? 0} entradas
        </span>
      </div>

      <div className="log-tabs">
        <button
          className={tab === 'recent' ? 'active' : ''}
          onClick={() => setTab('recent')}
        >
          Recentes ({recent.length})
        </button>
        <button
          className={tab === 'errors' ? 'active' : ''}
          onClick={() => setTab('errors')}
        >
          <AlertTriangle size={12} /> Erros ({last_errors.length})
        </button>
      </div>

      <div className="log-list">
        {entries.length === 0 ? (
          <p className="hint-text" style={{ padding: '0.75rem 0' }}>
            Nenhum log disponível.
          </p>
        ) : (
          entries.map((e, i) => <LogRow key={i} entry={e} />)
        )}
      </div>
    </div>
  )
}
