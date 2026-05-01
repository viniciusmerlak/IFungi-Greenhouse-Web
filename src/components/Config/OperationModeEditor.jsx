/**
 * OperationModeEditor.jsx — Djamor redesign.
 * Modo de operação (manual, incubacao, frutificacao, secagem, manutencao).
 * Sem emojis — ícones via lucide.
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  SlidersHorizontal,
  Sprout,
  Flower2,
  Wind,
  Wrench,
  Workflow,
} from 'lucide-react'
import { updateGreenhouseNode } from '../../services/rtdb'

const MODES = [
  {
    id: 'manual',
    label: 'Manual',
    Icon: SlidersHorizontal,
    desc: 'Setpoints controlados pelo app. Todos os atuadores respondem normalmente.',
  },
  {
    id: 'incubacao',
    label: 'Incubação',
    Icon: Sprout,
    desc: 'Substrato em sacos selados. Escuro, seco, temperatura controlada (22–28°C).',
  },
  {
    id: 'frutificacao',
    label: 'Frutificação',
    Icon: Flower2,
    desc: 'Alta umidade (85–95%), ciclo de luz 12h, temperatura 18–24°C.',
  },
  {
    id: 'secagem',
    label: 'Secagem',
    Icon: Wind,
    desc: 'Pós-colheita. Umidade baixa, exaustor contínuo, LEDs desligados.',
  },
  {
    id: 'manutencao',
    label: 'Manutenção',
    Icon: Wrench,
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
      toast.success(`Modo "${MODES.find((m) => m.id === modeId)?.label}" aplicado`)
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const current = MODES.find((m) => m.id === currentMode) ?? MODES[0]
  const CurrentIcon = current.Icon

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <span className="header-icon">
            <Workflow size={16} />
          </span>
          Modo de Operação
        </h3>
        <span className="status djamor">
          <CurrentIcon size={12} /> {current.label}
        </span>
      </div>

      {operationMode?.changedBy && operationMode?.lastChanged > 0 && (
        <p className="hint-text" style={{ marginBottom: '0.85rem' }}>
          Alterado por <strong>{operationMode.changedBy}</strong> —{' '}
          {new Date(operationMode.lastChanged * 1000).toLocaleString('pt-BR')}
        </p>
      )}

      <div className="mode-grid">
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => applyMode(id)}
            disabled={saving}
            className={`mode-btn ${id === currentMode ? 'active' : ''}`}
          >
            <span className="mode-icon">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <span className="mode-label">{label}</span>
          </button>
        ))}
      </div>

      <p className="hint-text">{current.desc}</p>
    </div>
  )
}
