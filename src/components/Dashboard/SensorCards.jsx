import { motion } from 'framer-motion'

const mapSensors = [
  ['temperatura', 'Temperatura', 'degC'],
  ['umidade', 'Umidade', '%'],
  ['co2', 'CO2', 'ppm'],
  ['co', 'CO', 'adc'],
  ['tvocs', 'TVOCs', 'ppb'],
  ['luminosidade', 'Luminosidade', 'adc'],
]

function getRelayThermalState(atuadores = {}) {
  const heatingRelay = !!atuadores?.rele1
  const coolingRelay = !!atuadores?.rele2

  if (!heatingRelay && !coolingRelay) return { label: 'Peltier desligada →', key: 'neutral' }
  if (heatingRelay && !coolingRelay) return { label: 'Resfriando ↓ (rele1 ON, rele2 OFF)', key: 'cooling' }
  if (heatingRelay && coolingRelay) return { label: 'Esquentando ↑ (rele1 + rele2 ON)', key: 'warming' }
  return { label: 'Estado invalido (rele1 OFF, rele2 ON)', key: 'mixed' }
}

export default function SensorCards({ sensores = {}, aguaBaixa = false, atuadores = {} }) {
  const trend = getRelayThermalState(atuadores)

  return (
    <div className="grid sensor-grid">
      {mapSensors.map(([key, label, unit]) => (
        <motion.div
          className="card sensor-card"
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          whileHover={{ y: -6 }}
        >
          <h4>{label}</h4>
          <p className="big-number">
            {sensores[key] ?? '--'} {unit}
          </p>
          {key === 'temperatura' ? <p className={`trend-pill ${trend.key}`}>{trend.label}</p> : null}
        </motion.div>
      ))}
      <motion.div
        className="card sensor-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        whileHover={{ y: -6 }}
      >
        <h4>Nivel de agua</h4>
        <p className={`status ${aguaBaixa ? 'bad' : 'ok'}`}>{aguaBaixa ? '💧 BAIXO' : '✅ OK'}</p>
      </motion.div>
    </div>
  )
}
