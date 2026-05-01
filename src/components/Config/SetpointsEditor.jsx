/**
 * SetpointsEditor.jsx
 * Edita os setpoints usando os campos reais do banco:
 *   setpoints.tMin, tMax, uMin, uMax, lux, co2Sp, coSp, tvocsSp
 */
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { updateGreenhouseNode } from '../../services/rtdb'

const FIELDS = [
  { key: 'tMin',    label: 'Temp. Mín',  unit: '°C', min: 0,    max: 40,   step: 0.5 },
  { key: 'tMax',    label: 'Temp. Máx',  unit: '°C', min: 0,    max: 50,   step: 0.5 },
  { key: 'uMin',    label: 'Umid. Mín',  unit: '%',  min: 0,    max: 100,  step: 1   },
  { key: 'uMax',    label: 'Umid. Máx',  unit: '%',  min: 0,    max: 100,  step: 1   },
  { key: 'lux',     label: 'Lux Mín',    unit: 'lux',min: 0,    max: 4095, step: 50  },
  { key: 'co2Sp',   label: 'CO₂ Máx',   unit: 'ppm',min: 100,  max: 5000, step: 50  },
  { key: 'coSp',    label: 'CO Máx',    unit: 'ppm',min: 0,    max: 500,  step: 5   },
  { key: 'tvocsSp', label: 'TVOCs Máx', unit: 'ppb',min: 0,    max: 1000, step: 10  },
]

export default function SetpointsEditor({ greenhouseId, setpoints = {} }) {
  const [local, setLocal] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setLocal(null) }, [setpoints])

  const values = local ?? {
    tMin:    setpoints.tMin    ?? 20,
    tMax:    setpoints.tMax    ?? 30,
    uMin:    setpoints.uMin    ?? 60,
    uMax:    setpoints.uMax    ?? 80,
    lux:     setpoints.lux     ?? 5000,
    co2Sp:   setpoints.co2Sp   ?? 1000,
    coSp:    setpoints.coSp    ?? 50,
    tvocsSp: setpoints.tvocsSp ?? 100,
  }

  const set = (key, value) => setLocal((prev) => ({ ...values, ...(prev ?? {}), [key]: value }))

  const save = async () => {
    if (values.tMin >= values.tMax) { toast.error('Temp. mín deve ser menor que máx'); return }
    if (values.uMin >= values.uMax) { toast.error('Umid. mín deve ser menor que máx'); return }
    setSaving(true)
    try {
      await updateGreenhouseNode(greenhouseId, 'setpoints', values)
      toast.success('Setpoints salvos')
      setLocal(null)
    } catch (e) {
      toast.error('Erro: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const dirty = local !== null

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: '0.75rem' }}>
        <h3>Setpoints</h3>
        {dirty && <span style={{ fontSize: '0.8rem', color: '#d97706' }}>● Não salvo</span>}
      </div>
      <div className="setpoints-grid">
        {FIELDS.map(({ key, label, unit, min, max, step }) => (
          <label key={key}>
            {label}
            <div className="sp-input-row">
              <input
                type="number" min={min} max={max} step={step}
                value={values[key]}
                onChange={(e) => set(key, Number(e.target.value))}
              />
              <span className="sp-unit">{unit}</span>
            </div>
          </label>
        ))}
      </div>
      <button onClick={save} disabled={saving || !dirty} style={{ marginTop: '1rem', width: '100%' }}>
        {saving ? 'Salvando...' : '💾 Salvar setpoints'}
      </button>
    </div>
  )
}
