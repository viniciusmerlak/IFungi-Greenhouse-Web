import { useEffect, useMemo, useRef, useState } from 'react'
import { captureImagesFromVideoElements, submitCapturedImages } from './capturePipeline'

type BackgroundStream = {
  deviceId: string
  stream: MediaStream
}

function sameDeviceList(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

/**
 * Keeps configured camera streams warm so scheduled captures can grab an
 * already-running frame, including after Windows has locked the session.
 */
export default function ScheduledCaptureRunner() {
  const [deviceIds, setDeviceIds] = useState<string[]>([])
  const [streams, setStreams] = useState<BackgroundStream[]>([])
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const runningRef = useRef(false)

  const deviceKey = useMemo(() => deviceIds.join('|'), [deviceIds])

  useEffect(() => {
    let cancelled = false

    async function refreshConfig() {
      try {
        const config = await window.electronAPI.getConfig()
        const nextDeviceIds = Array.isArray(config.selectedCameras)
          ? config.selectedCameras.filter(Boolean).slice(0, 2)
          : []

        if (!cancelled) {
          setDeviceIds((current) => sameDeviceList(current, nextDeviceIds) ? current : nextDeviceIds)
        }
      } catch (error) {
        console.error('Failed to refresh scheduled capture config:', error)
      }
    }

    refreshConfig()
    const timer = window.setInterval(refreshConfig, 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const openedStreams: MediaStream[] = []

    async function openStreams() {
      const nextStreams: BackgroundStream[] = []

      for (const deviceId of deviceIds) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
            audio: false
          })

          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop())
            continue
          }

          openedStreams.push(stream)
          nextStreams.push({ deviceId, stream })
        } catch (error) {
          console.error(`Failed to keep scheduled camera stream open (${deviceId}):`, error)
        }
      }

      if (!cancelled) {
        setStreams(nextStreams)
      }
    }

    setStreams((current) => {
      current.forEach(({ stream }) => stream.getTracks().forEach((track) => track.stop()))
      return []
    })

    if (deviceIds.length) {
      openStreams()
    }

    return () => {
      cancelled = true
      openedStreams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()))
    }
  }, [deviceKey])

  useEffect(() => {
    streams.forEach(({ stream }, index) => {
      const video = videoRefs.current[index]
      if (!video || video.srcObject === stream) return

      video.srcObject = stream
      video.play().catch((error) => {
        console.error('Failed to start scheduled capture video element:', error)
      })
    })
  }, [streams])

  useEffect(() => {
    const unsub = window.electronAPI.onScheduledCapture(async () => {
      if (runningRef.current) return

      runningRef.current = true
      try {
        const config = await window.electronAPI.getConfig()
        const selectedCameras = Array.isArray(config.selectedCameras)
          ? config.selectedCameras.filter(Boolean).slice(0, 2)
          : []

        if (!selectedCameras.length) {
          console.warn('Scheduled capture skipped: no cameras configured')
          return
        }

        const images = await captureImagesFromVideoElements(videoRefs.current, selectedCameras)
        const result = await submitCapturedImages(
          images,
          undefined,
          config.geminiAnalysisEnabled === false,
          config.includeHistoricalImages === true
        )
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

  return (
    <div className="scheduled-camera-buffer" aria-hidden="true">
      {streams.map(({ deviceId }, index) => (
        <video
          key={deviceId}
          ref={(element) => {
            videoRefs.current[index] = element
          }}
          autoPlay
          muted
          playsInline
        />
      ))}
    </div>
  )
}
