import type { SessionCommand } from '../types/command'
import type { GameSession } from '../types/persistence'
import { createGameSession, executeSessionCommand } from './sessionEngine'
import { getGameStateDigest } from './stateDigest'

export function replayCommands(
  runSeed: string,
  commands: readonly SessionCommand[],
  runId?: string,
): GameSession {
  let session = createGameSession({ runSeed, runId })

  for (const command of commands) {
    const result = executeSessionCommand(session, command)
    if (!result.applied) {
      throw new Error(
        `Replay step ${session.debugLog.length + 1} failed: ${result.reason ?? 'UNKNOWN'}`,
      )
    }
    session = result.session
  }

  return session
}

export function replaySession(session: GameSession): GameSession {
  return replayCommands(
    session.state.runSeed,
    session.debugLog.map((entry) => entry.command),
    session.state.runId,
  )
}

export function verifySessionReplay(session: GameSession): boolean {
  const replayed = replaySession(session)
  return (
    getGameStateDigest(replayed.state) === getGameStateDigest(session.state) &&
    replayed.state.rngState === session.state.rngState
  )
}
