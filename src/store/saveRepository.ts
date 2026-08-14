import { digestText, stableStringify } from '../core/stateDigest'
import type {
  LegacyPersistentGameV1,
  PersistentGame,
  TransitionalPersistentGameV2,
} from '../types/persistence'
import {
  migratePersistentGameV1ToV2,
  normalizePersistentGameV2,
} from './saveMigration'

export const SAVE_KEY = 'restarting-life:v2'
export const LEGACY_SAVE_KEY = 'restarting-life:v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface SaveEnvelopeV2 {
  schemaVersion: 2
  checksum: string
  payload: TransitionalPersistentGameV2
}

interface SaveEnvelopeV1 {
  schemaVersion: 1
  checksum: string
  payload: LegacyPersistentGameV1
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function hasValidMeta(value: unknown): value is { totalRuns: number } {
  if (!isRecord(value)) return false
  return Number.isSafeInteger(value.totalRuns) && (value.totalRuns as number) >= 0
}

function isPersistentGameV2EnvelopePayload(value: unknown): value is TransitionalPersistentGameV2 {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === 2 &&
    (value.currentSession === null || isRecord(value.currentSession)) &&
    Array.isArray(value.archives) &&
    hasValidMeta(value.meta)
  )
}

function isPersistentGameV1(value: unknown): value is LegacyPersistentGameV1 {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === 1 &&
    (value.currentSession === null || isRecord(value.currentSession)) &&
    Array.isArray(value.archives) &&
    hasValidMeta(value.meta)
  )
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error('Save data is not valid JSON')
  }
}

function verifyChecksum(payload: unknown, checksum: unknown): void {
  if (typeof checksum !== 'string' || checksum !== digestText(stableStringify(payload))) {
    throw new Error('Save checksum mismatch')
  }
}

function parseV2Save(raw: string): PersistentGame {
  const parsed = parseJson(raw)
  if (!isRecord(parsed)) throw new Error('Save envelope is invalid')

  const envelope = parsed as Partial<SaveEnvelopeV2>
  if (envelope.schemaVersion !== 2 || !isPersistentGameV2EnvelopePayload(envelope.payload)) {
    throw new Error('Unsupported or invalid save schema')
  }

  verifyChecksum(envelope.payload, envelope.checksum)
  return normalizePersistentGameV2(envelope.payload)
}

function parseV1Save(raw: string): LegacyPersistentGameV1 {
  const parsed = parseJson(raw)
  if (!isRecord(parsed)) throw new Error('Save envelope is invalid')

  const envelope = parsed as Partial<SaveEnvelopeV1>
  if (envelope.schemaVersion !== 1 || !isPersistentGameV1(envelope.payload)) {
    throw new Error('Unsupported or invalid legacy save schema')
  }

  verifyChecksum(envelope.payload, envelope.checksum)
  return envelope.payload
}

export function savePersistentGame(storage: StorageLike, persistent: PersistentGame): void {
  if (persistent.schemaVersion !== 2) {
    throw new Error('Only schemaVersion 2 can be written to the V1.2 save slot')
  }

  const envelope = {
    schemaVersion: 2 as const,
    checksum: digestText(stableStringify(persistent)),
    payload: persistent,
  }
  storage.setItem(SAVE_KEY, JSON.stringify(envelope))
}

export function loadPersistentGame(storage: StorageLike): PersistentGame | null {
  const currentRaw = storage.getItem(SAVE_KEY)
  if (currentRaw !== null) {
    const normalized = parseV2Save(currentRaw)
    // Persist normalization so Stage 1's temporary month-clock V2 payload is
    // converted once rather than reinterpreted on every future load.
    savePersistentGame(storage, normalized)
    return normalized
  }

  const legacyRaw = storage.getItem(LEGACY_SAVE_KEY)
  if (legacyRaw === null) return null

  const migrated = migratePersistentGameV1ToV2(parseV1Save(legacyRaw))
  savePersistentGame(storage, migrated)
  return migrated
}

export function deletePersistentGame(storage: StorageLike): void {
  storage.removeItem(SAVE_KEY)
  storage.removeItem(LEGACY_SAVE_KEY)
}
