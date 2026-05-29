/**
 * Validation utilities for AI suggestions
 */

import { Setpoints, GeminiAnalysisResponse, VALID_RANGES } from './types'

/**
 * Clamp a number to a valid range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Validate and clamp setpoints to safe ranges
 */
export function validateSetpoints(setpoints: Partial<Setpoints>): Setpoints {
  return {
    tMin: clamp(setpoints.tMin ?? 18, VALID_RANGES.tMin.min, VALID_RANGES.tMin.max),
    tMax: clamp(setpoints.tMax ?? 24, VALID_RANGES.tMax.min, VALID_RANGES.tMax.max),
    uMin: clamp(setpoints.uMin ?? 80, VALID_RANGES.uMin.min, VALID_RANGES.uMin.max),
    uMax: clamp(setpoints.uMax ?? 95, VALID_RANGES.uMax.min, VALID_RANGES.uMax.max),
    coSp: clamp(setpoints.coSp ?? 50, VALID_RANGES.coSp.min, VALID_RANGES.coSp.max),
    co2Sp: clamp(setpoints.co2Sp ?? 800, VALID_RANGES.co2Sp.min, VALID_RANGES.co2Sp.max),
    tvocsSp: clamp(setpoints.tvocsSp ?? 200, VALID_RANGES.tvocsSp.min, VALID_RANGES.tvocsSp.max),
    lux: clamp(setpoints.lux ?? 1000, VALID_RANGES.lux.min, VALID_RANGES.lux.max)
  }
}

/**
 * Validate confidence score
 */
export function validateConfidence(confidence: number): number {
  return clamp(confidence, VALID_RANGES.confidence.min, VALID_RANGES.confidence.max)
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    let cleaned = value.trim()
      .replace(/°C|°|C|ppm|ppb|ppmv|lux|%/gi, '')
      .replace(/\s+/g, '')

    if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(cleaned)) {
      cleaned = cleaned.replace(/,/g, '')
    } else {
      cleaned = cleaned.replace(/,/g, '.')
    }

    const parsed = Number(cleaned)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function tryParseJson(value: unknown): unknown | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === 'string') return [item.trim()]
        if (item && typeof item === 'object') {
          const text = (item as any).text ?? (item as any).value ?? (item as any).name ?? (item as any).label
          return typeof text === 'string' ? [text.trim()] : []
        }
        return []
      })
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const parsed = tryParseJson(value)
    if (parsed !== null) {
      return parseStringArray(parsed)
    }

    const trimmed = value.trim()
    if (!trimmed) return []
    return trimmed
      .split(/[,\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function getNumericField(source: any, fieldNames: string[]): number | null {
  if (!source || typeof source !== 'object') return null
  for (const fieldName of fieldNames) {
    const raw = source[fieldName]
    const value = parseNumber(raw)
    if (value !== null) {
      return value
    }
  }

  const keys = Object.keys(source)
  const normalized = keys.reduce<Record<string, unknown>>((acc, key) => {
    acc[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = source[key]
    return acc
  }, {})

  for (const fieldName of fieldNames) {
    const normalizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '')
    const value = parseNumber(normalized[normalizedName])
    if (value !== null) {
      return value
    }
  }

  return null
}

function normalizeSetpoints(value: unknown): Setpoints | null {
  if (typeof value === 'string') {
    const parsed = tryParseJson(value)
    if (parsed !== null) {
      return normalizeSetpoints(parsed)
    }
    return null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const obj = value as Record<string, unknown>
  if ('setpoints' in obj && obj.setpoints) {
    const nested = normalizeSetpoints(obj.setpoints)
    if (nested) return nested
  }

  const tMin = getNumericField(obj, ['tMin', 't_min', 'tmin', 'temperaturemin', 'temperature_min', 'tempmin'])
  const tMax = getNumericField(obj, ['tMax', 't_max', 'tmax', 'temperaturemax', 'temperature_max', 'tempmax'])
  const uMin = getNumericField(obj, ['uMin', 'u_min', 'umin', 'humiditymin', 'humidity_min'])
  const uMax = getNumericField(obj, ['uMax', 'u_max', 'umax', 'humiditymax', 'humidity_max'])
  const coSp = getNumericField(obj, ['coSp', 'co_sp', 'cosp', 'co_sp', 'co'])
  const co2Sp = getNumericField(obj, ['co2Sp', 'co2_sp', 'co2sp', 'co2_sp', 'co2'])
  const tvocsSp = getNumericField(obj, ['tvocsSp', 'tvocs_sp', 'tvocssp', 'tvocs_sp', 'tvocs'])
  const lux = getNumericField(obj, ['lux', 'light', 'luminosity'])

  if ([tMin, tMax, uMin, uMax, coSp, co2Sp, tvocsSp, lux].some((field) => field === null)) {
    return null
  }

  return {
    tMin: tMin as number,
    tMax: tMax as number,
    uMin: uMin as number,
    uMax: uMax as number,
    coSp: coSp as number,
    co2Sp: co2Sp as number,
    tvocsSp: tvocsSp as number,
    lux: lux as number
  }
}

function resolveResponseRoot(value: unknown): any | null {
  if (Array.isArray(value)) {
    if (value.length === 1) {
      return resolveResponseRoot(value[0])
    }

    const candidate = value.find((item) => item && typeof item === 'object' && ('rationale' in item || 'suggested_setpoints' in item || 'confidence' in item))
    return candidate ? resolveResponseRoot(candidate) : null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const obj = value as Record<string, unknown>
  if ('rationale' in obj || 'suggested_setpoints' in obj || 'suggestedSetpoints' in obj || 'confidence' in obj) {
    return obj
  }

  const nestedKeys = ['response', 'analysis', 'result', 'data', 'output', 'prediction', 'predictions']
  for (const key of nestedKeys) {
    const nested = obj[key]
    const resolved = resolveResponseRoot(nested)
    if (resolved) {
      return resolved
    }
  }

  return null
}

/**
 * Validate and normalize a Gemini analysis response
 */
export function validateGeminiResponse(response: any): GeminiAnalysisResponse | null {
  try {
    const root = resolveResponseRoot(response)
    if (!root || typeof root !== 'object') {
      console.error('Gemini response root is not resolvable')
      return null
    }

    const rationale = typeof root.rationale === 'string' ? root.rationale.trim() : undefined
    if (!rationale) {
      console.error('Invalid or missing rationale')
      return null
    }

    const suggestedSetpoints = normalizeSetpoints(root.suggested_setpoints ?? root.suggestedSetpoints ?? root.suggestedSetPoints)
    if (!suggestedSetpoints) {
      console.error('Invalid or missing suggested_setpoints')
      return null
    }

    const rawConfidence = root.confidence ?? root.confidence_score ?? root.confidenceScore
    const parsedConfidence = parseNumber(rawConfidence)
    if (parsedConfidence === null) {
      console.error('Invalid or missing confidence')
      return null
    }

    let validatedConfidence: number
    if (parsedConfidence >= 0 && parsedConfidence <= 1) {
      validatedConfidence = parsedConfidence
    } else if (parsedConfidence > 1 && parsedConfidence <= 100) {
      validatedConfidence = parsedConfidence / 100
    } else {
      console.error('Confidence out of accepted range')
      return null
    }

    const observations = parseStringArray(root.observations ?? root.observations_list ?? root.observationsList)
    const risk_flags = parseStringArray(root.risk_flags ?? root.riskFlags ?? root.risk_flags_list ?? root.riskFlagsList)

    return {
      rationale,
      observations,
      suggested_setpoints: validateSetpoints(suggestedSetpoints),
      suggested_mode: typeof root.suggested_mode === 'string' ? root.suggested_mode : typeof root.suggestedMode === 'string' ? root.suggestedMode : undefined,
      confidence: validateConfidence(validatedConfidence),
      risk_flags
    }
  } catch (error) {
    console.error('Error validating Gemini response:', error)
    return null
  }
}

/**
 * Check if setpoints are significantly different (for UI diff highlighting)
 */
export function hasSignificantChange(current: number, suggested: number, threshold = 0.01): boolean {
  return Math.abs(current - suggested) > threshold
}
