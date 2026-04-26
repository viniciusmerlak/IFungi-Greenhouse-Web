import { updateGreenhouseNode, writeGreenhouseNode } from '../../services/rtdb'

function statusDot(active) {
  return <span className={`dot ${active ? 'ok' : 'bad'}`} />
}

export default function ActuatorPanel({ greenhouseId, atuadores = {}, debugMode, manualActuators = {} }) {
  const toggleDebug = async () => {
    await writeGreenhouseNode(greenhouseId, 'debug_mode', !debugMode)
  }

  const updateManual = (payload) => updateGreenhouseNode(greenhouseId, 'manual_actuators', payload)

  return (
    <div className="card">
      <div className="row-between">
        <h3>Atuadores</h3>
        <button type="button" onClick={toggleDebug}>
          Debug: {debugMode ? 'ON' : 'OFF'}
        </button>
      </div>
      <ul className="compact-list">
        <li>Rele1 {statusDot(atuadores.rele1)}</li>
        <li>Rele2 {statusDot(atuadores.rele2)}</li>
        <li>Rele3 {statusDot(atuadores.rele3)}</li>
        <li>Rele4 {statusDot(atuadores.rele4)}</li>
        <li>Umidificador {statusDot(atuadores.umidificador)}</li>
        <li>LEDs intensidade: {atuadores?.leds?.watts ?? atuadores?.leds?.intensity ?? 0}</li>
      </ul>

      {debugMode && (
        <div className="manual-grid">
          <h4>Controle manual (debug_mode)</h4>
          {[1, 2, 3, 4].map((index) => (
            <button
              key={index}
              type="button"
              onClick={() => updateManual({ [`rele${index}`]: !manualActuators[`rele${index}`] })}
            >
              Alternar rele{index}
            </button>
          ))}
          <label>
            Intensidade LEDs
            <input
              type="range"
              min="0"
              max="255"
              value={manualActuators?.leds?.intensity ?? 0}
              onChange={(e) =>
                updateManual({
                  leds: { ...(manualActuators.leds || {}), intensity: Number(e.target.value), ligado: true },
                })
              }
            />
          </label>
        </div>
      )}
    </div>
  )
}
