export type AudioSourceType = 'dropbox' | 'google_drive' | 'onedrive' | 'direct' | 'unknown'

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

// Matches drive.google.com/file/d/ID, drive.google.com/open?id=ID, drive.google.com/uc?id=ID,
// docs.google.com/uc?id=ID and drive.usercontent.google.com/download?id=ID
export function extractGoogleDriveId(url: string): string | null {
  const t = url.trim()
  if (!/(?:drive|docs)\.google\.com|drive\.usercontent\.google\.com/i.test(t)) return null
  const m = t.match(/\/file\/d\/([^/?#]+)/) ?? t.match(/[?&]id=([^&#]+)/)
  return m ? m[1] : null
}

export function googleDriveStreamUrl(id: string): string {
  // confirm=t skips the "can't scan for viruses" interstitial on large files
  return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`
}

function base64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-')
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

  const gdId = extractGoogleDriveId(t)
  if (gdId) {
    return { resolvedUrl: googleDriveStreamUrl(gdId), sourceType: 'google_drive' }
  }

  // OneDrive for work/school (SharePoint) share links honour download=1
  if (/\.sharepoint\.com\//i.test(t)) {
    const resolved = /[?&]download=1/.test(t) ? t : t + (t.includes('?') ? '&' : '?') + 'download=1'
    return { resolvedUrl: resolved, sourceType: 'onedrive' }
  }

  // Personal OneDrive share links go through the shares API, which redirects to the file
  if (/^https?:\/\/(?:1drv\.ms|onedrive\.live\.com)\//i.test(t)) {
    return {
      resolvedUrl: `https://api.onedrive.com/v1.0/shares/u!${base64Url(t)}/root/content`,
      sourceType: 'onedrive',
    }
  }

  if (/\.(mp3|wav|ogg|flac|m4a)([?#]|$)/i.test(t)) {
    return { resolvedUrl: t, sourceType: 'direct' }
  }

  return { resolvedUrl: t, sourceType: 'unknown' }
}

// Hosts whose links are web pages/apps, not audio files — we can't play them
const UNSUPPORTED_HOSTS: { pattern: RegExp; message: string }[] = [
  {
    pattern: /(?:^|\.)icloud\.com$/i,
    message: "iCloud links can't be played directly. Share the file via Google Drive or Dropbox instead.",
  },
  {
    pattern: /(?:^|\.)(?:spotify\.com|spotify\.link)$/i,
    message: "Spotify links can't be played here. Try the same song on YouTube.",
  },
  {
    pattern: /(?:^|\.)music\.apple\.com$/i,
    message: "Apple Music links can't be played here. Try the same song on YouTube.",
  },
  {
    pattern: /(?:^|\.)(?:soundcloud\.com|on\.soundcloud\.com)$/i,
    message: "SoundCloud links can't be played here. Try YouTube, or a Google Drive/Dropbox file.",
  },
  {
    pattern: /(?:^|\.)bandcamp\.com$/i,
    message: "Bandcamp pages can't be played here. Try YouTube, or a Google Drive/Dropbox file.",
  },
  {
    pattern: /(?:^|\.)(?:tidal\.com|deezer\.com|deezer\.page\.link)$/i,
    message: "Streaming service links can't be played here. Try the same song on YouTube.",
  },
]

export function unsupportedHostMessage(url: string): string | null {
  let host: string
  try {
    host = new URL(url.trim()).hostname
  } catch {
    return null
  }
  return UNSUPPORTED_HOSTS.find(h => h.pattern.test(host))?.message ?? null
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
