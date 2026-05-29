import { useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { approveSuggestion, rejectSuggestion } from '../../services/aiSuggestions'
import SuggestionDiffTable from './SuggestionDiffTable'
import RejectSuggestionDialog from './RejectSuggestionDialog'

export default function AISuggestionsPanel({ suggestion, currentSetpoints, currentOperationMode, greenhouseId, userEmail }) {
  const [processing, setProcessing] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  async function handleApprove() {
    if (!confirm('Aplicar esta sugestão aos setpoints da estufa?')) return

    setProcessing(true)
    try {
      await approveSuggestion(greenhouseId, suggestion.id, suggestion, userEmail)
      toast.success('Sugestão aprovada! Setpoints atualizados.')
    } catch (error) {
      console.error('Failed to approve suggestion:', error)
      toast.error(`Erro ao aprovar: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  async function handleReject(reason) {
    setProcessing(true)
    try {
      await rejectSuggestion(greenhouseId, suggestion.id, reason, userEmail)
      toast.success('Sugestão rejeitada.')
      setShowRejectDialog(false)
    } catch (error) {
      console.error('Failed to reject suggestion:', error)
      toast.error(`Erro ao rejeitar: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const confidence = suggestion.confidence ?? null
  const confidencePercent = confidence != null ? (confidence * 100).toFixed(0) : '?'
  const confidenceColor =
    confidence == null ? '#6c757d' :
    confidence >= 0.8 ? '#28a745' : confidence >= 0.5 ? '#ffc107' : '#dc3545'

  return (
    <>
      <div className="card ai-suggestion-card">
        <div className="ai-suggestion-header">
          <div>
            <h2 className="section-title">💡 AI Recommendation</h2>
            <p className="text-muted text-small">
              {new Date(suggestion.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="confidence-badge" style={{ background: confidenceColor }}>
            {confidencePercent}% confiança
          </div>
        </div>

        {suggestion.thumbnails && Object.values(suggestion.thumbnails).length > 0 && (
          <div className="suggestion-thumbnails">
            {Object.entries(suggestion.thumbnails).map(([key, base64]) => (
              <img key={key} src={base64} alt={`Camera ${key}`} className="suggestion-thumbnail" />
            ))}
          </div>
        )}

        {suggestion.captureMeta?.note && (
          <div className="suggestion-note">
            <strong>Nota do operador:</strong> {suggestion.captureMeta.note}
          </div>
        )}

        <div className="suggestion-rationale">
          <h3 className="subsection-title">Análise</h3>
          <p>{suggestion.rationale}</p>
        </div>

        {suggestion.observations && suggestion.observations.length > 0 && (
          <div className="suggestion-observations">
            <h3 className="subsection-title">Observações</h3>
            <ul>
              {suggestion.observations.map((obs, i) => (
                <li key={i}>{obs}</li>
              ))}
            </ul>
          </div>
        )}

        {suggestion.risk_flags && suggestion.risk_flags.length > 0 && (
          <div className="suggestion-risks">
            <h3 className="subsection-title">⚠️ Alertas de Risco</h3>
            <div className="risk-flags">
              {suggestion.risk_flags.map((flag, i) => (
                <span key={i} className="risk-flag">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="suggestion-setpoints">
          <h3 className="subsection-title">Setpoints Sugeridos</h3>
          <SuggestionDiffTable
            current={currentSetpoints}
            suggested={suggestion.suggested_setpoints}
            suggestedMode={suggestion.suggested_mode}
            currentMode={currentOperationMode}
          />
        </div>

        <div className="suggestion-actions">
          <button
            className="primary"
            onClick={handleApprove}
            disabled={processing}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
          >
            <CheckCircle size={18} />
            Aprovar e Aplicar
          </button>
          <button
            className="danger"
            onClick={() => setShowRejectDialog(true)}
            disabled={processing}
            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
          >
            <XCircle size={18} />
            Rejeitar
          </button>
        </div>
      </div>

      {showRejectDialog && (
        <RejectSuggestionDialog
          onReject={handleReject}
          onCancel={() => setShowRejectDialog(false)}
          processing={processing}
        />
      )}
    </>
  )
}