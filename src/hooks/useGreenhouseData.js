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
    const entries = Object.values(historico || {}).filter(
      (item) => item && typeof item === 'object',
    )
    return entries.sort(
      (a, b) => Number(a?.timestamp || 0) - Number(b?.timestamp || 0),
    )
  }, [historico])

  const loading = Boolean(greenhouseId) && !(snapshotMeta.id === greenhouseId && snapshotMeta.ready)
  const error = errorState.id === greenhouseId ? errorState.message : ''

  if (!greenhouseId) {
    return { data: defaultData, historicalArray: [], loading: false, connected, error: '' }
  }

  return { data, historicalArray, loading, connected, error }
}
