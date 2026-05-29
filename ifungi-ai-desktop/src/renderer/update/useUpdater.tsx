import { useEffect, useState } from 'react'

type UpdateState = {
  available: boolean
  version?: string
  progress?: number
  downloading: boolean
  downloaded: boolean
  error?: string
}

export function useUpdater() {
  const [state, setState] = useState<UpdateState>({ available: false, downloading: false, downloaded: false })

  useEffect(() => {
    const unsubAvailable = window.electronAPI.onUpdateAvailable((info: any) => {
      setState((s) => ({ ...s, available: true, version: info?.version }))
    })

    const unsubNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
      setState((s) => ({ ...s, available: false }))
    })

    const unsubProgress = window.electronAPI.onUpdateProgress((progress: any) => {
      const percent = Math.round((progress.percent as number) || 0)
      setState((s) => ({ ...s, downloading: true, progress: percent }))
    })

    const unsubDownloaded = window.electronAPI.onUpdateDownloaded((info: any) => {
      setState((s) => ({ ...s, downloaded: true, downloading: false, available: false, version: info?.version }))
    })

    const unsubError = window.electronAPI.onUpdateError((err: any) => {
      setState((s) => ({ ...s, error: String(err), downloading: false }))
    })

    // initial check
    window.electronAPI.checkForUpdates().catch(() => {})

    return () => {
      unsubAvailable()
      unsubNotAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [])

  const install = async () => {
    await window.electronAPI.installUpdate()
  }

  return { state, install }
}

export default useUpdater
