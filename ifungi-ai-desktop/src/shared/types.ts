/**
 * Shared type definitions for IFungi AI Desktop
 */

// ============================================================================
// AI Suggestion Types
// ============================================================================

export type SuggestionStatus = 'pending' | 'approved' | 'rejected' | 'error'

export interface Setpoints {
  tMin: number
  tMax: number
  uMin: number
  uMax: number
  coSp: number
  co2Sp: number
  tvocsSp: number
  lux: number
}

export interface AISuggestion {
  createdAt: number
  status: SuggestionStatus
  source: string
  greenhouseId: string
  rationale: string
  observations?: string[]
  suggested_setpoints: Setpoints
  suggested_mode?: string
  confidence: number
  risk_flags: string[]
  /** Recado deixado por esta analise para a proxima rodada (memoria entre execucoes). */
  note_for_next_run?: string
  /** Recado recebido (oriundo da analise anterior + override do operador). */
  previous_note?: string
  thumbnails?: {
    cam1?: string
    cam2?: string
  }
  captureMeta?: {
    note?: string
    localPaths: string[]
    historicalLocalPaths?: string[]
  }
  reviewedAt?: number
  reviewAction?: 'approved' | 'rejected'
  reviewedBy?: string
  rejectReason?: string
}

export interface GeminiAnalysisResponse {
  rationale: string
  observations: string[]
  suggested_setpoints: Setpoints
  suggested_mode?: string
  confidence: number
  risk_flags: string[]
  /** Recado livre (PT-BR, max ~600 chars) para a proxima analise. */
  note_for_next_run?: string
}

// ============================================================================
// Greenhouse State Types
// ============================================================================

export interface SensorReadings {
  temperatura?: number
  humedad?: number
  umidade?: number
  co?: number
  co2?: number
  tvocs?: number
  luxes?: number
  luminosidade?: number
  timestamp?: number
  dataHora?: string
}

export type SensorHistoryEntry = SensorReadings & Record<string, unknown>

export interface GreenhouseState {
  sensores?: SensorReadings
  setpoints?: Setpoints
  operation_mode?: string | Record<string, unknown>
}

// ============================================================================
// App Configuration Types
// ============================================================================

export interface AppConfig {
  firebaseEmail?: string
  greenhouseId?: string
  selectedCameras: string[] // device IDs
  geminiAnalysisEnabled?: boolean
  dailyCaptureTime?: string // HH:mm format
  lastRunAt?: number
  lastSuccessfulRunAt?: number
  geminiQuotaBlockedUntil?: number
  /**
   * Recado manual do operador para acompanhar a proxima analise.
   * Concatenado ao recado da IA da rodada anterior.
   */
  carryOverNote?: string
  /** Ultimo recado gerado pela IA para alimentar a rodada seguinte. */
  lastAiCarryOverNote?: string
  /** Modelo Gemini usado na analise visual. */
  aiModelId?: string
  /** Inclui capturas anteriores salvas localmente como contexto visual temporal. */
  includeHistoricalImages?: boolean
  /** Quantidade maxima de fotos antigas anexadas ao prompt. */
  historicalImageLimit?: number
}

export interface SecureConfig {
  firebasePassword?: string
  geminiApiKey?: string
}

// ============================================================================
// Camera Types
// ============================================================================

export interface CameraDevice {
  deviceId: string
  label: string
  groupId: string
}

export interface CapturePayload {
  images: CapturedImage[]
  note?: string
  timestamp: number
  skipGeminiAnalysis?: boolean
  includeHistoricalImages?: boolean
}

export interface CapturedImage {
  deviceId: string
  deviceLabel: string
  fullImage: string // base64 JPEG
  thumbnail: string // base64 JPEG (smaller)
  localPath?: string
}

// ============================================================================
// Validation Constants
// ============================================================================

export const VALID_RANGES = {
  tMin: { min: 0, max: 60 },
  tMax: { min: 0, max: 60 },
  uMin: { min: 0, max: 100 },
  uMax: { min: 0, max: 100 },
  coSp: { min: 0, max: 1000 },
  co2Sp: { min: 0, max: 5000 },
  tvocsSp: { min: 0, max: 2000 },
  lux: { min: 0, max: 50000 },
  confidence: { min: 0, max: 1 }
} as const

// ============================================================================
// IPC Channel Names
// ============================================================================

export const IPC_CHANNELS = {
  // Config
  CONFIG_GET: 'config:get',
  CONFIG_SET: 'config:set',
  CONFIG_TEST_CONNECTION: 'config:test-connection',
  
  // Capture
  CAPTURE_RUN: 'capture:run',
  CAPTURE_GET_STATUS: 'capture:get-status',
  
  // History
  HISTORY_GET: 'history:get',
  HISTORY_GET_LOCAL: 'history:get-local',
  HISTORY_GET_LATEST_CARRY_OVER: 'history:get-latest-carry-over',
  
  // Scheduler
  SCHEDULER_GET_STATUS: 'scheduler:get-status',
  SCHEDULER_SET_TIME: 'scheduler:set-time',
  
  // Firebase
  FIREBASE_AUTH_STATUS: 'firebase:auth-status',
  FIREBASE_SIGN_IN: 'firebase:sign-in',
  FIREBASE_SIGN_OUT: 'firebase:sign-out',

  // Scheduler (main → renderer)
  SCHEDULER_TRIGGER_CAPTURE: 'scheduler:trigger-capture',

  // Updater
  UPDATE_CHECK: 'update:check',
  UPDATE_AVAILABLE: 'update:available',
  UPDATE_NOT_AVAILABLE: 'update:not-available',
  UPDATE_DOWNLOADED: 'update:downloaded',
  UPDATE_ERROR: 'update:error',
  UPDATE_PROGRESS: 'update:progress',
  UPDATE_INSTALL: 'update:install'
} as const

export const AI_MODEL_OPTIONS = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Melhor equilibrio gratuito/baixo custo para analise visual detalhada.'
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    description: 'Mais rapido e economico; bom para rotina diaria com menos detalhes.'
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite',
    description: 'Modelo leve mais novo; use se sua chave tiver acesso.'
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    description: 'Modelo Flash atual mais forte; pode ter limites gratuitos menores.'
  }
] as const

export const DEFAULT_AI_MODEL_ID = 'gemini-2.5-flash'
