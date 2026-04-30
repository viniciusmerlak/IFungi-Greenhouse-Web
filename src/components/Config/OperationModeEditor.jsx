import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { operationModeOptions } from '../../domain/greenhouseSchema'
import { writeGreenhouseNode } from '../../services/rtdb'

const labels = {
  manual: 'Manual',
  incubacao: 'Incubacao',
  frutificacao: 'Frutificacao',
  secagem: 'Secagem',
  manutencao: 'Manutencao',
}

export default function OperationModeEditor({ greenhouseId, operationMode = {} }) {
  const currentMode = useMemo(() => {
    const mode = operationMode?.mode
    return operationModeOptions.includes(mode) ? mode : 'manual'
  }, [operationMode?.mode])
  const [mode, setMode] = useState(() => currentMode)

  const save = async () => {
    const payload = {
      mode,
      lastChanged: Math.floor(Date.now() / 1000),
      changedBy: 'app-web',
    }
    await writeGreenhouseNode(greenhouseId, 'operation_mode', payload)
    toast.success(`Modo salvo: ${labels[mode]}`)
  }

  return (
    <div className="card">
      <h3>Modo de operacao</h3>
      <label>
        Modo atual do firmware
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          {operationModeOptions.map((item) => (
            <option key={item} value={item}>
              {labels[item]}
            </option>
          ))}
        </select>
      </label>
      <p className="hint-text">
        Este painel escreve somente o contrato oficial do firmware em <code>operation_mode.mode</code>.
      </p>
      <button onClick={save}>Salvar modo</button>
    </div>
  )
}
