/**
 * LogsPanel.jsx
 * Exibe logs remotos usando os campos reais do banco:
 *   logs.recent[N] → { ts, dt, lvl, tag, msg }
 *   logs.last_errors[N]
 *   logs.count, logs.head
 */
import { useState } from 'react'

const LEVEL_STYLE = {
  DEBUG:    { bg: '#f0f4ec', color: '#4b6358' },
  INFO:     { bg: '#e0f2e9', color: '#1e6f3f' },
  WARN:     { bg: '#fff3cd', color: '#856404' },
  ERROR:    { bg: '#ffe6e5', color: '#c2412c' },
  CRITICAL: { bg: '#fce7e6', color: '#991b1b' },
}

function LogRow({ entry }) {
  const lvl   = entry?.lvl ?? 'INFO'
  const style = LEVEL_STYLE[lvl] ?? LEVEL_STYLE.INFO
  const time  = entry?.dt
    ? entry.dt.replace('T', ' ').replace('Z', '')
    : entry?.ts > 1000000
      ? new Date(entry.ts * 1000).toLocaleString('pt-BR')
      : `+${entry?.ts ?? 0}s`

  return (
    <div className="log-row" style={{ borderLeft: `3px solid ${style.color}` }}>
      <span className="log-time">{time}</span>
      <span className="log-tag">{entry?.tag ?? ''}</span>
      <span className="log-lvl" style={{ background: style.bg, color: style.color }}>{lvl}</span>
      <span className="log-msg">{entry?.msg ?? ''}</span>
    </div>
  )
}

export default function LogsPanel({ logs = {} }) {
  const [tab, setTab] = useState('recent')
  const recent      = [...(logs.recent      ?? [])].reverse()
  const last_errors = [...(logs.last_errors ?? [])].reverse()
  const entries     = tab === 'errors' ? last_errors : recent

  return (
    <div className="card logs-panel">
      <div className="row-between" style={{ marginBottom: '0.75rem' }}>
        <h3>Logs Remotos</h3>
        <span style={{ fontSize: '0.8rem', color: '#5f7c6b' }}>
          {logs.count ?? 0} entradas registradas
        </span>
      </div>

      <div className="log-tabs">
        <button
          className={tab === 'recent' ? 'log-tab-active' : ''}
          onClick={() => setTab('recent')}
        >
          Recentes ({recent.length})
        </button>
        <button
          className={tab === 'errors' ? 'log-tab-active' : ''}
          onClick={() => setTab('errors')}
          style={last_errors.length > 0 ? { color: '#c2412c' } : {}}
        >
          ⚠ Erros ({last_errors.length})
        </button>
      </div>

      <div className="log-list">
        {entries.length === 0 ? (
          <p style={{ color: '#5f7c6b', padding: '0.75rem 0', fontSize: '0.9rem' }}>
            Nenhum log disponível.
          </p>
        ) : (
          entries.map((e, i) => <LogRow key={i} entry={e} />)
        )}
      </div>
    </div>
  )
}
