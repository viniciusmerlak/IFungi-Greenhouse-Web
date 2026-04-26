export default function CycleWindowsEditor({ title, windows = [], onChange }) {
  const normalizedWindows = Array.isArray(windows) ? windows : []

  const addWindow = () =>
    onChange([...normalizedWindows, { onHour: 6, onMin: 0, offHour: 18, offMin: 0 }])
  const removeWindow = (index) => onChange(normalizedWindows.filter((_, i) => i !== index))
  const patchWindow = (index, key, value) =>
    onChange(
      normalizedWindows.map((item, i) => (i === index ? { ...item, [key]: Number(value) } : item)),
    )

  return (
    <div className="card">
      <div className="row-between">
        <h4>{title}</h4>
        <button onClick={addWindow}>Adicionar janela</button>
      </div>
      {normalizedWindows.map((window, index) => (
        <div className="cycle-row" key={`${title}-${index}`}>
          <input type="number" min="0" max="23" value={window.onHour} onChange={(e) => patchWindow(index, 'onHour', e.target.value)} />
          <input type="number" min="0" max="59" value={window.onMin} onChange={(e) => patchWindow(index, 'onMin', e.target.value)} />
          <input type="number" min="0" max="23" value={window.offHour} onChange={(e) => patchWindow(index, 'offHour', e.target.value)} />
          <input type="number" min="0" max="59" value={window.offMin} onChange={(e) => patchWindow(index, 'offMin', e.target.value)} />
          <button onClick={() => removeWindow(index)}>Remover</button>
        </div>
      ))}
    </div>
  )
}
