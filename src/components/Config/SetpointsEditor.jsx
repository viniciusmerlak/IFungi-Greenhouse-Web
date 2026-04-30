import { useState } from 'react'
import toast from 'react-hot-toast'
import { normalizeSetpoints } from '../../domain/greenhouseSchema'
import { writeGreenhouseNode } from '../../services/rtdb'

const fields = ['tMin', 'tMax', 'uMin', 'uMax', 'coSp', 'co2Sp', 'tvocsSp', 'lux']

export default function SetpointsEditor({ greenhouseId, setpoints = {} }) {
  const [form, setForm] = useState(() => normalizeSetpoints(setpoints))

  const save = async () => {
    await writeGreenhouseNode(greenhouseId, 'setpoints', normalizeSetpoints(form))
    toast.success('Setpoints salvos')
  }

  return (
    <div className="card">
      <h3>Setpoints</h3>
      <div className="grid">
        {fields.map((field) => (
          <label key={field}>
            {field}
            <input
              type="number"
              value={form[field] ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, [field]: Number(e.target.value) }))}
            />
          </label>
        ))}
      </div>
      <button onClick={save}>Salvar setpoints</button>
    </div>
  )
}
