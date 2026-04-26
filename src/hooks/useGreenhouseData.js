import { useEffect, useMemo, useState } from 'react'
import { subscribeGreenhouseHistory, subscribeGreenhouseNode } from '../services/rtdb'

const defaultData = {
  sensores: {},
  atuadores: {},
  setpoints: {},
  led_schedule: {},
  operation_mode: { cycles: {} },
  ota: {},
  status: {},
  niveis: {},
  debug_mode: false,
  manual_actuators: {},
  historico: {},
}

export default function useGreenhouseData(greenhouseId) {
  const [data, setData] = useState(defaultData)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!greenhouseId) return undefined
    setLoading(true)
    const nodes = [
      'sensores',
      'atuadores',
      'setpoints',
      'led_schedule',
      'operation_mode',
      'ota',
      'status',
      'niveis',
      'debug_mode',
      'manual_actuators',
    ]

    const unsubscribers = nodes.map((node) =>
      subscribeGreenhouseNode(greenhouseId, node, (value) => {
        setData((prev) => ({ ...prev, [node]: value ?? defaultData[node] }))
        setLoading(false)
      }),
    )

    const unsubHistorico = subscribeGreenhouseHistory(greenhouseId, (value) => {
      setData((prev) => ({ ...prev, historico: value ?? {} }))
      setLoading(false)
    })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
      unsubHistorico()
    }
  }, [greenhouseId])

  const historicalArray = useMemo(() => {
    const entries = Object.values(data.historico || {}).filter(
      (item) => item && typeof item === 'object',
    )
    return entries.sort(
      (a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0),
    )
  }, [data.historico])

  return { data, historicalArray, loading }
}
