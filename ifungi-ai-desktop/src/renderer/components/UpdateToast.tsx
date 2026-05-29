import React from 'react'
import useUpdater from '../update/useUpdater'

export const UpdateToast: React.FC = () => {
  const { state, install } = useUpdater()

  if (!state.available && !state.downloading && !state.downloaded) return null

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, background: '#111', color: '#fff', padding: 12, borderRadius: 8, zIndex: 9999 }}>
      {state.available && (
        <div>
          <div>Update available: {state.version}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => window.electronAPI.checkForUpdates()}>Download</button>
          </div>
        </div>
      )}

      {state.downloading && (
        <div>
          <div>Downloading update: {state.progress ?? 0}%</div>
        </div>
      )}

      {state.downloaded && (
        <div>
          <div>Update ready: {state.version}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={install}>Install & Restart</button>
          </div>
        </div>
      )}

      {state.error && (
        <div style={{ marginTop: 8, color: 'salmon' }}>Error: {state.error}</div>
      )}
    </div>
  )
}

export default UpdateToast
