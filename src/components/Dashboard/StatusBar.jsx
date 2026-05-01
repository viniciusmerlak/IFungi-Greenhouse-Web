/**
 * StatusBar.jsx
 * Exibe o status da estufa usando:
 *   status.online, status.lastHeartbeat, status.ip
 *   sensor_status.*
 */

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
    ([key]) => sensor_status[key] && sensor_status[key].toUpperCase() !== 'OK'
  )

  return (
    <div className={`status-bar card ${!online ? 'warning-card' : ''}`}>
      <div className="status-bar-inner">
        <div className="status-item">
          <span className={`dot ${online ? 'ok' : 'bad'}`} />
          <strong>{online ? 'Online' : 'Offline'}</strong>
          {status.ip && <span className="status-ip">{status.ip}</span>}
        </div>
        <div className="status-item">
          <span>Último heartbeat:</span>
          <strong>{timeAgo(status.lastHeartbeat)}</strong>
        </div>
        <div className="status-item">
          {sensorErrors.length === 0 ? (
            <span className="status ok">✓ Todos os sensores OK</span>
          ) : (
            sensorErrors.map(([key, name]) => (
              <span key={key} className="status bad" title={sensor_status[key]}>
                ✗ {name}: {sensor_status[key]}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
