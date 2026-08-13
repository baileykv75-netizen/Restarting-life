import { digestText, stableStringify } from '../core/stateDigest'
import type { PersistentGame } from '../types/persistence'

export const SAVE_KEY = 'restarting-life:v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface SaveEnvelope {
  schemaVersion: 1
  checksum: string
  payload: PersistentGame
}

function isPersistentGame(value: unknown): value is PersistentGame {
  if (value === null || typeof value !== 'object') return false
  const record = value as Partial<PersistentGame>
  return (
    record.schemaVersion === 1 &&
    Array.isArray(record.archives) &&
    record.meta !== undefined &&
    typeof record.meta.totalRuns === 'number'
  )
}

export function savePersistentGame(storage: StorageLike, persistent: PersistentGame): void {
  const envelope: SaveEnvelope = {
    schemaVersion: 1,
    checksum: digestText(stableStringify(persistent)),
    payload: persistent,
  }
  storage.setItem(SAVE_KEY, JSON.stringify(envelope))
}

export function loadPersistentGame(storage: StorageLike): PersistentGame | null {
  const raw = storage.getItem(SAVE_KEY)
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Save data is not valid JSON')
  }

  if (parsed === null || typeof parsed !== 'object') throw new Error('Save envelope is invalid')
  const envelope = parsed as Partial<SaveEnvelope>
  if (envelope.schemaVersion !== 1 || !isPersistentGame(envelope.payload)) {
    throw new Error('Unsupported or invalid save schema')
  }

  if (envelope.checksum !== digestText(stableStringify(envelope.payload))) {
    throw new Error('Save checksum mismatch')
  }
  return envelope.payload
}

export function deletePersistentGame(storage: StorageLike): void {
  storage.removeItem(SAVE_KEY)
}
