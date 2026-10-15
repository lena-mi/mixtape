// Shape the player works with, independent of where the tape came from (database or .flip file)

export type Side = 'a' | 'b'

export type PlayerTrack = {
  title: string
  side: Side
  kind: 'youtube' | 'audio'
  // YouTube video ID, or a playable audio URL
  src: string
  // Link the creator originally pasted, kept so a .flip can be re-resolved later
  sourceUrl: string | null
  duration: number
  unavailable?: boolean
}

export type PlayerTape = {
  title: string
  dedication: string | null
  coverUrl: string | null
  coverPosition: string | null
  tracks: PlayerTrack[]
}

export function tapeFromDb(tape: any, tracks: any[]): PlayerTape {
  return {
    title: tape.title ?? '',
    dedication: tape.dedication ?? null,
    coverUrl: tape.cover_url ?? null,
    coverPosition: tape.cover_position ?? null,
    tracks: tracks.map(t => ({
      title: t.title ?? '',
      side: t.side === 'b' ? 'b' : 'a',
      kind: !t.source_type || t.source_type === 'youtube' ? 'youtube' : 'audio',
      src: t.storage_path ?? '',
      sourceUrl: t.source_url ?? null,
      duration: t.duration_seconds ?? 0,
    })),
  }
}
