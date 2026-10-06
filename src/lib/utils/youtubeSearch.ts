export type SearchResult = {
  videoId: string
  title: string
  channel: string
  thumbnail: string
  duration: number
}

export type SearchPage = {
  results: SearchResult[]
  nextPageToken: string | null
}

export type ResultKind = 'audio' | 'video' | 'live' | 'cover' | 'remix' | 'other'

export const RESULT_KIND_LABELS: Record<Exclude<ResultKind, 'other'>, string> = {
  audio: 'Official audio',
  video: 'Video',
  live: 'Live',
  cover: 'Cover',
  remix: 'Remix',
}

// Anything that looks like a URL goes through the link flow; everything else is a search
export function looksLikeLink(text: string): boolean {
  const t = text.trim()
  return /^https?:\/\//i.test(t) || /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+\/\S*$/i.test(t)
}

// Best-effort guess from the title and channel; order matters (a "live remix" is a remix)
export function classifyResult(r: SearchResult): ResultKind {
  const t = r.title.toLowerCase()
  if (/\bremix\b|\bedit\b|\bbootleg\b|\bmashup\b|sped ?up|slowed|nightcore|\bflip\b/.test(t)) return 'remix'
  if (/\bcover\b|\bcovered by\b/.test(t)) return 'cover'
  if (/\blive\b|\bconcert\b|\bsession\b|unplugged|\btiny desk\b|\bon stage\b/.test(t)) return 'live'
  if (/ - topic$/i.test(r.channel) || /official audio|\(audio\)|\[audio\]|lyric video|\blyrics?\b|visuali[sz]er/.test(t)) return 'audio'
  if (/official (?:music )?video|\bmusic video\b|\bmv\b|\bofficial video\b/.test(t)) return 'video'
  return 'other'
}

export async function searchYoutube(q: string, pageToken?: string): Promise<SearchPage> {
  const params = new URLSearchParams({ q })
  if (pageToken) params.set('page', pageToken)
  const res = await fetch(`/api/search?${params}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? 'Search failed. Try again, or paste a link.')
  return { results: body.results ?? [], nextPageToken: body.nextPageToken ?? null }
}
