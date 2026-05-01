/**
 * LEDScheduleEditor.jsx
 * Edita o led_schedule com os campos reais do banco:
 *   scheduleEnabled, solarSimEnabled, onHour, onMinute, offHour, offMinute, intensity
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { updateGreenhouseNode } from '../../services/rtdb'

export default function LEDScheduleEditor({ greenhouseId, schedule = {} }) {
  const [local, setLocal] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setLocal(null) }, [schedule])

  const values = local ?? {
    scheduleEnabled: !!schedule.scheduleEnabled,
    solarSimEnabled: !!schedule.solarSimEnabled,
    onHour:          schedule.onHour     ?? 6,
    onMinute:        schedule.onMinute   ?? 0,
    offHour:         schedule.offHour    ?? 20,
    offMinute:       schedule.offMinute  ?? 0,
    intensity:       schedule.intensity  ?? 255,
  }

  const set = (key, value) => setLocal((prev) => ({ ...values, ...(prev ?? {}), [key]: value }))

  const save = async () => {
    const { onHour, onMinute, offHour, offMinute } = values
    const start = onHour * 60 + onMinute
    const end   = offHour * 60 + offMinute
    if (end <= start) { toast.error('Horário de fim deve ser depois do início'); return }
    setSaving(true)
    try {
      await updateGreenhouseNode(greenhouseId, 'led_schedule', values)
      toast.success('Agendamento de LEDs salvo')
      setLocal(null)
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const dirty = local !== null
  const activeMode = values.solarSimEnabled ? 'Solar' : values.scheduleEnabled ? 'Timer' : 'Desativado'

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: '0.75rem' }}>
        <h3>Agendamento LEDs</h3>
        <span className={`status ${values.scheduleEnabled || values.solarSimEnabled ? 'ok' : 'neutral'}`}>
          {activeMode}
        </span>
      </div>

      <div style={{ display: 'grid', gap: '0.6rem' }}>
        <label className="checkbox-inline">
          <input type="checkbox" checked={values.scheduleEnabled}
            onChange={(e) => {
              set('scheduleEnabled', e.target.checked)
              if (e.target.checked) set('solarSimEnabled', false)
            }}
          />
          Timer fixo (liga/desliga em horário)
        </label>
        <label className="checkbox-inline">
          <input type="checkbox" checked={values.solarSimEnabled}
            onChange={(e) => {
              set('solarSimEnabled', e.target.checked)
              if (e.target.checked) set('scheduleEnabled', false)
            }}
          />
          Simulação solar (intensidade senoidal)
        </label>

        <div className="cycle-row">
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ligar:</span>
          <input type="number" min={0} max={23} value={values.onHour}
            onChange={(e) => set('onHour', Number(e.target.value))} style={{ width: 60 }} />
          <span>h</span>
          <input type="number" min={0} max={59} value={values.onMinute}
            onChange={(e) => set('onMinute', Number(e.target.value))} style={{ width: 60 }} />
          <span>min</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '0.5rem' }}>Desligar:</span>
          <input type="number" min={0} max={23} value={values.offHour}
            onChange={(e) => set('offHour', Number(e.target.value))} style={{ width: 60 }} />
          <span>h</span>
          <input type="number" min={0} max={59} value={values.offMinute}
            onChange={(e) => set('offMinute', Number(e.target.value))} style={{ width: 60 }} />
          <span>min</span>
        </div>

        {values.scheduleEnabled && !values.solarSimEnabled && (
          <label>
            Intensidade (timer): {values.intensity}/255
            <input type="range" min={0} max={255}
              value={values.intensity}
              onChange={(e) => set('intensity', Number(e.target.value))}
            />
          </label>
        )}
      </div>

      <button onClick={save} disabled={saving || !dirty} style={{ marginTop: '1rem', width: '100%' }}>
        {saving ? 'Salvando...' : '💾 Salvar agendamento'}
      </button>
    </div>
  )
}
