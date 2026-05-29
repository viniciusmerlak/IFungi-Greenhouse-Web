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
  thumbnails?: {
    cam1?: string
    cam2?: string
  }
  captureMeta?: {
    note?: string
    localPaths: string[]
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
