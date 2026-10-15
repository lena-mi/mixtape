// .flip tape files: "FLIP<version>:" followed by gzip-compressed JSON written as base64url.
// The encoding only hides the contents from a casual look — it is not security.
// A .flip is untrusted input, so decodeFlip validates everything it reads:
// a broken file is rejected as a whole, bad data inside it is degraded instead.

import { rewriteAudioUrl, unsupportedHostMessage } from '$lib/utils/audioUrl'
import type { PlayerTape, PlayerTrack, Side } from '$lib/tape'

const VERSION = 1
export const MAX_FILE_BYTES = 1024 * 1024
const MAX_JSON_BYTES = 5 * 1024 * 1024
const MAX_TRACKS_PER_SIDE = 50
const MAX_TITLE = 120
const MAX_DEDICATION = 500
const MAX_TRACK_TITLE = 200

export type FlipErrorCode = 'damaged' | 'newer_version' | 'too_large'

export class FlipError extends Error {
  constructor(public code: FlipErrorCode) {
    super(code)
  }
}

type FlipTrack = { side: Side; kind: 'youtube' | 'audio'; ref: string; title: string; duration: number }
type FlipPayload = {
  title: string
  dedication: string | null
  cover: { url: string; position: string | null } | null
  tracks: FlipTrack[]
}

// ---- encoding ----

export async function encodeFlip(tape: PlayerTape): Promise<string> {
  const payload: FlipPayload = {
    title: tape.title,
    dedication: tape.dedication,
    cover: tape.coverUrl ? { url: tape.coverUrl, position: tape.coverPosition } : null,
    tracks: tape.tracks.map(t => ({
      side: t.side,
      kind: t.kind,
      // Audio tracks keep the original link so they're re-resolved with current rules on load
      ref: t.kind === 'youtube' ? t.src : (t.sourceUrl ?? t.src),
      title: t.title,
      duration: Math.round(t.duration),
    })),
  }
  const compressed = await gzip(new TextEncoder().encode(JSON.stringify(payload)))
  return `FLIP${VERSION}:${toBase64Url(compressed)}`
}

export async function decodeFlip(text: string): Promise<PlayerTape> {
  if (text.length > MAX_FILE_BYTES) throw new FlipError('too_large')

  const m = text.trim().match(/^FLIP(\d{1,4}):([A-Za-z0-9_-]+)$/)
  if (!m) throw new FlipError('damaged')
  if (Number(m[1]) > VERSION) throw new FlipError('newer_version')
  if (Number(m[1]) < 1) throw new FlipError('damaged')

  let raw: unknown
  try {
    const json = await gunzip(fromBase64Url(m[2]), MAX_JSON_BYTES)
    raw = JSON.parse(new TextDecoder().decode(json))
  } catch {
    throw new FlipError('damaged')
  }
  if (!isObject(raw) || !Array.isArray(raw.tracks)) throw new FlipError('damaged')

  return {
    title: cleanText(raw.title, MAX_TITLE) || 'Untitled tape',
    dedication: cleanText(raw.dedication, MAX_DEDICATION) || null,
    ...cleanCover(raw.cover),
    tracks: cleanTracks(raw.tracks),
  }
}

// ---- validation ----

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max)
}

export function safeHttpsUrl(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 2048) return null
  try {
    const url = new URL(v.trim())
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

// cover_position is written by /create as "X% Y%", and ends up inside a style attribute
function cleanCover(v: unknown): { coverUrl: string | null; coverPosition: string | null } {
  if (!isObject(v)) return { coverUrl: null, coverPosition: null }
  const coverUrl = safeHttpsUrl(v.url)
  const pos = typeof v.position === 'string' && /^-?\d{1,3}(\.\d{1,20})?% -?\d{1,3}(\.\d{1,20})?%$/.test(v.position)
    ? v.position
    : null
  return { coverUrl, coverPosition: coverUrl ? pos : null }
}

function cleanTracks(list: unknown[]): PlayerTrack[] {
  const bySide: Record<Side, PlayerTrack[]> = { a: [], b: [] }
  for (const item of list) {
    if (!isObject(item)) continue
    const side: Side = item.side === 'b' ? 'b' : 'a'
    if (bySide[side].length >= MAX_TRACKS_PER_SIDE) continue
    bySide[side].push(cleanTrack(item, side))
  }
  return [...bySide.a, ...bySide.b]
}

function cleanTrack(item: Record<string, unknown>, side: Side): PlayerTrack {
  const title = cleanText(item.title, MAX_TRACK_TITLE) || 'Untitled track'
  const duration = typeof item.duration === 'number' && isFinite(item.duration) && item.duration > 0
    ? item.duration
    : 0
  const base = { title, side, duration }
  const unavailable = (kind: PlayerTrack['kind']): PlayerTrack =>
    ({ ...base, kind, src: '', sourceUrl: null, unavailable: true })

  if (item.kind === 'youtube') {
    if (typeof item.ref !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(item.ref)) return unavailable('youtube')
    return { ...base, kind: 'youtube', src: item.ref, sourceUrl: `https://www.youtube.com/watch?v=${item.ref}` }
  }

  if (item.kind === 'audio') {
    const link = safeHttpsUrl(item.ref)
    if (!link || unsupportedHostMessage(link)) return unavailable('audio')
    const resolved = safeHttpsUrl(rewriteAudioUrl(link).resolvedUrl)
    if (!resolved) return unavailable('audio')
    return { ...base, kind: 'audio', src: resolved, sourceUrl: link }
  }

  return unavailable('audio')
}

// ---- bytes ----

async function gzip(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

// Stops reading once the output passes `limit`, so a tiny file can't inflate into something huge
async function gunzip(bytes: Uint8Array<ArrayBuffer>, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > limit) {
      await reader.cancel()
      throw new Error('too_large')
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

function toBase64Url(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ---- saving ----

export function flipFilename(title: string): string {
  // Keeps letters in any script (e.g. Cyrillic), drops emoji and characters filesystems reject
  const base = title
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
  return `${base || 'mixtape'}.flip`
}

// Plain download: the browser's own settings decide whether a "Save as" dialog appears
export async function saveFlip(tape: PlayerTape): Promise<void> {
  const filename = flipFilename(tape.title)
  const text = await encodeFlip(tape)
  const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
