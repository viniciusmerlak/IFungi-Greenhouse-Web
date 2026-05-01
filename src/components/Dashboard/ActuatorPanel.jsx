/**
 * ActuatorPanel.jsx
 * Exibe o estado dos atuadores e permite controle manual via debug_mode.
 *
 * Campos do banco usados:
 *   atuadores.rele1, rele2, rele3, rele4, leds.ligado, leds.watts, umidificador
 *   manual_actuators.rele1-4, leds.ligado, leds.intensity, umidificador
 *   debug_mode (bool)
 */
import { useState } from 'react'
import toast from 'react-hot-toast'
import { updateGreenhouseNode } from '../../services/rtdb'

const RELAY_LABELS = {
  rele1: 'Relé 1 (Peltier)',
  rele2: 'Relé 2 (Polaridade)',
  rele3: 'Relé 3 (Umidificador)',
  rele4: 'Relé 4 (Exaustor)',
}

export default function ActuatorPanel({ greenhouseId, atuadores = {}, debugMode = false, manualActuators = {} }) {
  const [saving, setSaving] = useState(false)
  const [local, setLocal] = useState(null)

  // Estado manual local (espelha manual_actuators do banco, editável pelo usuário)
  const manual = local ?? {
    rele1:       !!manualActuators.rele1,
    rele2:       !!manualActuators.rele2,
    rele3:       !!manualActuators.rele3,
    rele4:       !!manualActuators.rele4,
    leds:        { ligado: !!manualActuators?.leds?.ligado, intensity: manualActuators?.leds?.intensity ?? 0 },
    umidificador:!!manualActuators.umidificador,
  }

  const toggleDebug = async () => {
    try {
      await updateGreenhouseNode(greenhouseId, 'debug_mode', !debugMode)
      toast.success(debugMode ? 'Modo manual desativado' : 'Modo manual ativado')
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
    setLocal((prev) => ({ ...manual, ...(prev ?? {}), leds: { ...manual.leds, [field]: value } }))

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: '0.75rem' }}>
        <h3>Atuadores</h3>
        <button
          onClick={toggleDebug}
          style={{
            background: debugMode
              ? 'linear-gradient(95deg, #fef3c7, #fde68a)'
              : undefined,
            borderColor: debugMode ? '#d97706' : undefined,
            color: debugMode ? '#92400e' : undefined,
          }}
        >
          {debugMode ? '🔧 Manual ATIVO' : '🤖 Automático'}
        </button>
      </div>

      {/* Estado atual (somente leitura) */}
      <div className="actuator-status-grid">
        {Object.entries(RELAY_LABELS).map(([key, label]) => (
          <div key={key} className={`actuator-pill ${atuadores[key] ? 'actuator-on' : 'actuator-off'}`}>
            {atuadores[key] ? '🟢' : '⚪'} {label}
          </div>
        ))}
        <div className={`actuator-pill ${atuadores?.leds?.ligado ? 'actuator-on' : 'actuator-off'}`}>
          {atuadores?.leds?.ligado ? '🟡' : '⚪'} LEDs {atuadores?.leds?.ligado ? `(${atuadores.leds.watts}/255)` : ''}
        </div>
        <div className={`actuator-pill ${atuadores?.umidificador ? 'actuator-on' : 'actuator-off'}`}>
          {atuadores?.umidificador ? '🔵' : '⚪'} Umidificador
        </div>
      </div>

      {/* Controles manuais (somente quando debug_mode=true) */}
      {debugMode && (
        <div className="manual-grid">
          <p style={{ width: '100%', fontSize: '0.85rem', color: '#92400e', fontWeight: 600 }}>
            ⚠ Controle manual ativo — o ESP32 irá aplicar estes valores
          </p>
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
            LEDs
          </label>
          {manual.leds.ligado && (
            <label style={{ width: '100%' }}>
              Intensidade LEDs: {manual.leds.intensity}/255
              <input
                type="range" min={0} max={255}
                value={manual.leds.intensity}
                onChange={(e) => setLedField('intensity', Number(e.target.value))}
              />
            </label>
          )}
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={!!manual.umidificador}
              onChange={(e) => setField('umidificador', e.target.checked)}
            />
            Umidificador
          </label>
          <button onClick={saveManual} disabled={saving} style={{ marginTop: '0.5rem' }}>
            {saving ? 'Enviando...' : '💾 Aplicar'}
          </button>
        </div>
      )}
    </div>
  )
}
