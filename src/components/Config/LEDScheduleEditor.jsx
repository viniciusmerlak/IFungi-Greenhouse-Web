import { useState } from 'react'
import toast from 'react-hot-toast'
import { isValidLedWindow, normalizeLedSchedule } from '../../domain/greenhouseSchema'
import { writeGreenhouseNode } from '../../services/rtdb'

export default function LEDScheduleEditor({ greenhouseId, schedule = {} }) {
  const [form, setForm] = useState(() => normalizeLedSchedule(schedule))

  const save = async () => {
    const normalized = normalizeLedSchedule(form)
    if (!isValidLedWindow(normalized)) {
      toast.error('Horario invalido: fim deve ser maior que inicio no mesmo dia')
      return
    }
    await writeGreenhouseNode(greenhouseId, 'led_schedule', normalized)
    toast.success('Agendador de LEDs salvo')
  }

  return (
    <div className="card">
      <h3>Agendador de LEDs</h3>
      <label className="checkbox-inline">
        <input
          type="checkbox"
          checked={!!form.scheduleEnabled}
          onChange={(e) => setForm((prev) => ({ ...prev, scheduleEnabled: e.target.checked }))}
        />
        Habilitar agendamento
      </label>
      <label className="checkbox-inline">
        <input
          type="checkbox"
          checked={!!form.solarSimEnabled}
          onChange={(e) => setForm((prev) => ({ ...prev, solarSimEnabled: e.target.checked }))}
        />
        Simulacao solar
      </label>
      <div className="row-wrap compact-input-row">
        <input type="number" min="0" max="23" placeholder="onHour" value={form.onHour ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, onHour: e.target.value }))} />
        <input type="number" min="0" max="59" placeholder="onMinute" value={form.onMinute ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, onMinute: e.target.value }))} />
        <input type="number" min="0" max="23" placeholder="offHour" value={form.offHour ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, offHour: e.target.value }))} />
        <input type="number" min="0" max="59" placeholder="offMinute" value={form.offMinute ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, offMinute: e.target.value }))} />
      </div>
      <label>
        Intensidade
        <input type="range" min="0" max="255" value={form.intensity ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, intensity: e.target.value }))} />
      </label>
      <button onClick={save}>Salvar agendador</button>
    </div>
  )
}
