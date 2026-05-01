/**
 * ActuatorPanel.jsx — Djamor redesign.
 * Estado atual via "actuator-pill" coloridos por tipo + controles manuais
 * quando debug_mode=true. Sem emojis; ícones via lucide.
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Cpu,
  Bot,
  Hand,
  Save,
  Lightbulb,
  Droplet,
  AlertTriangle,
  Power,
} from 'lucide-react'
import { updateGreenhouseNode } from '../../services/rtdb'

const RELAY_LABELS = {
  rele1: 'Relé 1 — Peltier',
  rele2: 'Relé 2 — Polaridade',
  rele3: 'Relé 3 — Umidificador',
  rele4: 'Relé 4 — Exaustor',
}

export default function ActuatorPanel({
  greenhouseId,
  atuadores = {},
  debugMode = false,
  manualActuators = {},
}) {
  const [saving, setSaving] = useState(false)
  const [local, setLocal] = useState(null)

  const manual = local ?? {
    rele1: !!manualActuators.rele1,
    rele2: !!manualActuators.rele2,
    rele3: !!manualActuators.rele3,
    rele4: !!manualActuators.rele4,
    leds: {
      ligado: !!manualActuators?.leds?.ligado,
      intensity: manualActuators?.leds?.intensity ?? 0,
    },
    umidificador: !!manualActuators.umidificador,
  }

  const toggleDebug = async () => {
    try {
      await updateGreenhouseNode(greenhouseId, 'debug_mode', !debugMode)
      toast.success(debugMode ? 'Modo automático ativado' : 'Modo manual ativado')
    } catch (e) {
      toast.error('Erro ao alternar modo: ' + e.message)
    }
  }

  const saveManual = async () => {
    setSaving(true)
    try {
      await updateGreenhouseNode(greenhouseId, 'manual_actuators', manual)
      toast.success('Atuadores manuais enviados')
      setLocal(null)
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const setField = (field, value) =>
    setLocal((prev) => ({ ...manual, ...(prev ?? {}), [field]: value }))

  const setLedField = (field, value) =>
    setLocal((prev) => ({
      ...manual,
      ...(prev ?? {}),
      leds: { ...manual.leds, [field]: value },
    }))

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <span className="header-icon">
            <Cpu size={16} />
          </span>
          Atuadores
        </h3>
        <button onClick={toggleDebug} className={debugMode ? 'primary' : 'ghost'}>
          {debugMode ? <Hand size={14} /> : <Bot size={14} />}
          {debugMode ? 'Manual ativo' : 'Automático'}
        </button>
      </div>

      <div className="actuator-status-grid">
        {Object.entries(RELAY_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={`actuator-pill ${atuadores[key] ? 'on' : ''}`}
          >
            <span className="actuator-dot" />
            {label}
          </span>
        ))}
        <span
          className={`actuator-pill ${atuadores?.leds?.ligado ? 'led-on' : ''}`}
        >
          <span className="actuator-dot" />
          LEDs {atuadores?.leds?.ligado ? `(${atuadores.leds.watts}/255)` : ''}
        </span>
        <span
          className={`actuator-pill ${atuadores?.umidificador ? 'hum-on' : ''}`}
        >
          <span className="actuator-dot" />
          Umidificador
        </span>
      </div>

      {debugMode && (
        <div className="manual-grid">
          <div className="manual-warning">
            <AlertTriangle size={14} /> Controle manual ativo — o ESP32 irá aplicar estes valores.
          </div>
          {Object.entries(RELAY_LABELS).map(([key, label]) => (
            <label key={key} className="checkbox-inline">
              <input
                type="checkbox"
                checked={!!manual[key]}
                onChange={(e) => setField(key, e.target.checked)}
              />
              {label}
            </label>
          ))}
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={!!manual.leds.ligado}
              onChange={(e) => setLedField('ligado', e.target.checked)}
            />
            <Lightbulb size={14} /> LEDs
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={!!manual.umidificador}
              onChange={(e) => setField('umidificador', e.target.checked)}
            />
            <Droplet size={14} /> Umidificador
          </label>
          {manual.leds.ligado && (
            <label style={{ gridColumn: '1 / -1' }}>
              Intensidade LEDs: {manual.leds.intensity}/255
              <input
                type="range"
                min={0}
                max={255}
                value={manual.leds.intensity}
                onChange={(e) => setLedField('intensity', Number(e.target.value))}
              />
            </label>
          )}
          <button
            onClick={saveManual}
            disabled={saving}
            className="primary"
            style={{ gridColumn: '1 / -1' }}
          >
            {saving ? <Power size={14} /> : <Save size={14} />}
            {saving ? 'Enviando...' : 'Aplicar atuadores manuais'}
          </button>
        </div>
      )}
    </div>
  )
}
