import { useState, useEffect } from 'react'

export default function SetupPage() {
  const [config, setConfig] = useState({
    geminiApiKey: '',
    firebaseEmail: '',
    firebasePassword: '',
    greenhouseId: '',
    selectedCameras: [] as string[],
    geminiAnalysisEnabled: true,
    dailyCaptureTime: '09:00'
  })
  const [savedFlags, setSavedFlags] = useState({ hasGeminiApiKey: false, hasFirebasePassword: false })
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)

  useEffect(() => {
    loadConfig()
    enumerateCameras()
  }, [])

  async function loadConfig() {
    try {
      const savedConfig = await window.electronAPI.getConfig()
      const { hasGeminiApiKey, hasFirebasePassword, ...rest } = savedConfig
      setSavedFlags({ hasGeminiApiKey: !!hasGeminiApiKey, hasFirebasePassword: !!hasFirebasePassword })
      setConfig((prev) => ({
        ...prev,
        ...rest,
        geminiApiKey: '',
        firebasePassword: ''
      }))
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  async function enumerateCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter((d) => d.kind === 'videoinput')
      setCameras(videoDevices)
    } catch (error) {
      console.error('Failed to enumerate cameras:', error)
    }
  }

  async function requestCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((t) => t.stop())
      await enumerateCameras()
    } catch (error) {
      console.error('Camera permission denied:', error)
      alert('Camera permission is required to list device labels reliably.')
    }
  }

  async function handleSave() {
    setLoading(true)
    setTestResult(null)

    try {
      const payload: Record<string, unknown> = {
        firebaseEmail: config.firebaseEmail,
        greenhouseId: config.greenhouseId,
        selectedCameras: config.selectedCameras,
        geminiAnalysisEnabled: config.geminiAnalysisEnabled,
        dailyCaptureTime: config.dailyCaptureTime || undefined
      }

      if (config.geminiApiKey.trim()) {
        payload.geminiApiKey = config.geminiApiKey.trim()
      }

      if (config.firebasePassword.trim()) {
        payload.firebasePassword = config.firebasePassword.trim()
      }

      await window.electronAPI.setConfig(payload)
      if (config.dailyCaptureTime) {
        await window.electronAPI.setScheduleTime(config.dailyCaptureTime)
      }

      await loadConfig()
      alert('Configuration saved successfully')
    } catch (error: any) {
      alert(`Failed to save configuration: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleTestConnection() {
    setLoading(true)
    setTestResult(null)

    try {
      const result = await window.electronAPI.testConnection()
      setTestResult(result)
    } catch (error: any) {
      setTestResult({ success: false, error: error.message })
    } finally {
      setLoading(false)
    }
  }

  function toggleCamera(deviceId: string) {
    setConfig((prev) => {
      const selected = prev.selectedCameras.includes(deviceId)
        ? prev.selectedCameras.filter((id) => id !== deviceId)
        : [...prev.selectedCameras, deviceId].slice(0, 2)

      return { ...prev, selectedCameras: selected }
    })
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Setup</h1>
        <p>Configure your AI agent, Firebase credentials, and capture devices</p>
      </div>

      <div className="card">
        <h2 className="card-title">Gemini API Key</h2>
        <div className="form-group">
          <label
            className="form-label"
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              checked={config.geminiAnalysisEnabled}
              onChange={(e) => setConfig({ ...config, geminiAnalysisEnabled: e.target.checked })}
            />
            Enable Gemini analysis
          </label>
          <p className="text-muted text-small mt-2">
            Turn this off for camera/capture tests without calling the Gemini API.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label">
            Gemini API Key
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}
            >
              (Get API key)
            </a>
          </label>
          <input
            type="password"
            className="form-input"
            value={config.geminiApiKey}
            onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
            placeholder={savedFlags.hasGeminiApiKey ? '•••••••• (saved — leave blank to keep)' : 'Enter your Gemini API key'}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Firebase Configuration</h2>
        <div className="form-group">
          <label className="form-label">Firebase Email</label>
          <input
            type="email"
            className="form-input"
            value={config.firebaseEmail}
            onChange={(e) => setConfig({ ...config, firebaseEmail: e.target.value })}
            placeholder="your-email@example.com"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Firebase Password</label>
          <input
            type="password"
            className="form-input"
            value={config.firebasePassword}
            onChange={(e) => setConfig({ ...config, firebasePassword: e.target.value })}
            placeholder={savedFlags.hasFirebasePassword ? '•••••••• (saved — leave blank to keep)' : 'Enter your Firebase password'}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Greenhouse ID</label>
          <input
            type="text"
            className="form-input"
            value={config.greenhouseId}
            onChange={(e) => setConfig({ ...config, greenhouseId: e.target.value })}
            placeholder="e.g., greenhouse-001"
          />
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Camera Selection</h2>
        <p className="text-muted text-small mb-2">
          Select 1–2 webcams. If labels show as “Camera …”, grant permission once so the browser can reveal device names.
        </p>
        <div className="flex gap-2 mb-2">
          <button type="button" className="btn btn-secondary" onClick={requestCameraPermission}>
            Grant camera permission
          </button>
          <button type="button" className="btn btn-secondary" onClick={enumerateCameras}>
            Refresh device list
          </button>
        </div>
        {cameras.length === 0 && (
          <p className="text-muted text-small">No cameras detected. Please connect a webcam and refresh.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {cameras.map((camera) => (
            <label
              key={camera.deviceId}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                background: config.selectedCameras.includes(camera.deviceId) ? '#e3f2fd' : '#fff'
              }}
            >
              <input
                type="checkbox"
                checked={config.selectedCameras.includes(camera.deviceId)}
                onChange={() => toggleCamera(camera.deviceId)}
                disabled={!config.selectedCameras.includes(camera.deviceId) && config.selectedCameras.length >= 2}
                style={{ marginRight: '0.75rem' }}
              />
              <span>{camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Schedule Configuration</h2>
        <div className="form-group">
          <label className="form-label">Daily capture time</label>
          <div className="flex gap-2">
            <input
              type="time"
              className="form-input"
              value={config.dailyCaptureTime}
              onChange={(e) => setConfig({ ...config, dailyCaptureTime: e.target.value })}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfig({ ...config, dailyCaptureTime: '' })}
            >
              Disable
            </button>
          </div>
          <p className="text-muted text-small mt-2">
            Leave empty to disable scheduled captures.
            When the app is open, a scheduled run fires once per day near this time if it has not succeeded yet today.
            Manual captures always work from the Capture page.
          </p>
        </div>
      </div>

      {testResult && (
        <div className="card" style={{ background: testResult.success ? '#d4edda' : '#f8d7da' }}>
          <p style={{ color: testResult.success ? '#155724' : '#721c24', margin: 0 }}>
            {testResult.success ? '✓ Connection successful!' : `✗ Connection failed: ${testResult.error}`}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save configuration'}
        </button>
        <button className="btn btn-secondary" onClick={handleTestConnection} disabled={loading}>
          {loading ? 'Testing...' : 'Test Firebase connection'}
        </button>
      </div>
    </div>
  )
}
