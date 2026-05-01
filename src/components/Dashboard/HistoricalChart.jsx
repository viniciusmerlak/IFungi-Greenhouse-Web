import { useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LineChart as ChartIcon, Download } from 'lucide-react'

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
      <div className="card-header">
        <h3>
          <span className="header-icon">
            <ChartIcon size={16} />
          </span>
          Histórico
        </h3>
      </div>
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
        <button onClick={downloadCsv} className="ghost">
          <Download size={14} /> CSV
        </button>
      </div>
      <div className="chart-card">
        <ResponsiveContainer>
          <LineChart data={filtered}>
            <defs>
              <linearGradient id="djamorChartGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 124, 178, 0.1)" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => (v ? format(new Date(v), 'dd/MM HH:mm') : '--')}
              tick={{ fill: '#a78aa0', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255, 124, 178, 0.2)' }}
              tickLine={{ stroke: 'rgba(255, 124, 178, 0.2)' }}
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: '#a78aa0', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255, 124, 178, 0.2)' }}
              tickLine={{ stroke: 'rgba(255, 124, 178, 0.2)' }}
            />
            <Tooltip
              labelFormatter={(value) => (value ? format(new Date(value), 'dd/MM/yyyy HH:mm:ss') : '--')}
              formatter={(value) => [value ?? '--', field]}
              contentStyle={{
                borderRadius: 14,
                border: '1px solid rgba(255, 124, 178, 0.35)',
                background: 'rgba(20, 8, 24, 0.95)',
                color: '#fbeaf3',
                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.4)',
              }}
              labelStyle={{ color: '#ff85b3', fontWeight: 600 }}
            />
            <Line
              type="monotone"
              dataKey={field}
              stroke="url(#djamorChartGradient)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#ec4899', stroke: '#fbeaf3', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
