/**
 * SensorCards.jsx
 * Cards de sensores estilo "Djamor".
 * Usa lucide-react (sem emojis), animação stagger via framer-motion,
 * e indica setpoints via trend-pill.
 */
import { motion } from 'framer-motion'
import {
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  Sun,
  FlaskConical,
  Waves,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
} from 'lucide-react'

const SENSOR_MAP = [
  {
    key: 'temperatura',
    label: 'Temperatura',
    unit: '°C',
    Icon: Thermometer,
    statusKey: 'dht22',
    format: (v) => (v != null ? v.toFixed(1) : '—'),
    warn: (v, sp) => v != null && sp && (v < sp.tMin - 2 || v > sp.tMax + 2),
  },
  {
    key: 'umidade',
    label: 'Umidade',
    unit: '%',
    Icon: Droplets,
    statusKey: 'dht22',
    format: (v) => (v != null ? v.toFixed(1) : '—'),
    warn: (v, sp) => v != null && sp && (v < sp.uMin - 5 || v > sp.uMax + 5),
  },
  {
    key: 'co2',
    label: 'CO₂',
    unit: 'ppm',
    Icon: Cloud,
    statusKey: 'ccs811',
    format: (v) => (v != null ? v : '—'),
    warn: (v, sp) => v != null && sp && v > sp.co2Sp,
  },
  {
    key: 'co',
    label: 'CO',
    unit: 'ppm',
    Icon: Wind,
    statusKey: 'mq07',
    format: (v) => (v != null ? v : '—'),
    warn: (v, sp) => v != null && sp && v > sp.coSp,
  },
  {
    key: 'luminosidade',
    label: 'Luminosidade',
    unit: 'lux',
    Icon: Sun,
    statusKey: 'ldr',
    format: (v) => (v != null ? v : '—'),
    warn: () => false,
  },
  {
    key: 'tvocs',
    label: 'TVOCs',
    unit: 'ppb',
    Icon: FlaskConical,
    statusKey: 'ccs811',
    format: (v) => (v != null ? v : '—'),
    warn: (v, sp) => v != null && sp && v > sp.tvocsSp,
  },
]

function sensorHealthOk(statusValue) {
  if (!statusValue) return true
  return statusValue.toUpperCase() === 'OK'
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.2, 0.9, 0.4, 1.05] },
  }),
}

export default function SensorCards({
  sensores = {},
  niveis = {},
  sensor_status = {},
  setpoints = {},
  atuadores = {},
}) {
  const aguaBaixa = !!niveis?.agua

  return (
    <div className="sensor-grid">
      {SENSOR_MAP.map(({ key, label, unit, Icon, statusKey, format, warn }, i) => {
        const value = sensores[key]
        const healthy = sensorHealthOk(sensor_status[statusKey])
        const isWarn = warn(value, setpoints)
        const cardClass = `card sensor-card ${isWarn ? 'warn' : ''} ${!healthy ? 'error' : ''}`

        return (
          <motion.div
            key={key}
            className={cardClass}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="sensor-top">
              <div className="sensor-icon">
                <Icon size={20} strokeWidth={1.8} />
              </div>
              {!healthy ? (
                <span className="status bad">
                  <CircleAlert size={11} /> Erro
                </span>
              ) : isWarn ? (
                <span className="trend-pill alert">
                  <AlertTriangle size={11} /> Setpoint
                </span>
              ) : (
                <span className="status ok">
                  <CheckCircle2 size={11} /> OK
                </span>
              )}
            </div>
            <h4>{label}</h4>
            <div className="big-number">
              {!healthy ? (
                <span className="sensor-na">N/A</span>
              ) : (
                <>
                  {format(value)}
                  {value != null && <span className="sensor-unit">{unit}</span>}
                </>
              )}
            </div>
          </motion.div>
        )
      })}

      <motion.div
        className={`card sensor-card ${aguaBaixa ? 'warn' : ''}`}
        custom={SENSOR_MAP.length}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="sensor-top">
          <div className="sensor-icon">
            <Waves size={20} strokeWidth={1.8} />
          </div>
          <span className={`status ${aguaBaixa ? 'bad' : 'ok'}`}>
            {aguaBaixa ? <CircleAlert size={11} /> : <CheckCircle2 size={11} />}
            {aguaBaixa ? 'Baixa' : 'OK'}
          </span>
        </div>
        <h4>Reservatório</h4>
        <div className="big-number" style={{ fontSize: '1.5rem' }}>
          {aguaBaixa ? 'BAIXA' : 'OK'}
        </div>
      </motion.div>

      <motion.div
        className="card sensor-card"
        custom={SENSOR_MAP.length + 1}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="sensor-top">
          <div className="sensor-icon">
            <Lightbulb size={20} strokeWidth={1.8} />
          </div>
          <span className={`status ${atuadores?.leds?.ligado ? 'djamor' : 'neutral'}`}>
            {atuadores?.leds?.ligado ? 'Ligado' : 'Desligado'}
          </span>
        </div>
        <h4>LEDs</h4>
        <div className="big-number" style={{ fontSize: '1.5rem' }}>
          {atuadores?.leds?.ligado ? `${atuadores.leds.watts}/255` : '—'}
        </div>
      </motion.div>
    </div>
  )
}
