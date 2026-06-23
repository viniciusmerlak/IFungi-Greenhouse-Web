import fs from 'fs/promises'
import path from 'path'
import { AISuggestion, CapturePayload } from '@shared/types'
import { configStore } from './configStore'
import { firebaseClient } from './firebaseClient'
import { geminiAnalyzer } from './geminiAnalyzer'
import { ensureFirebaseSession } from './authSession'
import { captureArchive } from './captureArchive'

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message
  const text = String(error)
  return text && text !== '[object Object]' ? text : fallback
}

function toSafeFilenamePart(value: string): string {
  return value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'camera'
}

async function imageFileToDataUrl(filepath: string): Promise<string | null> {
  try {
    const buffer = await fs.readFile(filepath)
    return `data:image/jpeg;base64,${buffer.toString('base64')}`
  } catch (error) {
    console.warn(`Failed to read historical capture image: ${filepath}`, error)
    return null
  }
}

/**
 * Orchestrates the full capture → analyze → validate → write pipeline
 */
class CaptureOrchestrator {
  private isRunning = false
  private lastRunAt: number | null = null
  private lastError: string | null = null

  private buildPreviousNote(config: { lastAiCarryOverNote?: string; carryOverNote?: string }): string | undefined {
    const parts = [
      config.lastAiCarryOverNote ? `Recado da IA anterior: ${config.lastAiCarryOverNote.trim()}` : '',
      config.carryOverNote ? `Recado manual do operador: ${config.carryOverNote.trim()}` : ''
    ].filter(Boolean)

    return parts.length ? parts.join('\n\n') : undefined
  }

  async runAnalysis(payload: CapturePayload): Promise<{ success: boolean; suggestionId?: string; error?: string }> {
    if (this.isRunning) {
      return { success: false, error: 'Capture already in progress' }
    }

    this.isRunning = true
    this.lastError = null

    const config = await configStore.getConfig()
    let localPaths: string[] = []

    try {
      const geminiEnabled = config.geminiAnalysisEnabled !== false && payload.skipGeminiAnalysis !== true

      if (!config.greenhouseId && geminiEnabled) {
        throw new Error('Greenhouse ID not configured')
      }

      const greenhouseId = config.greenhouseId || 'local-test'

      localPaths = await this.saveImagesLocally(payload)

      if (!geminiEnabled) {
        await captureArchive.addEntry({
          timestamp: payload.timestamp,
          localPaths,
          note: payload.note,
          greenhouseId,
          status: 'success'
        })

        this.lastRunAt = Date.now()
        this.lastError = 'Gemini analysis skipped; images captured locally only'

        return { success: true }
      }

      await ensureFirebaseSession()

      const [greenhouseState, sensorHistory] = await Promise.all([
        firebaseClient.getGreenhouseState(greenhouseId),
        firebaseClient.getSensorHistory(greenhouseId)
      ])
      const base64Images = payload.images.map(img => img.fullImage)
      const historicalImageLimit = Math.max(0, Math.min(Number(config.historicalImageLimit || 4), 12))
      const includeHistoricalImages = payload.includeHistoricalImages ?? config.includeHistoricalImages === true
      const historicalLocalPaths = includeHistoricalImages
        ? await captureArchive.getRecentSuccessfulImagePaths(greenhouseId, historicalImageLimit)
        : []
      const historicalImages = (await Promise.all(historicalLocalPaths.map(imageFileToDataUrl)))
        .filter((image): image is string => !!image)
      const previousNote = this.buildPreviousNote(config)
      const systemNote = historicalImages.length
        ? [
            payload.note,
            `Sistema: foram anexadas ${historicalImages.length} fotos historicas locais apos as fotos atuais. Use-as apenas como comparacao temporal; as primeiras ${base64Images.length} imagens sao da captura atual.`
          ].filter(Boolean).join('\n\n')
        : payload.note
      const analysis = await geminiAnalyzer.analyze(
        [...base64Images, ...historicalImages],
        greenhouseState,
        systemNote,
        sensorHistory,
        previousNote,
        config.aiModelId
      )

      const suggestion: AISuggestion = {
        createdAt: payload.timestamp,
        status: 'pending',
        source: 'desktop-ai',
        greenhouseId,
        rationale: analysis.rationale,
        observations: analysis.observations,
        suggested_setpoints: analysis.suggested_setpoints,
        suggested_mode: analysis.suggested_mode,
        confidence: analysis.confidence,
        risk_flags: analysis.risk_flags,
        note_for_next_run: analysis.note_for_next_run,
        previous_note: previousNote,
        thumbnails: this.extractThumbnails(payload),
        captureMeta: {
          note: payload.note,
          localPaths,
          historicalLocalPaths
        }
      }

      const suggestionId = await firebaseClient.writeAISuggestion(greenhouseId, suggestion)

      this.lastRunAt = Date.now()
      await configStore.setConfig({
        lastSuccessfulRunAt: this.lastRunAt,
        lastAiCarryOverNote: analysis.note_for_next_run
      })

      await captureArchive.addEntry({
        timestamp: payload.timestamp,
        suggestionId,
        localPaths,
        note: payload.note,
        greenhouseId,
        status: 'success'
      })

      return { success: true, suggestionId }
    } catch (error: unknown) {
      console.error('Analysis failed:', error)
      const message = getErrorMessage(error, 'Capture analysis failed')
      this.lastError = message

      if (config.greenhouseId) {
        await captureArchive.addEntry({
          timestamp: payload.timestamp,
          localPaths,
          note: payload.note,
          greenhouseId: config.greenhouseId,
          status: 'error',
          error: message
        }).catch(() => undefined)
      }

      return { success: false, error: message }
    } finally {
      this.isRunning = false
    }
  }

  private async saveImagesLocally(payload: CapturePayload): Promise<string[]> {
    const captureDir = await captureArchive.ensureDir()
    const localPaths: string[] = []

    for (const image of payload.images) {
      const timestamp = new Date(payload.timestamp).toISOString().replace(/:/g, '-').split('.')[0]
      const filename = `${timestamp}_${toSafeFilenamePart(image.deviceLabel)}.jpg`
      const filepath = path.join(captureDir, filename)

      const base64Data = image.fullImage.split(',')[1] || image.fullImage
      const buffer = Buffer.from(base64Data, 'base64')

      await fs.writeFile(filepath, buffer)
      localPaths.push(filepath)
    }

    return localPaths
  }

  private extractThumbnails(payload: CapturePayload): Record<string, string> {
    const thumbnails: Record<string, string> = {}

    payload.images.forEach((image, index) => {
      thumbnails[`cam${index + 1}`] = image.thumbnail
    })

    return thumbnails
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      lastError: this.lastError
    }
  }
}

export const captureOrchestrator = new CaptureOrchestrator()
