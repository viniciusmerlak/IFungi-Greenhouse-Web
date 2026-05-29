import { useState } from 'react'

export default function RejectSuggestionDialog({ onReject, onCancel, processing }) {
  const [reason, setReason] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onReject(reason.trim() || undefined)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Rejeitar Sugestão</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Motivo (opcional)
            </label>
            <textarea
              className="form-input"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              disabled={processing}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={onCancel} disabled={processing}>
              Cancelar
            </button>
            <button type="submit" className="danger" disabled={processing}>
              {processing ? 'Rejeitando...' : 'Confirmar Rejeição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
