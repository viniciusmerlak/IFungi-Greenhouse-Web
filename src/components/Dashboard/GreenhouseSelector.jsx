import { Boxes } from 'lucide-react'

export default function GreenhouseSelector({ greenhouses, selectedId, onSelect }) {
  return (
    <div className="card">
      <label>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Boxes size={14} /> Estufa selecionada
        </span>
        <select value={selectedId || ''} onChange={(e) => onSelect(e.target.value)}>
          <option value="" disabled>
            Selecione uma estufa
          </option>
          {greenhouses.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
