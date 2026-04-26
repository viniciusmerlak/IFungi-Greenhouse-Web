import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { writeGreenhouseNode } from '../../services/rtdb'
import CycleWindowsEditor from './CycleWindowsEditor'

const setpointFields = ['tMin', 'tMax', 'uMin', 'uMax', 'co2Sp', 'coSp', 'tvocsSp', 'lux']

function normalizeCycles(cycles) {
  const safeCycles = cycles && typeof cycles === 'object' ? cycles : {}
  return {
    leds: Array.isArray(safeCycles.leds) ? safeCycles.leds : [],
    humidifier: Array.isArray(safeCycles.humidifier) ? safeCycles.humidifier : [],
    exhaust: Array.isArray(safeCycles.exhaust) ? safeCycles.exhaust : [],
    peltier: Array.isArray(safeCycles.peltier) ? safeCycles.peltier : [],
  }
}

export default function OperationModeEditor({ greenhouseId, operationMode = {} }) {
  const [form, setForm] = useState({
    active: false,
    name: '',
    setpoints: {},
    permissions: {},
    cycles: { leds: [], humidifier: [], exhaust: [], peltier: [] },
    ...operationMode,
    cycles: normalizeCycles(operationMode?.cycles),
  })

  useEffect(() => {
    setForm({
      active: false,
      name: '',
      setpoints: {},
      permissions: {},
      cycles: { leds: [], humidifier: [], exhaust: [], peltier: [] },
      ...operationMode,
      cycles: normalizeCycles(operationMode?.cycles),
    })
  }, [operationMode])

  const setCycle = (key, windows) => {
    setForm((prev) => ({ ...prev, cycles: { ...(prev.cycles || {}), [key]: windows } }))
  }

  const save = async () => {
    await writeGreenhouseNode(greenhouseId, 'operation_mode', {
      ...form,
      ledIntensity: Number(form.ledIntensity || 0),
      cycles: {
        leds: form?.cycles?.leds || [],
        humidifier: form?.cycles?.humidifier || [],
        exhaust: form?.cycles?.exhaust || [],
        peltier: form?.cycles?.peltier || [],
      },
    })
    toast.success('Modo customizavel salvo')
  }

  return (
    <div className="card">
      <h3>Modo de operacao customizavel</h3>
      <label className="checkbox-inline">
        <input type="checkbox" checked={!!form.active} onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))} />
        Ativo
      </label>
      <label>
        Nome
        <input value={form.name || ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
      </label>
      <div className="grid">
        {setpointFields.map((field) => (
          <label key={field}>
            {field}
            <input
              type="number"
              value={form?.setpoints?.[field] ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  setpoints: { ...(prev.setpoints || {}), [field]: Number(e.target.value) },
                }))
              }
            />
          </label>
        ))}
      </div>
      <div className="row-wrap">
        {['humidifier', 'leds', 'peltier', 'exhaust'].map((perm) => (
          <label key={perm} className="checkbox-inline">
            <input
              type="checkbox"
              checked={!!form?.permissions?.[perm]}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  permissions: { ...(prev.permissions || {}), [perm]: e.target.checked },
                }))
              }
            />
            {perm}
          </label>
        ))}
      </div>
      <label>
        Intensidade LEDs
        <input type="range" min="0" max="255" value={form.ledIntensity ?? 0} onChange={(e) => setForm((prev) => ({ ...prev, ledIntensity: e.target.value }))} />
      </label>
      <label className="checkbox-inline">
        <input
          type="checkbox"
          checked={!!form.solarSim}
          onChange={(e) => setForm((prev) => ({ ...prev, solarSim: e.target.checked }))}
        />
        Simulacao solar
      </label>
      <CycleWindowsEditor title="Ciclos LEDs" windows={form?.cycles?.leds || []} onChange={(list) => setCycle('leds', list)} />
      <CycleWindowsEditor title="Ciclos Umidificador" windows={form?.cycles?.humidifier || []} onChange={(list) => setCycle('humidifier', list)} />
      <CycleWindowsEditor title="Ciclos Exaustor" windows={form?.cycles?.exhaust || []} onChange={(list) => setCycle('exhaust', list)} />
      <CycleWindowsEditor title="Ciclos Peltier" windows={form?.cycles?.peltier || []} onChange={(list) => setCycle('peltier', list)} />
      <button onClick={save}>Salvar modo</button>
    </div>
  )
}
