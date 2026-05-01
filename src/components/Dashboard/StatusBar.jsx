/**
 * StatusBar.jsx — Djamor redesign.
 * Mostra status online/offline, último heartbeat, IP, e saúde dos sensores.
 */
import { Wifi, WifiOff, Clock, ShieldCheck, ShieldAlert } from 'lucide-react'

const SENSOR_NAMES = {
  dht22:      'DHT22',
  ccs811:     'CCS811',
  mq07:       'MQ-7',
  ldr:        'LDR',
  waterlevel: 'Água',
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60)   return `há ${diff}s`
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`
  return `há ${Math.floor(diff / 3600)}h`
}

export default function StatusBar({ status = {}, sensor_status = {} }) {
  const online = !!status.online

  const sensorErrors = Object.entries(SENSOR_NAMES).filter(
    ([key]) => sensor_status[key] && sensor_status[key].toUpperCase() !== 'OK',
  )

  return (
    <div className={`card status-bar ${!online ? 'warning-card' : ''}`}>
      <div className="status-bar-inner">
        <div className="status-item">
          {online ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span className={`dot ${online ? 'ok' : 'bad'}`} />
          <strong>{online ? 'Online' : 'Offline'}</strong>
          {status.ip && <span className="status-ip">{status.ip}</span>}
        </div>
        <div className="status-item">
          <Clock size={16} />
          <span>Último heartbeat</span>
          <strong>{timeAgo(status.lastHeartbeat)}</strong>
        </div>
        <div className="status-item" style={{ flexWrap: 'wrap' }}>
          {sensorErrors.length === 0 ? (
            <span className="status ok">
              <ShieldCheck size={12} /> Todos os sensores OK
            </span>
          ) : (
            sensorErrors.map(([key, name]) => (
              <span key={key} className="status bad" title={sensor_status[key]}>
                <ShieldAlert size={12} /> {name}: {sensor_status[key]}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
