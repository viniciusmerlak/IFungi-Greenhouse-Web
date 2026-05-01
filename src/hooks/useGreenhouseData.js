import { useEffect, useMemo, useState } from 'react'
import { normalizeGreenhouseState } from '../domain/greenhouseSchema'
import { subscribeGreenhouseHistory, subscribeGreenhouseSnapshot, subscribeNode } from '../services/rtdb'

const defaultData = normalizeGreenhouseState({})

export default function useGreenhouseData(greenhouseId) {
  const [data, setData] = useState(defaultData)
  const [connected, setConnected] = useState(true)
  const [errorState, setErrorState] = useState({ id: '', message: '' })
  const [historico, setHistorico] = useState({})
  const [snapshotMeta, setSnapshotMeta] = useState({ id: '', ready: false })

  useEffect(() => {
    if (!greenhouseId) return undefined

    const unsubNode = subscribeGreenhouseSnapshot(greenhouseId, (value) => {
      try {
        setData(normalizeGreenhouseState(value || {}))
        setSnapshotMeta({ id: greenhouseId, ready: true })
      } catch (e) {
        setErrorState({ id: greenhouseId, message: e.message || 'Falha ao processar dados da estufa' })
      }
    })

    const unsubHistorico = subscribeGreenhouseHistory(greenhouseId, (value) => {
      setHistorico(value ?? {})
      setSnapshotMeta({ id: greenhouseId, ready: true })
    })

    const unsubConnected = subscribeNode('.info/connected', (value) => {
      setConnected(Boolean(value))
    })

    return () => {
      unsubNode()
      unsubHistorico()
      unsubConnected()
    }
  }, [greenhouseId])

  const historicalArray = useMemo(() => {
    const entries = Object.values(historico || {})
      .filter((item) => item && typeof item === 'object')
      .map((item) => {
        const raw = Number(item?.timestamp || 0)
        if (!Number.isFinite(raw) || raw <= 0) return null
        // RTDB historico stores Unix seconds; recharts/date-fns expect milliseconds.
        const ms = raw < 1_000_000_000_000 ? raw * 1000 : raw
        return { ...item, timestamp: ms }
      })
      .filter(Boolean)
    return entries.sort((a, b) => a.timestamp - b.timestamp)
  }, [historico])

  const loading = Boolean(greenhouseId) && !(snapshotMeta.id === greenhouseId && snapshotMeta.ready)
  const error = errorState.id === greenhouseId ? errorState.message : ''

  if (!greenhouseId) {
    return { data: defaultData, historicalArray: [], loading: false, connected, error: '' }
  }

  return { data, historicalArray, loading, connected, error }
}
