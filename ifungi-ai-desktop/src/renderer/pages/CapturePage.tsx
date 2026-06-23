import { useState, useEffect, useMemo, useRef } from 'react'
import { captureImagesFromVideoElements, submitCapturedImages } from '../features/capture/capturePipeline'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message
  const text = String(error)
  return text && text !== '[object Object]' ? text : fallback
}

export default function CapturePage() {
  const [config, setConfig] = useState<any>(null)
  const [streams, setStreams] = useState<MediaStream[]>([])
  const [note, setNote] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [captureResult, setCaptureResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)
  const [captureStatus, setCaptureStatus] = useState<any>(null)
  const [runGeminiAnalysis, setRunGeminiAnalysis] = useState(false)
  const [includeHistoricalImages, setIncludeHistoricalImages] = useState(false)
  const [carryOver, setCarryOver] = useState<{ aiNote: string; operatorNote: string } | null>(null)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])

  const selectedCameraKey = useMemo(
    () => config?.selectedCameras?.join('|') || '',
    [config?.selectedCameras]
  )

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    let cancelled = false
    let activeStreams: MediaStream[] = []

    async function start() {
      if (!config?.selectedCameras?.length) {
        setStreams([])
        return
      }

      for (const deviceId of config.selectedCameras) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId }, width: 1280, height: 720 }
          })

          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop())
            continue
          }

          activeStreams.push(stream)
        } catch (error) {
          console.error('Failed to start camera preview:', error)
        }
      }

      if (!cancelled) {
        setStreams(activeStreams)
      }
    }

    start()

    return () => {
      cancelled = true
      activeStreams.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop())
      })
    }
  }, [selectedCameraKey])

  useEffect(() => {
    streams.forEach((stream, index) => {
      if (videoRefs.current[index] && videoRefs.current[index]!.srcObject !== stream) {
        videoRefs.current[index]!.srcObject = stream
      }
    })
  }, [streams])

  useEffect(() => {
    refreshMeta()
    const timer = window.setInterval(refreshMeta, 5000)
    return () => clearInterval(timer)
  }, [])

  async function refreshMeta() {
    try {
      const [sched, cap] = await Promise.all([
        window.electronAPI.getSchedulerStatus(),
        window.electronAPI.getCaptureStatus()
      ])
      setSchedulerStatus(sched)
      setCaptureStatus(cap)
      window.electronAPI.getLatestCarryOverNote().then(setCarryOver).catch(() => undefined)
    } catch {
      // ignore
    }
  }

  async function loadConfig() {
    try {
      const savedConfig = await window.electronAPI.getConfig()
      setConfig(savedConfig)
      setRunGeminiAnalysis(savedConfig?.geminiAnalysisEnabled !== false)
      setIncludeHistoricalImages(savedConfig?.includeHistoricalImages === true)
      await refreshMeta()
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  async function handleCapture() {
    if (!config?.selectedCameras?.length) {
      alert('No cameras configured')
      return
    }

    setCapturing(true)
    setCaptureResult(null)

    try {
      const images = await captureImagesFromVideoElements(videoRefs.current, config.selectedCameras)
      const result = await submitCapturedImages(images, note, !runGeminiAnalysis, includeHistoricalImages)
      setCaptureResult(result)

      if (result.success) {
        setNote('')
      } else {
        alert(`Capture failed: ${result.error || 'Unknown capture error'}`)
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Unknown capture error')
      setCaptureResult({ success: false, error: message })
      alert(`Capture failed: ${message}`)
    } finally {
      setCapturing(false)
      await refreshMeta()
    }
  }

  if (!config) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Capture</h1>
          <p>Loading configuration...</p>
        </div>
      </div>
    )
  }

  if (!config.selectedCameras || config.selectedCameras.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Capture</h1>
          <p>No cameras configured. Please go to Setup to select cameras.</p>
        </div>
      </div>
    )
  }

  const geminiDisabled = !runGeminiAnalysis

  return (
    <div className="page">
      <div className="page-header">
        <h1>Capture</h1>
        <p>
          {geminiDisabled
            ? 'Preview live feeds and test local image capture'
            : 'Preview live feeds and trigger manual AI analysis'}
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Run status</h2>
        <div className="text-small text-muted" style={{ display: 'grid', gap: '0.35rem' }}>
          <div>
            <strong>Scheduler:</strong>{' '}
            {schedulerStatus?.enabled ? `enabled @ ${schedulerStatus.scheduledTime}` : 'disabled'}
          </div>
          <div>
            <strong>Gemini analysis:</strong> {geminiDisabled ? 'skipped for this capture' : 'enabled'}
          </div>
          <div>
            <strong>Last successful run:</strong>{' '}
            {schedulerStatus?.lastRunAt ? new Date(schedulerStatus.lastRunAt).toLocaleString() : '-'}
          </div>
          <div>
            <strong>Capture pipeline:</strong> {captureStatus?.isRunning ? 'running...' : 'idle'}
            {captureStatus?.lastError ? ` (last status: ${captureStatus.lastError})` : ''}
          </div>
          {(carryOver?.aiNote || carryOver?.operatorNote) && (
            <div>
              <strong>Next AI context:</strong>{' '}
              {[carryOver.aiNote, carryOver.operatorNote].filter(Boolean).join(' / ')}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Capture details</h2>
        <label className="checkbox-row mb-2">
          <input
            type="checkbox"
            checked={runGeminiAnalysis}
            onChange={(e) => setRunGeminiAnalysis(e.target.checked)}
            disabled={config.geminiAnalysisEnabled === false}
          />
          <span>Run Gemini analysis for this capture</span>
        </label>
        <p className="text-muted text-small mb-2">
          Leave unchecked to validate camera capture only. Check it when the Gemini API key/project is ready for external API calls.
        </p>
        <label className="checkbox-row mb-2">
          <input
            type="checkbox"
            checked={includeHistoricalImages}
            onChange={(e) => setIncludeHistoricalImages(e.target.checked)}
            disabled={geminiDisabled}
          />
          <span>Include previous local photos as AI context</span>
        </label>
        <p className="text-muted text-small mb-2">
          Current photos are sent first; older captures are appended only for temporal comparison.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="capture-note">Operator note (optional)</label>
          <textarea
            id="capture-note"
            className="form-input"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={geminiDisabled
              ? 'Notes saved with the local test capture...'
              : 'Add any observations or context for the Gemini analysis...'}
            style={{ resize: 'vertical' }}
          />
          <p className="text-muted text-small mt-2">
            This text is included in the Gemini analysis prompt as image context and operator guidance.
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Live preview</h2>
        <div className="grid-2">
          {streams.map((_stream, index) => (
            <div key={index}>
              <video
                ref={(el) => {
                  videoRefs.current[index] = el
                }}
                className="video-preview"
                autoPlay
                playsInline
                muted
              />
              <p className="text-small text-muted mt-2">Camera {index + 1}</p>
            </div>
          ))}
        </div>
      </div>

      {captureResult && !captureResult.success && (
        <div className="card" style={{ background: '#f8d7da' }}>
          <p style={{ color: '#721c24', margin: 0 }}>
            Capture failed: {captureResult.error}
          </p>
        </div>
      )}

      <button
        className="btn btn-success"
        onClick={handleCapture}
        disabled={capturing || streams.length === 0}
        style={{ fontSize: '1.1rem', padding: '0.8rem 1.5rem' }}
      >
        {capturing
          ? (geminiDisabled ? 'Capturing...' : 'Capturing and analyzing...')
          : (geminiDisabled ? 'Capture test only' : 'Capture now')}
      </button>
    </div>
  )
}
