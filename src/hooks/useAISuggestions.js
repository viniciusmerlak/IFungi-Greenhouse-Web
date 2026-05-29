import { useEffect, useState } from 'react'
import { subscribeAISuggestions } from '../services/aiSuggestions'

/**
 * Hook to subscribe to AI suggestions for a greenhouse
 */
export default function useAISuggestions(greenhouseId, limit = 30) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!greenhouseId) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const unsubscribe = subscribeAISuggestions(greenhouseId, (data) => {
        setSuggestions(data)
        setLoading(false)
      }, limit)

      return () => {
        unsubscribe()
      }
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [greenhouseId, limit])

  // Split latest pending from history (all other items from the capped list)
  const latestPending = suggestions.find(s => s.status === 'pending')
  const history = latestPending
    ? suggestions.filter(s => s.id !== latestPending.id)
    : suggestions

  return {
    suggestions,
    latestPending,
    history,
    loading,
    error
  }
}
