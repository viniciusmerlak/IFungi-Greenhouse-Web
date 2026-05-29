import { useState, useEffect } from 'react'

interface AISuggestion {
  createdAt: number
  status: string
  rationale: unknown
  observations?: unknown[]
  suggested_setpoints?: Record<string, unknown>
  confidence: number
  risk_flags?: unknown[]
  thumbnails?: Record<string, string>
  captureMeta?: {
    note?: unknown
  }
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(formatValue).join(', ')
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function formatSetpoint(value: unknown, unit: string) {
  const formatted = formatValue(value)
  return formatted ? `${formatted}${unit}` : 'N/A'
}

export default function HistoryPage() {
  const [history, setHistory] = useState<AISuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<AISuggestion | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    setLoading(true)
    try {
      const data = await window.electronAPI.getHistory(30)
      setHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load history:', error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'pending':
        return 'status-pending'
      case 'approved':
        return 'status-approved'
      case 'rejected':
        return 'status-rejected'
      case 'error':
        return 'status-error'
      default:
        return 'status-pending'
    }
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString()
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>History</h1>
          <p>Loading analysis history...</p>
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>History</h1>
          <p>No analyses found. Capture your first greenhouse analysis!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>History</h1>
            <p>Browse past AI analyses and recommendations</p>
          </div>
          <button className="btn btn-secondary" onClick={loadHistory}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* History list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.map((item, index) => {
            const summary = formatValue(item.rationale)
            const thumbnailUrl = item.thumbnails
              ? Object.values(item.thumbnails).find((value): value is string => typeof value === 'string' && value.length > 0)
              : undefined

            return (
              <div
                key={index}
                className="card"
                style={{
                  cursor: 'pointer',
                  border: selectedItem === item ? '2px solid #0066cc' : '1px solid #e0e0e0'
                }}
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex-between mb-1">
                  <span className="text-small text-muted">{formatDate(item.createdAt)}</span>
                  <span className={`status-badge ${getStatusBadgeClass(formatValue(item.status))}`}>
                    {formatValue(item.status)}
                  </span>
                </div>

                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail"
                    style={{
                      width: '100%',
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}
                  />
                )}

                <p className="text-small" style={{ lineHeight: 1.4 }}>
                  {summary.slice(0, 120)}
                  {summary.length > 120 ? '...' : ''}
                </p>

                <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
                  <span className="text-small" style={{ background: '#e3f2fd', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    Confidence: {formatValue(item.confidence)}%
                  </span>
                  {Array.isArray(item.risk_flags) && item.risk_flags.length > 0 && (
                    <span className="text-small" style={{ background: '#fff3cd', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      {item.risk_flags.length} risk flag{item.risk_flags.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail view */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          {selectedItem ? (
            <div className="card">
              <h2 className="card-title">Analysis Details</h2>

              <div className="mb-2">
                <div className="text-small text-muted">Date</div>
                <div>{formatDate(selectedItem.createdAt)}</div>
              </div>

              <div className="mb-2">
                <div className="text-small text-muted">Status</div>
                <span className={`status-badge ${getStatusBadgeClass(formatValue(selectedItem.status))}`}>
                  {formatValue(selectedItem.status)}
                </span>
              </div>

              {selectedItem.thumbnails && (
                <div className="mb-2">
                  <div className="text-small text-muted mb-1">Images</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {Object.values(selectedItem.thumbnails)
                      .filter((value): value is string => typeof value === 'string' && value.length > 0)
                      .map((thumb, i) => (
                        <img
                          key={i}
                          src={thumb}
                          alt={`Thumbnail ${i + 1}`}
                          style={{ width: '150px', borderRadius: '4px' }}
                        />
                      ))}
                  </div>
                </div>
              )}

              {selectedItem.captureMeta?.note !== undefined && selectedItem.captureMeta?.note !== null && (
                <div className="mb-2">
                  <div className="text-small text-muted">Operator Note</div>
                  <div className="text-small">{formatValue(selectedItem.captureMeta.note)}</div>
                </div>
              )}

              <div className="mb-2">
                <div className="text-small text-muted">Rationale</div>
                <div className="text-small">{formatValue(selectedItem.rationale)}</div>
              </div>

              {Array.isArray(selectedItem.observations) && selectedItem.observations.length > 0 && (
                <div className="mb-2">
                  <div className="text-small text-muted">Observations</div>
                  <ul style={{ paddingLeft: '1.25rem', margin: '0.5rem 0' }}>
                    {selectedItem.observations.map((obs, i) => (
                      <li key={i} className="text-small">
                        {formatValue(obs)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-2">
                <div className="text-small text-muted">Confidence</div>
                <div>{formatValue(selectedItem.confidence * 100)}%</div>
              </div>

              {Array.isArray(selectedItem.risk_flags) && selectedItem.risk_flags.length > 0 && (
                <div className="mb-2">
                  <div className="text-small text-muted">Risk Flags</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedItem.risk_flags.map((flag, i) => (
                      <span
                        key={i}
                        className="text-small"
                        style={{ background: '#fff3cd', padding: '0.25rem 0.5rem', borderRadius: '4px' }}
                      >
                        {formatValue(flag)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-2">
                <div className="text-small text-muted mb-1">Suggested Setpoints</div>
                {selectedItem.suggested_setpoints ? (
                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                    <tbody>
                      <tr>
                        <td>Temp Min:</td>
                        <td>{formatSetpoint(selectedItem.suggested_setpoints.tMin, '°C')}</td>
                      </tr>
                      <tr>
                        <td>Temp Max:</td>
                        <td>{formatSetpoint(selectedItem.suggested_setpoints.tMax, '°C')}</td>
                      </tr>
                      <tr>
                        <td>Humidity Min:</td>
                        <td>{formatSetpoint(selectedItem.suggested_setpoints.uMin, '%')}</td>
                      </tr>
                      <tr>
                        <td>Humidity Max:</td>
                        <td>{formatSetpoint(selectedItem.suggested_setpoints.uMax, '%')}</td>
                      </tr>
                      <tr>
                        <td>CO:</td>
                        <td>{formatSetpoint(selectedItem.suggested_setpoints.coSp, ' ppm')}</td>
                      </tr>
                      <tr>
                        <td>CO₂:</td>
                        <td>{formatSetpoint(selectedItem.suggested_setpoints.co2Sp, ' ppm')}</td>
                      </tr>
                      <tr>
                        <td>TVOCs:</td>
                        <td>{formatSetpoint(selectedItem.suggested_setpoints.tvocsSp, ' ppb')}</td>
                      </tr>
                      <tr>
                        <td>Light:</td>
                        <td>{formatSetpoint(selectedItem.suggested_setpoints.lux, ' lux')}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="text-small text-muted">No suggested setpoints available.</div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <p className="text-muted text-center">Select an analysis to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
