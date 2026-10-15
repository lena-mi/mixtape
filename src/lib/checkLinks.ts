// Checks every track of an inserted tape so dead links show as unavailable before playback.
// It's a best guess: anything it misses is still caught by the player's error handling.

import { probeAudio } from '$lib/utils/audioUrl'
import type { PlayerTrack } from '$lib/tape'

const CONCURRENCY = 4
const AUDIO_TIMEOUT_MS = 15_000

async function isAvailable(track: PlayerTrack): Promise<boolean> {
  if (track.kind === 'youtube') {
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${track.src}&format=json`
      )
      // 4xx: removed, private or not embeddable. Anything else we can't judge, so keep the track.
      return !(res.status >= 400 && res.status < 500)
    } catch {
      return true
    }
  }

  try {
    await probeAudio(track.src, AUDIO_TIMEOUT_MS)
    return true
  } catch {
    return false
  }
}

export async function checkTracks(tracks: PlayerTrack[], onUnavailable: (index: number) => void): Promise<void> {
  const queue = tracks.map((t, i) => i).filter(i => !tracks[i].unavailable)
  const worker = async () => {
    for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
      if (!(await isAvailable(tracks[i]))) onUnavailable(i)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}
