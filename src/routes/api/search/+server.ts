import { json } from '@sveltejs/kit'
import { env } from '$env/dynamic/private'
import type { SearchResult } from '$lib/utils/youtubeSearch'
import type { RequestHandler } from './$types'

const SIDE_LIMIT = 2700
// search.list costs the same for 1 or 50 results, so take a full page per call
const PAGE_SIZE = 25

// search.list costs 100 quota units (of 10,000/day), so identical searches are
// answered from memory and each visitor gets a limited number of fresh searches.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
type CachedPage = { results: SearchResult[]; nextPageToken: string | null; expires: number }
const cache = new Map<string, CachedPage>()

const RATE_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT = 20
const searchesByIp = new Map<string, number[]>()

function normalize(q: string): string {
  return q.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (searchesByIp.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    searchesByIp.set(ip, recent)
    return true
  }
  recent.push(now)
  searchesByIp.set(ip, recent)
  return false
}

// ISO 8601 duration, e.g. PT1H2M3S
function parseIsoDuration(iso: string): number {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return 0
  const [, d, h, min, s] = m.map(v => parseInt(v ?? '0') || 0)
  return d * 86400 + h * 3600 + min * 60 + s
}

function isQuotaError(body: any): boolean {
  return (body?.error?.errors ?? []).some((e: any) => e.reason === 'quotaExceeded' || e.reason === 'dailyLimitExceeded')
}

export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 200)
  const pageToken = (url.searchParams.get('page') ?? '').slice(0, 100)
  const normalized = normalize(q)
  if (!normalized) return json({ error: 'Type something to search for' }, { status: 400 })
  const key = `${normalized}|${pageToken}`

  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return json({ results: cached.results, nextPageToken: cached.nextPageToken })
  }

  const apiKey = env.YOUTUBE_API_KEY
  if (!apiKey) return json({ error: 'Search is not available right now. Paste a link instead.' }, { status: 503 })

  if (isRateLimited(getClientAddress())) {
    return json({ error: 'Too many searches. Try again later, or paste a link.' }, { status: 429 })
  }

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
    searchUrl.search = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q,
      maxResults: String(PAGE_SIZE),
      videoEmbeddable: 'true',
      videoSyndicated: 'true',
      key: apiKey,
      ...(pageToken ? { pageToken } : {}),
    }).toString()

    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) })
    const searchBody = await searchRes.json()
    if (!searchRes.ok) {
      if (isQuotaError(searchBody)) {
        return json({ error: 'Search is resting for today. Paste a YouTube link instead.' }, { status: 503 })
      }
      console.error('[search] search.list failed:', searchBody?.error?.message)
      return json({ error: 'Search failed. Try again, or paste a link.' }, { status: 502 })
    }

    const ids: string[] = (searchBody.items ?? []).map((i: any) => i.id?.videoId).filter(Boolean)
    const nextPageToken: string | null = searchBody.nextPageToken ?? null
    if (ids.length === 0) {
      cache.set(key, { results: [], nextPageToken: null, expires: Date.now() + CACHE_TTL_MS })
      return json({ results: [], nextPageToken: null })
    }

    // videos.list (1 unit) gives durations and unescaped titles
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
    videosUrl.search = new URLSearchParams({
      part: 'snippet,contentDetails',
      id: ids.join(','),
      key: apiKey,
    }).toString()

    const videosRes = await fetch(videosUrl, { signal: AbortSignal.timeout(10000) })
    const videosBody = await videosRes.json()
    if (!videosRes.ok) {
      console.error('[search] videos.list failed:', videosBody?.error?.message)
      return json({ error: 'Search failed. Try again, or paste a link.' }, { status: 502 })
    }

    const byId = new Map<string, any>((videosBody.items ?? []).map((v: any) => [v.id, v]))
    const results: SearchResult[] = ids
      .map(id => byId.get(id))
      .filter(Boolean)
      .map((v: any) => ({
        videoId: v.id,
        title: v.snippet.title,
        channel: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.medium?.url ?? v.snippet.thumbnails?.default?.url ?? '',
        duration: parseIsoDuration(v.contentDetails?.duration ?? ''),
      }))
      // live streams report 0; anything over a side won't fit on the tape
      .filter(r => r.duration > 0 && r.duration <= SIDE_LIMIT)

    cache.set(key, { results, nextPageToken, expires: Date.now() + CACHE_TTL_MS })
    return json({ results, nextPageToken })
  } catch (e) {
    console.error('[search] request failed:', e instanceof Error ? e.message : e)
    return json({ error: 'Search failed. Try again, or paste a link.' }, { status: 502 })
  }
}
