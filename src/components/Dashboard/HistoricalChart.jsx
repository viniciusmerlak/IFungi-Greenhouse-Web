import { useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const fields = ['temperatura', 'umidade', 'co2', 'co', 'tvocs', 'luminosidade']

function toCsv(rows, field) {
  const header = 'timestamp,dataHora,valor\n'
  const body = rows
    .map((r) => `${r.timestamp || ''},${r.dataHora || ''},${r[field] ?? ''}`)
    .join('\n')
  return header + body
}

function normalizeTimestamp(value) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  // RTDB historico comes as Unix seconds; recharts/date-fns expects milliseconds.
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric
}

export default function HistoricalChart({ data = [] }) {
  const [field, setField] = useState('temperatura')
  const [range, setRange] = useState('24h')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const normalizedData = useMemo(
    () =>
      (Array.isArray(data) ? data : []).map((item) => ({
        ...item,
        timestamp: normalizeTimestamp(item?.timestamp),
      })),
    [data],
  )

  const filtered = useMemo(() => {
    const now = new Date()
    const start =
      range === '24h'
        ? subDays(now, 1).getTime()
        : range === '7d'
          ? subDays(now, 7).getTime()
          : range === '30d'
            ? subDays(now, 30).getTime()
            : customStart
              ? new Date(customStart).getTime()
              : 0
    const end = range === 'custom' && customEnd ? new Date(customEnd).getTime() : Number.MAX_SAFE_INTEGER
    return normalizedData.filter((item) => {
      const ts = Number(item.timestamp || 0)
      return ts >= start && ts <= end
    })
  }, [customEnd, customStart, normalizedData, range])

  const downloadCsv = () => {
    const blob = new Blob([toCsv(filtered, field)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historico-${field}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card chart-shell">
      <div className="row-wrap chart-toolbar">
        <label>
          Sensor
          <select value={field} onChange={(e) => setField(e.target.value)}>
            {fields.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Periodo
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="24h">24h</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        {range === 'custom' ? (
          <>
            <label>
              Inicio
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </label>
            <label>
              Fim
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </label>
          </>
        ) : null}
        <button onClick={downloadCsv}>Exportar CSV</button>
      </div>
      <div className="chart-card">
        <ResponsiveContainer>
          <LineChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(27, 77, 46, 0.12)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => (v ? format(new Date(v), 'dd/MM HH:mm') : '--')}
              tick={{ fill: '#355746', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(27, 77, 46, 0.25)' }}
              tickLine={{ stroke: 'rgba(27, 77, 46, 0.2)' }}
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: '#355746', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(27, 77, 46, 0.25)' }}
              tickLine={{ stroke: 'rgba(27, 77, 46, 0.2)' }}
            />
            <Tooltip
              labelFormatter={(value) => (value ? format(new Date(value), 'dd/MM/yyyy HH:mm:ss') : '--')}
              formatter={(value) => [value ?? '--', field]}
              contentStyle={{
                borderRadius: 14,
                border: '1px solid rgba(45, 106, 79, 0.25)',
                background: 'rgba(255, 255, 255, 0.95)',
                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Line
              type="monotone"
              dataKey={field}
              stroke="#2d6a4f"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: '#d4af37', stroke: '#1b4d2e', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
