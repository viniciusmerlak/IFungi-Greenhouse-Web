import { useState } from 'react'

export default function SuggestionHistoryList({ suggestions }) {
  const [selectedItem, setSelectedItem] = useState(null)

  if (suggestions.length === 0) {
    return (
      <div className="card">
        <p className="text-muted text-center">Nenhuma sugestão no histórico.</p>
      </div>
    )
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case 'approved':
        return 'badge-success'
      case 'rejected':
        return 'badge-danger'
      case 'error':
        return 'badge-error'
      default:
        return 'badge-warning'
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'approved':
        return 'Aprovado'
      case 'rejected':
        return 'Rejeitado'
      case 'error':
        return 'Erro'
      default:
        return 'Pendente'
    }
  }

  return (
    <div className="history-grid">
      <div className="history-list">
        {suggestions.map((item) => (
          <div
            key={item.id}
            className={`history-item card ${selectedItem?.id === item.id ? 'selected' : ''}`}
            onClick={() => setSelectedItem(item)}
          >
            <div className="history-item-header">
              <span className="text-small text-muted">
                {new Date(item.createdAt).toLocaleDateString('pt-BR')} {new Date(item.createdAt).toLocaleTimeString('pt-BR')}
              </span>
              <span className={`badge ${getStatusBadgeClass(item.status)}`}>
                {getStatusLabel(item.status)}
              </span>
            </div>

            {item.thumbnails && Object.values(item.thumbnails)[0] && (
              <img
                src={Object.values(item.thumbnails)[0]}
                alt="Thumbnail"
                className="history-thumbnail"
              />
            )}

            <p className="history-rationale">
              {item.rationale.slice(0, 100)}
              {item.rationale.length > 100 ? '...' : ''}
            </p>

            <div className="history-meta">
              <span className="meta-badge">
                {(item.confidence * 100).toFixed(0)}% confiança
              </span>
              {item.risk_flags && item.risk_flags.length > 0 && (
                <span className="meta-badge warning">
                  {item.risk_flags.length} alerta{item.risk_flags.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="history-detail">
        {selectedItem ? (
          <div className="card">
            <h3 className="section-title">Detalhes da Sugestão</h3>

            <div className="detail-row">
              <span className="detail-label">Data</span>
              <span>{new Date(selectedItem.createdAt).toLocaleString('pt-BR')}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className={`badge ${getStatusBadgeClass(selectedItem.status)}`}>
                {getStatusLabel(selectedItem.status)}
              </span>
            </div>

            {selectedItem.thumbnails && (
              <div className="detail-section">
                <span className="detail-label">Imagens</span>
                <div className="detail-thumbnails">
                  {Object.values(selectedItem.thumbnails).map((thumb, i) => (
                    <img key={i} src={thumb} alt={`Thumbnail ${i + 1}`} />
                  ))}
                </div>
              </div>
            )}

            {selectedItem.captureMeta?.note && (
              <div className="detail-section">
                <span className="detail-label">Nota do Operador</span>
                <p className="text-small">{selectedItem.captureMeta.note}</p>
              </div>
            )}

            <div className="detail-section">
              <span className="detail-label">Análise</span>
              <p className="text-small">{selectedItem.rationale}</p>
            </div>

            {selectedItem.observations && selectedItem.observations.length > 0 && (
              <div className="detail-section">
                <span className="detail-label">Observações</span>
                <ul className="detail-list">
                  {selectedItem.observations.map((obs, i) => (
                    <li key={i} className="text-small">{obs}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="detail-row">
              <span className="detail-label">Confiança</span>
              <span>{(selectedItem.confidence * 100).toFixed(1)}%</span>
            </div>

            {selectedItem.risk_flags && selectedItem.risk_flags.length > 0 && (
              <div className="detail-section">
                <span className="detail-label">Alertas de Risco</span>
                <div className="risk-flags">
                  {selectedItem.risk_flags.map((flag, i) => (
                    <span key={i} className="risk-flag">{flag}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-section">
              <span className="detail-label">Setpoints Sugeridos</span>
              <table className="detail-table">
                <tbody>
                  <tr>
                    <td>Temp Mín:</td>
                    <td>{selectedItem.suggested_setpoints.tMin}°C</td>
                  </tr>
                  <tr>
                    <td>Temp Máx:</td>
                    <td>{selectedItem.suggested_setpoints.tMax}°C</td>
                  </tr>
                  <tr>
                    <td>Umidade Mín:</td>
                    <td>{selectedItem.suggested_setpoints.uMin}%</td>
                  </tr>
                  <tr>
                    <td>Umidade Máx:</td>
                    <td>{selectedItem.suggested_setpoints.uMax}%</td>
                  </tr>
                  <tr>
                    <td>CO:</td>
                    <td>{selectedItem.suggested_setpoints.coSp} ppm</td>
                  </tr>
                  <tr>
                    <td>CO₂:</td>
                    <td>{selectedItem.suggested_setpoints.co2Sp} ppm</td>
                  </tr>
                  <tr>
                    <td>TVOCs:</td>
                    <td>{selectedItem.suggested_setpoints.tvocsSp} ppb</td>
                  </tr>
                  <tr>
                    <td>Luz:</td>
                    <td>{selectedItem.suggested_setpoints.lux} lux</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {selectedItem.reviewedBy && (
              <div className="detail-row">
                <span className="detail-label">Revisado por</span>
                <span className="text-small">{selectedItem.reviewedBy}</span>
              </div>
            )}

            {selectedItem.rejectReason && (
              <div className="detail-section">
                <span className="detail-label">Motivo da Rejeição</span>
                <p className="text-small">{selectedItem.rejectReason}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <p className="text-muted text-center">Selecione uma sugestão para ver os detalhes</p>
          </div>
        )}
      </div>
    </div>
  )
}
