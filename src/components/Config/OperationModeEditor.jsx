/**
 * OperationModeEditor.jsx
 * Seleciona o modo de operação usando o campo real:
 *   operation_mode.mode (manual | incubacao | frutificacao | secagem | manutencao)
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import { updateGreenhouseNode } from '../../services/rtdb'

const MODES = [
  {
    id: 'manual',
    label: 'Manual',
    icon: '🎛️',
    desc: 'Setpoints controlados pelo app. Todos os atuadores respondem normalmente.',
  },
  {
    id: 'incubacao',
    label: 'Incubação',
    icon: '🍄',
    desc: 'Substrato em sacos selados. Escuro, seco, temperatura controlada (22–28°C).',
  },
  {
    id: 'frutificacao',
    label: 'Frutificação',
    icon: '🌱',
    desc: 'Alta umidade (85–95%), ciclo de luz 12h, temperatura 18–24°C.',
  },
  {
    id: 'secagem',
    label: 'Secagem',
    icon: '💨',
    desc: 'Pós-colheita. Umidade baixa, exaustor contínuo, LEDs desligados.',
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    icon: '🔧',
    desc: 'Sem cultivo. Todos os atuadores desligados. Ideal para limpeza.',
  },
]

export default function OperationModeEditor({ greenhouseId, operationMode = {} }) {
  const currentMode = operationMode?.mode ?? 'manual'
  const [saving, setSaving] = useState(false)

  const applyMode = async (modeId) => {
    if (modeId === currentMode) return
    setSaving(true)
    try {
      await updateGreenhouseNode(greenhouseId, 'operation_mode', {
        mode: modeId,
        lastChanged: Math.floor(Date.now() / 1000),
        changedBy: 'app',
      })
      toast.success(`Modo "${MODES.find(m => m.id === modeId)?.label}" aplicado`)
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const current = MODES.find((m) => m.id === currentMode) ?? MODES[0]

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: '0.75rem' }}>
        <h3>Modo de Operação</h3>
        <span className="status ok">{current.icon} {current.label}</span>
      </div>

      {operationMode?.changedBy && (
        <p style={{ fontSize: '0.8rem', color: '#5f7c6b', marginBottom: '0.75rem' }}>
          Alterado por: {operationMode.changedBy}
          {operationMode.lastChanged > 0 &&
            ` — ${new Date(operationMode.lastChanged * 1000).toLocaleString('pt-BR')}`}
        </p>
      )}

      <div className="mode-grid">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => applyMode(m.id)}
            disabled={saving}
            title={m.desc}
            className={`mode-btn ${m.id === currentMode ? 'mode-btn-active' : ''}`}
          >
            <span className="mode-icon">{m.icon}</span>
            <span className="mode-label">{m.label}</span>
          </button>
        ))}
      </div>

      <p className="hint-text">{current.desc}</p>
    </div>
  )
}
