import { CapturedImage } from '@shared/types'

const CAPTURE_TIMEOUT_MS = 3000

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message
  const text = String(error)
  return text && text !== '[object Object]' ? text : fallback
}

async function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('Camera preview did not provide a frame in time'))
    }, CAPTURE_TIMEOUT_MS)

    const cleanup = () => {
      window.clearTimeout(timeout)
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('canplay', onReady)
      video.removeEventListener('error', onError)
    }

    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup()
        resolve()
      }
    }

    const onError = () => {
      cleanup()
      reject(new Error('Camera preview failed before capture'))
    }

    video.addEventListener('loadeddata', onReady)
    video.addEventListener('canplay', onReady)
    video.addEventListener('error', onError)
  })
}

function captureImageFromVideo(video: HTMLVideoElement, deviceId: string): CapturedImage {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Unable to create canvas context for camera capture')
  }

  ctx.drawImage(video, 0, 0)
  const fullImage = canvas.toDataURL('image/jpeg', 0.9)

  const thumbnailCanvas = document.createElement('canvas')
  const thumbnailWidth = 320
  const thumbnailHeight = (canvas.height / canvas.width) * thumbnailWidth
  thumbnailCanvas.width = thumbnailWidth
  thumbnailCanvas.height = thumbnailHeight

  const thumbnailCtx = thumbnailCanvas.getContext('2d')
  if (thumbnailCtx) {
    thumbnailCtx.drawImage(canvas, 0, 0, thumbnailWidth, thumbnailHeight)
  }

  const stream = video.srcObject instanceof MediaStream ? video.srcObject : null
  const track = stream?.getVideoTracks()[0]

  return {
    deviceId,
    deviceLabel: track?.label || deviceId,
    fullImage,
    thumbnail: thumbnailCanvas.toDataURL('image/jpeg', 0.7)
  }
}

export async function captureImagesFromDevices(deviceIds: string[]): Promise<CapturedImage[]> {
  const images: CapturedImage[] = []
  const streams: MediaStream[] = []

  try {
    for (const deviceId of deviceIds) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 1280, height: 720 }
      })
      streams.push(stream)

      const video = document.createElement('video')
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      await video.play()

      await new Promise<void>((resolve) => {
        if (video.readyState >= 2) {
          resolve()
          return
        }
        video.onloadeddata = () => resolve()
      })

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) continue

      ctx.drawImage(video, 0, 0)
      const fullImage = canvas.toDataURL('image/jpeg', 0.9)

      const thumbnailCanvas = document.createElement('canvas')
      const thumbnailWidth = 320
      const thumbnailHeight = (canvas.height / canvas.width) * thumbnailWidth
      thumbnailCanvas.width = thumbnailWidth
      thumbnailCanvas.height = thumbnailHeight

      const thumbnailCtx = thumbnailCanvas.getContext('2d')
      if (thumbnailCtx) {
        thumbnailCtx.drawImage(canvas, 0, 0, thumbnailWidth, thumbnailHeight)
      }

      const track = stream.getVideoTracks()[0]
      images.push({
        deviceId,
        deviceLabel: track?.label || deviceId,
        fullImage,
        thumbnail: thumbnailCanvas.toDataURL('image/jpeg', 0.7)
      })
    }
  } finally {
    streams.forEach((stream) => stream.getTracks().forEach((track) => track.stop()))
  }

  return images
}

export async function captureImagesFromVideoElements(
  videos: Array<HTMLVideoElement | null>,
  deviceIds: string[]
): Promise<CapturedImage[]> {
  const images: CapturedImage[] = []

  for (const [index, video] of videos.entries()) {
    const deviceId = deviceIds[index]
    if (!video || !deviceId) continue

    try {
      await waitForVideoFrame(video)
      images.push(captureImageFromVideo(video, deviceId))
    } catch (error) {
      throw new Error(getErrorMessage(error, `Failed to capture camera ${index + 1}`))
    }
  }

  return images
}

export async function submitCapturedImages(
  images: CapturedImage[],
  note?: string,
  skipGeminiAnalysis = false
): Promise<{ success: boolean; suggestionId?: string; error?: string }> {
  if (images.length === 0) {
    return { success: false, error: 'No images captured from configured cameras' }
  }

  return window.electronAPI.runCapture({
    images,
    note: note?.trim() || undefined,
    timestamp: Date.now(),
    skipGeminiAnalysis
  })
}

export async function runCapturePipeline(
  deviceIds: string[],
  note?: string
): Promise<{ success: boolean; suggestionId?: string; error?: string }> {
  return submitCapturedImages(await captureImagesFromDevices(deviceIds), note)
}
