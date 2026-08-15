import { digestText, stableStringify } from '../core/stateDigest'
import type { BirthCandidate, PendingBirthSelection } from '../types/birth'
import type {
  LegacyPersistentGameV1,
  NormalizedPersistentGameV2,
  PersistentGame,
  PersistentPhase,
  TransitionalPersistentGameV2,
  TransitionalPersistentGameV3,
} from '../types/persistence'
import {
  migratePersistentGameV1ToV2,
  migratePersistentGameV2ToV3,
  normalizePersistentGameV2,
  normalizePersistentGameV3,
} from './saveMigration'

export const SAVE_KEY = 'restarting-life:v3'
export const V2_SAVE_KEY = 'restarting-life:v2'
export const LEGACY_SAVE_KEY = 'restarting-life:v1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface SaveEnvelopeV3 { schemaVersion: 3; checksum: string; payload: TransitionalPersistentGameV3 }
interface SaveEnvelopeV2 { schemaVersion: 2; checksum: string; payload: TransitionalPersistentGameV2 }
interface SaveEnvelopeV1 { schemaVersion: 1; checksum: string; payload: LegacyPersistentGameV1 }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function hasValidMeta(value: unknown): value is { totalRuns: number } {
  return isRecord(value) && Number.isSafeInteger(value.totalRuns) && (value.totalRuns as number) >= 0
}

function isPersistentPhase(value: unknown): value is PersistentPhase {
  return value === 'birth-selection' || value === 'life' || value === 'ended'
}

function isFiniteStatBlock(value: unknown): boolean {
  if (!isRecord(value)) return false
  return ['constitution', 'comprehension', 'spiritSense', 'mentality', 'luck'].every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))
}

function isBirthCandidate(value: unknown): value is BirthCandidate {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && Number.isInteger(value.index) && typeof value.name === 'string' &&
    typeof value.backgroundId === 'string' && typeof value.spiritRootId === 'string' && typeof value.physiqueId === 'string' &&
    Array.isArray(value.talentIds) && value.talentIds.every((id) => typeof id === 'string') && isFiniteStatBlock(value.stats) &&
    Number.isSafeInteger(value.spiritStones) && (value.spiritStones as number) >= 0
}

function isPendingBirthSelection(value: unknown): value is PendingBirthSelection {
  if (!isRecord(value)) return false
  return typeof value.runSeed === 'string' && value.runSeed.trim().length > 0 && typeof value.runId === 'string' &&
    Array.isArray(value.candidates) && value.candidates.length === 3 && value.candidates.every(isBirthCandidate) &&
    Number.isSafeInteger(value.nextRngState) && (value.nextRngState as number) >= 0
}

function isPersistentGameV3(value: unknown): value is TransitionalPersistentGameV3 {
  if (!isRecord(value)) return false
  const pending = value.pendingBirthSelection
  return value.schemaVersion === 3 && isPersistentPhase(value.phase) &&
    (value.currentSession === null || isRecord(value.currentSession)) &&
    (pending === undefined || pending === null || isPendingBirthSelection(pending)) &&
    Array.isArray(value.archives) && hasValidMeta(value.meta)
}

function isPersistentGameV2EnvelopePayload(value: unknown): value is TransitionalPersistentGameV2 {
  return isRecord(value) && value.schemaVersion === 2 && (value.currentSession === null || isRecord(value.currentSession)) && Array.isArray(value.archives) && hasValidMeta(value.meta)
}

function isPersistentGameV1(value: unknown): value is LegacyPersistentGameV1 {
  return isRecord(value) && value.schemaVersion === 1 && (value.currentSession === null || isRecord(value.currentSession)) && Array.isArray(value.archives) && hasValidMeta(value.meta)
}

function parseJson(raw: string): unknown {
  try { return JSON.parse(raw) } catch { throw new Error('Save data is not valid JSON') }
}

function verifyChecksum(payload: unknown, checksum: unknown): void {
  if (typeof checksum !== 'string' || checksum !== digestText(stableStringify(payload))) throw new Error('Save checksum mismatch')
}

function clonePendingBirthSelection(pending: PendingBirthSelection | null): PendingBirthSelection | null {
  if (pending === null) return null
  return {
    ...pending,
    candidates: pending.candidates.map((candidate) => ({ ...candidate, talentIds: [...candidate.talentIds], stats: { ...candidate.stats } })),
  }
}

function cloneLoadedRuntimeState(persistent: PersistentGame): PersistentGame {
  const session = persistent.currentSession
  if (!session) return persistent
  const exploration = session.state.exploration
  const sublocations = session.state.sublocations
  const secretRealm = session.state.secretRealm
  const inventory = session.state.inventory
  const equipment = session.state.equipment
  const knownTechniqueIds = session.state.cultivation.knownTechniqueIds
  const auxiliaryTechniqueIds = session.state.cultivation.auxiliaryTechniqueIds
  const techniquePractice = session.state.cultivation.techniquePractice
  const hasCultivationRuntime = Boolean(knownTechniqueIds || auxiliaryTechniqueIds || techniquePractice)
  if (!exploration && !sublocations && !secretRealm && !inventory && !equipment && !hasCultivationRuntime) return persistent

  return {
    ...persistent,
    currentSession: {
      ...session,
      state: {
        ...session.state,
        ...(exploration
          ? {
              exploration: {
                locations: Object.fromEntries(
                  Object.entries(exploration.locations).map(([id, progress]) => [id, { ...progress }]),
                ),
              },
            }
          : {}),
        ...(sublocations
          ? {
              sublocations: {
                generated: Object.fromEntries(
                  Object.entries(sublocations.generated).map(([id, runtime]) => [id, { ...runtime }]),
                ),
              },
            }
          : {}),
        ...(secretRealm
          ? {
              secretRealm: {
                sunkenVeinChamber: {
                  ...secretRealm.sunkenVeinChamber,
                  nodeClaims: { ...secretRealm.sunkenVeinChamber.nodeClaims },
                  knowledge: { ...secretRealm.sunkenVeinChamber.knowledge },
                  pendingMaterials: { ...secretRealm.sunkenVeinChamber.pendingMaterials },
                  rewards: {
                    ...secretRealm.sunkenVeinChamber.rewards,
                    herbBed: { ...secretRealm.sunkenVeinChamber.rewards.herbBed },
                    sideRoom: { ...secretRealm.sunkenVeinChamber.rewards.sideRoom },
                    core: { ...secretRealm.sunkenVeinChamber.rewards.core },
                  },
                },
              },
            }
          : {}),
        ...(inventory
          ? {
              inventory: {
                ...inventory,
                stacks: Object.fromEntries(
                  Object.entries(inventory.stacks).map(([id, stack]) => [id, { ...stack }]),
                ),
              },
            }
          : {}),
        ...(equipment ? { equipment: { ...equipment } } : {}),
        ...(hasCultivationRuntime
          ? {
              cultivation: {
                ...session.state.cultivation,
                ...(knownTechniqueIds ? { knownTechniqueIds: [...knownTechniqueIds] } : {}),
                ...(auxiliaryTechniqueIds ? { auxiliaryTechniqueIds: [...auxiliaryTechniqueIds] } : {}),
                ...(techniquePractice
                  ? {
                      techniquePractice: Object.fromEntries(
                        Object.entries(techniquePractice).map(([id, practice]) => [id, { ...practice }]),
                      ),
                    }
                  : {}),
              },
            }
          : {}),
      },
    },
  }
}

function parseV3Save(raw: string): PersistentGame {
  const parsed = parseJson(raw)
  if (!isRecord(parsed)) throw new Error('Save envelope is invalid')
  const envelope = parsed as Partial<SaveEnvelopeV3>
  if (envelope.schemaVersion !== 3 || !isPersistentGameV3(envelope.payload)) throw new Error('Unsupported or invalid save schema')
  verifyChecksum(envelope.payload, envelope.checksum)
  const normalized = cloneLoadedRuntimeState(normalizePersistentGameV3(envelope.payload))
  if (envelope.payload.pendingBirthSelection === undefined) return normalized
  return { ...normalized, pendingBirthSelection: clonePendingBirthSelection(envelope.payload.pendingBirthSelection) }
}

function parseV2Save(raw: string): NormalizedPersistentGameV2 {
  const parsed = parseJson(raw)
  if (!isRecord(parsed)) throw new Error('Save envelope is invalid')
  const envelope = parsed as Partial<SaveEnvelopeV2>
  if (envelope.schemaVersion !== 2 || !isPersistentGameV2EnvelopePayload(envelope.payload)) throw new Error('Unsupported or invalid V2 save schema')
  verifyChecksum(envelope.payload, envelope.checksum)
  return normalizePersistentGameV2(envelope.payload)
}

function parseV1Save(raw: string): LegacyPersistentGameV1 {
  const parsed = parseJson(raw)
  if (!isRecord(parsed)) throw new Error('Save envelope is invalid')
  const envelope = parsed as Partial<SaveEnvelopeV1>
  if (envelope.schemaVersion !== 1 || !isPersistentGameV1(envelope.payload)) throw new Error('Unsupported or invalid legacy save schema')
  verifyChecksum(envelope.payload, envelope.checksum)
  return envelope.payload
}

export function savePersistentGame(storage: StorageLike, persistent: PersistentGame): void {
  if (persistent.schemaVersion !== 3) throw new Error('Only schemaVersion 3 can be written to the V3 save slot')
  const envelope = { schemaVersion: 3 as const, checksum: digestText(stableStringify(persistent)), payload: persistent }
  storage.setItem(SAVE_KEY, JSON.stringify(envelope))
}

export function loadPersistentGame(storage: StorageLike): PersistentGame | null {
  const currentRaw = storage.getItem(SAVE_KEY)
  if (currentRaw !== null) {
    const normalized = parseV3Save(currentRaw)
    savePersistentGame(storage, normalized)
    return normalized
  }
  const v2Raw = storage.getItem(V2_SAVE_KEY)
  if (v2Raw !== null) {
    const migrated = migratePersistentGameV2ToV3(parseV2Save(v2Raw))
    savePersistentGame(storage, migrated)
    return migrated
  }
  const legacyRaw = storage.getItem(LEGACY_SAVE_KEY)
  if (legacyRaw === null) return null
  const migratedV2 = migratePersistentGameV1ToV2(parseV1Save(legacyRaw))
  const migratedV3 = migratePersistentGameV2ToV3(migratedV2)
  savePersistentGame(storage, migratedV3)
  return migratedV3
}

export function deletePersistentGame(storage: StorageLike): void {
  storage.removeItem(SAVE_KEY)
  storage.removeItem(V2_SAVE_KEY)
  storage.removeItem(LEGACY_SAVE_KEY)
}
