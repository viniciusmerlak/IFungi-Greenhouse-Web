import { useEffect, useRef } from 'react'
import { runCapturePipeline } from './capturePipeline'

/**
 * Listen for scheduled capture events from the main process and run the pipeline.
 */
export function useScheduledCaptureListener() {
  const runningRef = useRef(false)

  useEffect(() => {
    const unsub = window.electronAPI.onScheduledCapture(async () => {
      if (runningRef.current) return

      runningRef.current = true
      try {
        const config = await window.electronAPI.getConfig()
        if (!config.selectedCameras?.length) {
          console.warn('Scheduled capture skipped: no cameras configured')
          return
        }

        const result = await runCapturePipeline(config.selectedCameras)
        if (!result.success) {
          console.error('Scheduled capture failed:', result.error)
        }
      } catch (error) {
        console.error('Scheduled capture failed:', error)
      } finally {
        runningRef.current = false
      }
    })

    return () => unsub()
  }, [])
}
