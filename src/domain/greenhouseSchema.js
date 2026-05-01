const MODE_VALUES = ['manual', 'incubacao', 'frutificacao', 'secagem', 'manutencao']

const clampInt = (value, min, max, fallback) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.round(num)))
}

const clampFloat = (value, min, max, fallback) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, num))
}

export function normalizeSetpoints(input = {}) {
  return {
    tMin: clampFloat(input.tMin, 0, 60, 20),
    tMax: clampFloat(input.tMax, 0, 60, 30),
    uMin: clampFloat(input.uMin, 0, 100, 60),
    uMax: clampFloat(input.uMax, 0, 100, 80),
    coSp: clampInt(input.coSp, 0, 5000, 50),
    co2Sp: clampInt(input.co2Sp, 0, 10000, 400),
    tvocsSp: clampInt(input.tvocsSp, 0, 5000, 100),
    lux: clampInt(input.lux, 0, 4095, 5000),
  }
}

export function normalizeLedSchedule(input = {}) {
  return {
    scheduleEnabled: Boolean(input.scheduleEnabled),
    solarSimEnabled: Boolean(input.solarSimEnabled),
    onHour: clampInt(input.onHour, 0, 23, 6),
    onMinute: clampInt(input.onMinute, 0, 59, 0),
    offHour: clampInt(input.offHour, 0, 23, 20),
    offMinute: clampInt(input.offMinute, 0, 59, 0),
    intensity: clampInt(input.intensity, 0, 255, 255),
  }
}

export function isValidLedWindow(schedule) {
  const start = schedule.onHour * 60 + schedule.onMinute
  const end = schedule.offHour * 60 + schedule.offMinute
  return end > start
}

export function normalizeOperationMode(input = {}) {
  const mode = MODE_VALUES.includes(input.mode) ? input.mode : 'manual'
  return {
    mode,
    lastChanged: clampInt(input.lastChanged, 0, 2147483647, 0),
    changedBy: typeof input.changedBy === 'string' ? input.changedBy : 'esp32',
  }
}

export function normalizeManualActuators(input = {}) {
  return {
    rele1: Boolean(input.rele1),
    rele2: Boolean(input.rele2),
    rele3: Boolean(input.rele3),
    rele4: Boolean(input.rele4),
    umidificador: Boolean(input.umidificador),
    leds: {
      ligado: Boolean(input?.leds?.ligado),
      intensity: clampInt(input?.leds?.intensity, 0, 255, 0),
    },
  }
}

export function normalizeAllowedGreenhouses(input) {
  if (Array.isArray(input)) return input.filter((v) => typeof v === 'string' && v.length > 0)
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string' && v.length > 0)
      if (typeof parsed === 'string' && parsed.length > 0) return [parsed]
    } catch {
      if (input.length > 0) return [input]
    }
  }
  if (input && typeof input === 'object') {
    return Object.values(input).filter((v) => typeof v === 'string' && v.length > 0)
  }
  return []
}

export function normalizeGreenhouseState(raw = {}) {
  return {
    sensores: raw.sensores || {},
    atuadores: raw.atuadores || {},
    sensor_status: raw.sensor_status || {},
    setpoints: normalizeSetpoints(raw.setpoints || {}),
    led_schedule: normalizeLedSchedule(raw.led_schedule || {}),
    operation_mode: normalizeOperationMode(raw.operation_mode || {}),
    ota: raw.ota || {},
    status: raw.status || {},
    niveis: raw.niveis || {},
    debug_mode: Boolean(raw.debug_mode),
    manual_actuators: normalizeManualActuators(raw.manual_actuators || {}),
    logs: raw.logs || {},
  }
}

export const operationModeOptions = MODE_VALUES
