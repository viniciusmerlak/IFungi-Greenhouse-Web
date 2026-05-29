import { GoogleGenAI } from '@google/genai'
import { GeminiAnalysisResponse, GreenhouseState, SensorHistoryEntry } from '@shared/types'
import { validateGeminiResponse } from '@shared/validation'
import { configStore } from './configStore'
import { getMushroomExpertPrompt } from '../prompts/mushroomExpert'

const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 65_000
const DAILY_QUOTA_COOLDOWN_MS = 12 * 60 * 60 * 1000
const GEMINI_MODEL = 'gemini-2.5-flash'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')
}

function isServiceDisabledError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)

  return (
    msg.includes('SERVICE_DISABLED') ||
    msg.includes('aiplatform.googleapis.com') && msg.includes('disabled')
  )
}

function getServiceDisabledMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  const activationMatch = msg.match(/https:\/\/console\.developers\.google\.com\/apis\/api\/generativelanguage\.googleapis\.com\/overview\?project=\d+/)
  const activationUrl = activationMatch?.[0]

  return (
    'Gemini Enterprise / Vertex AI API esta desativada para esta chave.\n' +
    (activationUrl ? `Ative a API aqui: ${activationUrl}\n` : '') +
    'Depois de ativar, aguarde alguns minutos e tente novamente. Para testar so a camera, desmarque Run Gemini analysis nesta captura.'
  )
}

function isDailyQuotaExhausted(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)

  return (
    msg.includes('GenerateRequestsPerDayPerProjectPerModel-FreeTier') ||
    msg.includes('generate_content_free_tier_requests, limit: 0')
  )
}

function extractRetryDelay(error: unknown): number {
  const msg = error instanceof Error ? error.message : String(error)
  const match = msg.match(/retryDelay["\s:]+(\d+)(?:s)?/)
  if (match) return parseInt(match[1], 10) * 1000
  return RETRY_BASE_DELAY_MS
}

function getDailyQuotaMessage(blockedUntil?: number): string {
  const retryText = blockedUntil
    ? `\nO app vai bloquear novas chamadas ate ${new Date(blockedUntil).toLocaleString('pt-BR')}, para nao consumir tentativas em loop.`
    : ''

  return (
    'Limite diario gratuito do Gemini atingido.\n' +
    'A quota e renovada automaticamente a meia-noite no horario do Pacifico, ou apos ajuste de faturamento/quota no Google AI Studio.' +
    retryText
  )
}

function appendMissingClosures(text: string): string {
  const stack: Array<'{' | '['> = []
  let inString = false
  let escaped = false

  for (const char of text) {
    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{' || char === '[') {
      stack.push(char)
    } else if (char === '}' && stack[stack.length - 1] === '{') {
      stack.pop()
    } else if (char === ']' && stack[stack.length - 1] === '[') {
      stack.pop()
    }
  }

  return text + stack.reverse().map(open => (open === '{' ? '}' : ']')).join('')
}

function findLastTopLevelChar(text: string, chars: string[]): number {
  let depth = 0
  let inString = false
  let escaped = false
  let lastPos = -1

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{' || char === '[') {
      depth += 1
    } else if (char === '}' || char === ']') {
      depth = Math.max(0, depth - 1)
    } else if (depth >= 0 && chars.includes(char)) {
      lastPos = i
    }
  }

  return lastPos
}

function trimTrailingIncompleteJson(text: string): string {
  let candidate = text.trimEnd()

  while (candidate.length > 0) {
    if (candidate.endsWith(',') || candidate.endsWith(':') || candidate.endsWith('{') || candidate.endsWith('[')) {
      candidate = candidate.slice(0, -1).trimEnd()
      continue
    }

    const lastComma = findLastTopLevelChar(candidate, [','])
    const lastBrace = findLastTopLevelChar(candidate, ['{'])
    const lastBracket = findLastTopLevelChar(candidate, ['['])
    const lastSeparator = Math.max(lastComma, lastBrace, lastBracket)

    if (lastSeparator >= 0 && lastSeparator < candidate.length - 1) {
      const trailing = candidate.slice(lastSeparator + 1).trim()
      if (trailing && !trailing.endsWith('}') && !trailing.endsWith(']')) {
        candidate = candidate.slice(0, lastSeparator).trimEnd()
        continue
      }
    }

    break
  }

  return candidate
}

function unwrapJsonObject(value: unknown): unknown {
  if (Array.isArray(value) && value.length === 1 && value[0] && typeof value[0] === 'object') {
    return value[0]
  }
  return value
}

function extractJsonObject(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  const start = cleaned.indexOf('{')
  if (start < 0) {
    throw new Error(`Resposta do Gemini nao contem JSON completo: ${cleaned.slice(0, 500)}`)
  }

  let candidate = cleaned.slice(start)

  try {
    return unwrapJsonObject(JSON.parse(candidate))
  } catch {
    const closingIndex = candidate.lastIndexOf('}')
    if (closingIndex >= 0) {
      candidate = candidate.slice(0, closingIndex + 1)
    }

    const trimmed = trimTrailingIncompleteJson(candidate)
    const repaired = appendMissingClosures(trimmed)

    try {
      return unwrapJsonObject(JSON.parse(repaired))
    } catch (repairError) {
      throw new Error(`Resposta do Gemini nao contem JSON completo: ${cleaned.slice(0, 500)}`)
    }
  }
}

async function getPersistedQuotaBlock(): Promise<number | undefined> {
  const config = await configStore.getConfig()
  return config.geminiQuotaBlockedUntil
}

/**
 * Gemini AI analyzer service with bounded retries and quota-loop protection.
 */
class GeminiAnalyzer {
  private genAI: GoogleGenAI | null = null
  private activeApiKey: string | null = null
  private quotaBlockedUntil: number | null = null

  private async getApiKey(): Promise<string> {
    const fromStore = await configStore.getSecureValue('geminiApiKey')
    const apiKey = (fromStore || import.meta.env.VITE_GEMINI_API_KEY || '').trim()

    if (!apiKey) {
      throw new Error('Chave da API Gemini nao configurada')
    }

    return apiKey
  }

  private async ensureClient(): Promise<void> {
    const apiKey = await this.getApiKey()

    if (!this.genAI || this.activeApiKey !== apiKey) {
      this.genAI = new GoogleGenAI({
        apiKey,
        enterprise: true,
        apiVersion: 'v1'
      })
      this.activeApiKey = apiKey
      this.quotaBlockedUntil = null
      await configStore.setConfig({ geminiQuotaBlockedUntil: undefined })
    }
  }

  /**
   * Analisa a estufa com imagens e dados dos sensores.
   * Retenta apenas limites por minuto; limite diario abre um cooldown local.
   */
  async analyze(
    images: string[],
    greenhouseState: GreenhouseState,
    userNote?: string,
    sensorHistory: SensorHistoryEntry[] = []
  ): Promise<GeminiAnalysisResponse> {
    const persistedQuotaBlockedUntil = await getPersistedQuotaBlock()
    const quotaBlockedUntil = this.quotaBlockedUntil || persistedQuotaBlockedUntil

    if (quotaBlockedUntil && Date.now() < quotaBlockedUntil) {
      this.quotaBlockedUntil = quotaBlockedUntil
      throw new Error(getDailyQuotaMessage(quotaBlockedUntil))
    }

    await this.ensureClient()

    if (!this.genAI) {
      throw new Error('Falha ao inicializar o cliente Gemini AI')
    }

    const prompt = getMushroomExpertPrompt(greenhouseState, userNote, sensorHistory)

    const imageParts = images.map((base64) => ({
      inlineData: {
        data: base64.split(',')[1] || base64,
        mimeType: 'image/jpeg'
      }
    }))

    let lastError: unknown

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.genAI.models.generateContent({
          model: GEMINI_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                ...imageParts
              ]
            }
          ],
          config: {
            temperature: 0.4,
            topP: 0.8,
            topK: 40,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json'
          }
        })
        const text = result.text || ''

        let parsedResponse: unknown
        try {
          parsedResponse = extractJsonObject(text)
        } catch {
          throw new Error(`Falha ao interpretar resposta do Gemini: ${text}`)
        }

        const validated = validateGeminiResponse(parsedResponse)
        if (!validated) {
          throw new Error('Resposta do Gemini invalida')
        }

        return validated
      } catch (error: unknown) {
        lastError = error

        if (isServiceDisabledError(error)) {
          throw new Error(getServiceDisabledMessage(error))
        }

        if (!isQuotaError(error)) {
          throw error
        }

        if (isDailyQuotaExhausted(error)) {
          this.quotaBlockedUntil = Date.now() + DAILY_QUOTA_COOLDOWN_MS
          await configStore.setConfig({ geminiQuotaBlockedUntil: this.quotaBlockedUntil })
          throw new Error(getDailyQuotaMessage(this.quotaBlockedUntil))
        }

        if (attempt < MAX_RETRIES) {
          const delay = extractRetryDelay(error)
          console.warn(`Quota por minuto atingida. Tentativa ${attempt}/${MAX_RETRIES}. Aguardando ${delay / 1000}s...`)
          await sleep(delay)
        }
      }
    }

    throw new Error(
      `Falha apos ${MAX_RETRIES} tentativas por limite de quota do Gemini.\n` +
      `Detalhes: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    )
  }
}

export const geminiAnalyzer = new GeminiAnalyzer()
