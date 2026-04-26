export default function GreenhouseSelector({ greenhouses, selectedId, onSelect }) {
  return (
    <div className="card">
      <label>
        Estufa selecionada
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
