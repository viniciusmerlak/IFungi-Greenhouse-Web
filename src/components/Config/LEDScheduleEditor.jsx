/**
 * LEDScheduleEditor.jsx — Djamor redesign.
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Lightbulb, Save, Sun, Timer } from 'lucide-react'
import { updateGreenhouseNode } from '../../services/rtdb'

export default function LEDScheduleEditor({ greenhouseId, schedule = {} }) {
  const [local, setLocal] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setLocal(null) }, [schedule])

  const values = local ?? {
    scheduleEnabled: !!schedule.scheduleEnabled,
    solarSimEnabled: !!schedule.solarSimEnabled,
    onHour:    schedule.onHour    ?? 6,
    onMinute:  schedule.onMinute  ?? 0,
    offHour:   schedule.offHour   ?? 20,
    offMinute: schedule.offMinute ?? 0,
    intensity: schedule.intensity ?? 255,
  }

  const set = (key, value) => setLocal((prev) => ({ ...values, ...(prev ?? {}), [key]: value }))

  const save = async () => {
    const start = values.onHour * 60 + values.onMinute
    const end = values.offHour * 60 + values.offMinute
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
  const activeMode = values.solarSimEnabled
    ? 'Solar'
    : values.scheduleEnabled
      ? 'Timer'
      : 'Desativado'

  return (
    <div className="card">
      <div className="card-header">
        <h3>
          <span className="header-icon">
            <Lightbulb size={16} />
          </span>
          Agendamento LEDs
        </h3>
        <span className={`status ${values.scheduleEnabled || values.solarSimEnabled ? 'djamor' : 'neutral'}`}>
          {values.solarSimEnabled ? <Sun size={11} /> : <Timer size={11} />} {activeMode}
        </span>
      </div>

      <div style={{ display: 'grid', gap: '0.7rem' }}>
        <label className="checkbox-inline">
          <input
            type="checkbox"
            checked={values.scheduleEnabled}
            onChange={(e) => {
              set('scheduleEnabled', e.target.checked)
              if (e.target.checked) set('solarSimEnabled', false)
            }}
          />
          Timer fixo (liga/desliga em horário)
        </label>
        <label className="checkbox-inline">
          <input
            type="checkbox"
            checked={values.solarSimEnabled}
            onChange={(e) => {
              set('solarSimEnabled', e.target.checked)
              if (e.target.checked) set('scheduleEnabled', false)
            }}
          />
          Simulação solar (intensidade senoidal)
        </label>

        <div className="cycle-row">
          <span style={{ fontWeight: 600 }}>Ligar:</span>
          <input
            type="number"
            min={0}
            max={23}
            value={values.onHour}
            onChange={(e) => set('onHour', Number(e.target.value))}
          />
          <span>h</span>
          <input
            type="number"
            min={0}
            max={59}
            value={values.onMinute}
            onChange={(e) => set('onMinute', Number(e.target.value))}
          />
          <span>min</span>
        </div>
        <div className="cycle-row">
          <span style={{ fontWeight: 600 }}>Desligar:</span>
          <input
            type="number"
            min={0}
            max={23}
            value={values.offHour}
            onChange={(e) => set('offHour', Number(e.target.value))}
          />
          <span>h</span>
          <input
            type="number"
            min={0}
            max={59}
            value={values.offMinute}
            onChange={(e) => set('offMinute', Number(e.target.value))}
          />
          <span>min</span>
        </div>

        {values.scheduleEnabled && !values.solarSimEnabled && (
          <label>
            Intensidade (timer): {values.intensity}/255
            <input
              type="range"
              min={0}
              max={255}
              value={values.intensity}
              onChange={(e) => set('intensity', Number(e.target.value))}
            />
          </label>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving || !dirty}
        className="primary"
        style={{ marginTop: '1rem', width: '100%' }}
      >
        <Save size={14} /> {saving ? 'Salvando...' : 'Salvar agendamento'}
      </button>
    </div>
  )
}
