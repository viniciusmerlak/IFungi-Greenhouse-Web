import { ref, query, orderByChild, limitToLast, onValue, update } from 'firebase/database'
import { db } from '../firebase'
import { greenhousePath } from './rtdb'

/**
 * Subscribe to AI suggestions for a greenhouse
 */
export const subscribeAISuggestions = (greenhouseId, callback, limit = 30) => {
  if (!db) return () => {}

  const suggestionsPath = `${greenhousePath(greenhouseId)}/ai_suggestions`
  const suggestionsRef = ref(db, suggestionsPath)
  const suggestionsQuery = query(suggestionsRef, orderByChild('createdAt'), limitToLast(limit))

  return onValue(suggestionsQuery, (snapshot) => {
    if (!snapshot.exists()) {
      callback([])
      return
    }

    const suggestions = []
    snapshot.forEach((childSnapshot) => {
      suggestions.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      })
    })

    // Sort by createdAt descending (most recent first)
    suggestions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    callback(suggestions)
  })
}

/**
 * Approve an AI suggestion (write setpoints and mark approved)
 */
export const approveSuggestion = async (greenhouseId, suggestionId, suggestion, userEmail) => {
  if (!db) throw new Error('Firebase database not configured')

  const now = Date.now()

  // Batch update: setpoints + suggestion status
  const updates = {
    [`${greenhousePath(greenhouseId)}/setpoints`]: suggestion.suggested_setpoints,
    [`${greenhousePath(greenhouseId)}/ai_suggestions/${suggestionId}/status`]: 'approved',
    [`${greenhousePath(greenhouseId)}/ai_suggestions/${suggestionId}/reviewedAt`]: now,
    [`${greenhousePath(greenhouseId)}/ai_suggestions/${suggestionId}/reviewAction`]: 'approved',
    [`${greenhousePath(greenhouseId)}/ai_suggestions/${suggestionId}/reviewedBy`]: userEmail || 'unknown'
  }

  // Optionally update operation mode if suggested
  if (suggestion.suggested_mode) {
    updates[`${greenhousePath(greenhouseId)}/operation_mode`] = suggestion.suggested_mode
  }

  await update(ref(db), updates)
}

/**
 * Reject an AI suggestion
 */
export const rejectSuggestion = async (greenhouseId, suggestionId, reason, userEmail) => {
  if (!db) throw new Error('Firebase database not configured')

  const now = Date.now()

  const updates = {
    [`${greenhousePath(greenhouseId)}/ai_suggestions/${suggestionId}/status`]: 'rejected',
    [`${greenhousePath(greenhouseId)}/ai_suggestions/${suggestionId}/reviewedAt`]: now,
    [`${greenhousePath(greenhouseId)}/ai_suggestions/${suggestionId}/reviewAction`]: 'rejected',
    [`${greenhousePath(greenhouseId)}/ai_suggestions/${suggestionId}/reviewedBy`]: userEmail || 'unknown'
  }

  if (reason) {
    updates[`${greenhousePath(greenhouseId)}/ai_suggestions/${suggestionId}/rejectReason`] = reason
  }

  await update(ref(db), updates)
}
