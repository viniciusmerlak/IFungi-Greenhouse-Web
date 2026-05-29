import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function SuggestionDiffTable({ current, suggested, suggestedMode, currentMode: currentModeRaw }) {
  // operation_mode pode ser uma string simples ou um objeto {mode, lastChanged, changedBy}
  const currentMode = currentModeRaw && typeof currentModeRaw === 'object'
    ? currentModeRaw.mode
    : currentModeRaw
  function getDiff(currentVal, suggestedVal) {
    if (!current || currentVal === undefined) return { changed: false, direction: 'none' }
    const diff = suggestedVal - currentVal
    if (Math.abs(diff) < 0.01) return { changed: false, direction: 'none' }
    return { changed: true, direction: diff > 0 ? 'up' : 'down', value: diff }
  }

  const fields = [
    { key: 'tMin', label: 'Temp Mín', unit: '°C' },
    { key: 'tMax', label: 'Temp Máx', unit: '°C' },
    { key: 'uMin', label: 'Umidade Mín', unit: '%' },
    { key: 'uMax', label: 'Umidade Máx', unit: '%' },
    { key: 'coSp', label: 'CO', unit: 'ppm' },
    { key: 'co2Sp', label: 'CO₂', unit: 'ppm' },
    { key: 'tvocsSp', label: 'TVOCs', unit: 'ppb' },
    { key: 'lux', label: 'Luz', unit: 'lux' },
  ]

  return (
    <div className="diff-table">
      <table>
        <thead>
          <tr>
            <th>Parâmetro</th>
            <th>Atual</th>
            <th></th>
            <th>Sugerido</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(({ key, label, unit }) => {
            const currentVal = current?.[key]
            const suggestedVal = suggested[key]
            const diff = getDiff(currentVal, suggestedVal)

            return (
              <tr key={key} className={diff.changed ? 'changed' : ''}>
                <td className="field-label">{label}</td>
                <td className="current-value">{currentVal !== undefined ? `${currentVal} ${unit}` : '—'}</td>
                <td className="diff-indicator">
                  {diff.changed && (
                    <>
                      {diff.direction === 'up' && <TrendingUp size={16} className="trend-up" />}
                      {diff.direction === 'down' && <TrendingDown size={16} className="trend-down" />}
                    </>
                  )}
                  {!diff.changed && <Minus size={16} className="trend-none" />}
                </td>
                <td className="suggested-value">
                  {suggestedVal !== undefined ? `${suggestedVal} ${unit}` : '—'}
                </td>
              </tr>
            )
          })}
          {suggestedMode && (
            <tr className={currentMode !== suggestedMode ? 'changed' : ''}>
              <td className="field-label">Modo</td>
              <td className="current-value">{currentMode || '—'}</td>
              <td className="diff-indicator">
                {currentMode !== suggestedMode ? (
                  <TrendingUp size={16} className="trend-up" />
                ) : (
                  <Minus size={16} className="trend-none" />
                )}
              </td>
              <td className="suggested-value">{suggestedMode}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}