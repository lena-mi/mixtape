export type AudioSourceType = 'dropbox' | 'google_drive' | 'direct' | 'unknown'

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}


export type CommitHint = {
  title: string
  resolvedUrl: string
  sourceType: AudioSourceType
  duration: number
}

export function rewriteAudioUrl(url: string): { resolvedUrl: string; sourceType: AudioSourceType } {
  const t = url.trim()

  if (t.includes('dropbox.com')) {
    let resolved = t.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
    if (resolved.includes('dl=0')) {
      resolved = resolved.replace('dl=0', 'dl=1')
    } else if (!resolved.includes('dl=1')) {
      resolved += (resolved.includes('?') ? '&' : '?') + 'dl=1'
    }
    return { resolvedUrl: resolved, sourceType: 'dropbox' }
  }

  const gdMatch = t.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (gdMatch) {
    return {
      resolvedUrl: `https://drive.google.com/uc?export=download&id=${gdMatch[1]}`,
      sourceType: 'google_drive',
    }
  }

  if (/\.(mp3|wav|ogg|flac|m4a)([?#]|$)/i.test(t)) {
    return { resolvedUrl: t, sourceType: 'direct' }
  }

  return { resolvedUrl: t, sourceType: 'unknown' }
}

export function isYoutubeUrl(url: string): boolean {
  return /youtube\.com\/watch|youtu\.be\/|youtube-nocookie\.com\/embed/i.test(url)
}

export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '?:??'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const last = pathname.split('/').pop() ?? ''
    return decodeURIComponent(last.replace(/\.[^.]+$/, ''))
  } catch {
    return ''
  }
}

export function probeAudio(url: string, timeoutMs = 8000): Promise<{ duration: number }> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    let settled = false

    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      audio.src = ''
      fn()
    }

    const timer = setTimeout(() => {
      done(() => reject(new Error('timeout')))
    }, timeoutMs)

    audio.addEventListener('loadedmetadata', () => {
      const dur = audio.duration
      if (!isFinite(dur) || dur <= 0) {
        done(() => reject(new Error('invalid_duration')))
      } else {
        done(() => resolve({ duration: dur }))
      }
    }, { once: true })

    audio.addEventListener('error', () => {
      done(() => reject(new Error('load_error')))
    }, { once: true })

    audio.preload = 'metadata'
    audio.src = url
  })
}
