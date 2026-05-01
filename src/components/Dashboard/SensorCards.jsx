/**
 * SensorCards.jsx
 * Exibe os sensores usando os campos reais do banco:
 *   sensores.temperatura, umidade, co2, co, luminosidade, tvocs
 *   niveis.agua (bool: true = BAIXA)
 *   sensor_status.dht22, ccs811, mq07, ldr, waterlevel
 */
import { useMemo } from 'react'

const SENSOR_MAP = [
  {
    key: 'temperatura',
    label: 'Temperatura',
    unit: '°C',
    icon: '🌡️',
    statusKey: 'dht22',
    format: (v) => (v != null ? v.toFixed(1) : '—'),
    warn: (v, sp) => v != null && sp && (v < sp.tMin - 2 || v > sp.tMax + 2),
  },
  {
    key: 'umidade',
    label: 'Umidade',
    unit: '%',
    icon: '💧',
    statusKey: 'dht22',
    format: (v) => (v != null ? v.toFixed(1) : '—'),
    warn: (v, sp) => v != null && sp && (v < sp.uMin - 5 || v > sp.uMax + 5),
  },
  {
    key: 'co2',
    label: 'CO₂',
    unit: 'ppm',
    icon: '🫁',
    statusKey: 'ccs811',
    format: (v) => (v != null ? v : '—'),
    warn: (v, sp) => v != null && sp && v > sp.co2Sp,
  },
  {
    key: 'co',
    label: 'CO',
    unit: 'ppm',
    icon: '💨',
    statusKey: 'mq07',
    format: (v) => (v != null ? v : '—'),
    warn: (v, sp) => v != null && sp && v > sp.coSp,
  },
  {
    key: 'luminosidade',
    label: 'Luminosidade',
    unit: 'lux',
    icon: '☀️',
    statusKey: 'ldr',
    format: (v) => (v != null ? v : '—'),
    warn: () => false,
  },
  {
    key: 'tvocs',
    label: 'TVOCs',
    unit: 'ppb',
    icon: '🧪',
    statusKey: 'ccs811',
    format: (v) => (v != null ? v : '—'),
    warn: (v, sp) => v != null && sp && v > sp.tvocsSp,
  },
]

function sensorHealthOk(statusValue) {
  if (!statusValue) return true
  return statusValue.toUpperCase() === 'OK'
}

export default function SensorCards({ sensores = {}, niveis = {}, sensor_status = {}, setpoints = {}, atuadores = {} }) {
  const aguaBaixa = !!niveis?.agua

  return (
    <div className="sensor-grid grid">
      {SENSOR_MAP.map(({ key, label, unit, icon, statusKey, format, warn }) => {
        const value    = sensores[key]
        const healthy  = sensorHealthOk(sensor_status[statusKey])
        const isWarn   = warn(value, setpoints)

        return (
          <div
            key={key}
            className={`card sensor-card ${isWarn ? 'sensor-warn' : ''} ${!healthy ? 'sensor-error' : ''}`}
          >
            <div className="sensor-icon">{icon}</div>
            <h4>{label}</h4>
            <div className="big-number">
              {!healthy ? <span className="sensor-na">N/A</span> : format(value)}
              {healthy && value != null && <span className="sensor-unit"> {unit}</span>}
            </div>
            <span className={`status ${healthy ? 'ok' : 'bad'}`}>
              {healthy ? 'Sensor OK' : sensor_status[statusKey] ?? 'Erro'}
            </span>
            {isWarn && healthy && (
              <span className="trend-pill warming">⚠ Fora do setpoint</span>
            )}
          </div>
        )
      })}

      {/* Card de nível de água */}
      <div className={`card sensor-card ${aguaBaixa ? 'sensor-warn' : ''}`}>
        <div className="sensor-icon">🪣</div>
        <h4>Água</h4>
        <div className="big-number" style={{ fontSize: '1.4rem' }}>
          {aguaBaixa ? '⚠ BAIXA' : '✓ OK'}
        </div>
        <span className={`status ${aguaBaixa ? 'bad' : 'ok'}`}>
          {sensor_status.waterlevel === 'OK' ? 'Sensor OK' : sensor_status.waterlevel ?? 'OK'}
        </span>
      </div>

      {/* Card de LEDs (atuador visual) */}
      <div className="card sensor-card">
        <div className="sensor-icon">💡</div>
        <h4>LEDs</h4>
        <div className="big-number" style={{ fontSize: '1.4rem' }}>
          {atuadores?.leds?.ligado ? `${atuadores.leds.watts}/255` : 'Desligado'}
        </div>
        <span className={`status ${atuadores?.leds?.ligado ? 'ok' : 'neutral'}`}>
          {atuadores?.leds?.ligado ? 'Ligado' : 'Desligado'}
        </span>
      </div>
    </div>
  )
}
