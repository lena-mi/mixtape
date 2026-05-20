import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Parse MP3 duration from the first chunk of audio data + total file size.
// Handles both VBR (Xing header) and CBR (bitrate × file size).
function parseMp3Duration(data: Uint8Array, totalBytes: number): number | null {
  let offset = 0

  // Skip ID3v2 tag if present ("ID3" magic bytes)
  if (data.length > 10 && data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
    const size =
      ((data[6] & 0x7f) << 21) | ((data[7] & 0x7f) << 14) |
      ((data[8] & 0x7f) << 7)  |  (data[9] & 0x7f)
    offset = 10 + size
  }

  // Find MPEG sync word: 0xFF followed by 0xE0–0xFF
  while (offset < data.length - 4) {
    if (data[offset] === 0xff && (data[offset + 1] & 0xe0) === 0xe0) break
    offset++
  }
  if (offset >= data.length - 4) return null

  const h1 = data[offset + 1]
  const h2 = data[offset + 2]
  const h3 = data[offset + 3]

  const mpegVer    = (h1 >> 3) & 0x3  // 3=MPEG1, 2=MPEG2, 0=MPEG2.5
  const layer      = (h1 >> 1) & 0x3  // 1=Layer3 (MP3)
  const bitrateIdx = (h2 >> 4) & 0xf
  const srIdx      = (h2 >> 2) & 0x3
  const chMode     = (h3 >> 6) & 0x3  // 3=mono

  if (layer !== 1) return null // only MP3 (Layer III)

  const sampleRateTable: Record<number, number[]> = {
    3: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
    0: [11025, 12000,  8000],
  }
  const sampleRate = sampleRateTable[mpegVer]?.[srIdx] ?? 44100

  // Look for Xing / Info VBR header (appears right after side-info)
  const sideInfoSize = mpegVer === 3 ? (chMode === 3 ? 17 : 32) : (chMode === 3 ? 9 : 17)
  const xOff = offset + 4 + sideInfoSize

  if (xOff + 12 < data.length) {
    const tag = String.fromCharCode(data[xOff], data[xOff + 1], data[xOff + 2], data[xOff + 3])
    if (tag === 'Xing' || tag === 'Info') {
      const flags = (data[xOff+4] << 24) | (data[xOff+5] << 16) | (data[xOff+6] << 8) | data[xOff+7]
      if (flags & 0x1) {
        const frames = (data[xOff+8] << 24) | (data[xOff+9] << 16) | (data[xOff+10] << 8) | data[xOff+11]
        return Math.round((frames * 1152) / sampleRate)
      }
    }
  }

  // CBR fallback: file_size_bits / bitrate
  const bitrateTable: Record<number, number> = {
    1: 32000,  2: 40000,  3: 48000,  4: 56000,  5: 64000,
    6: 80000,  7: 96000,  8: 112000, 9: 128000, 10: 160000,
    11: 192000, 12: 224000, 13: 256000, 14: 320000,
  }
  const bitrate = bitrateTable[bitrateIdx]
  if (!bitrate) return null

  return Math.round((totalBytes * 8) / bitrate)
}

export const GET: RequestHandler = async ({ url }) => {
  const id = url.searchParams.get('id')
  if (!id) return json({ filename: '', duration: 0 }, { status: 400 })

  const candidates = [
    `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ]

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: {
          Range: 'bytes=0-65535',
          'User-Agent': 'Mozilla/5.0 (compatible)',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      })

      if (!res.ok && res.status !== 206) continue

      // Bail out if Google returned an HTML page (virus-scan confirmation)
      const ct = res.headers.get('content-type') ?? ''
      if (ct.includes('text/html')) continue

      // Filename from Content-Disposition
      const disposition = res.headers.get('content-disposition') ?? ''
      const fnMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\r\n]+)["']?/i)
      const filename = fnMatch
        ? decodeURIComponent(fnMatch[1].trim()).replace(/\.[^.]+$/, '')
        : ''

      // Total file size (for CBR duration calculation)
      const contentRange = res.headers.get('content-range')
      const totalBytes = contentRange
        ? parseInt(contentRange.split('/')[1] ?? '0')
        : parseInt(res.headers.get('content-length') ?? '0')

      const buffer = await res.arrayBuffer()
      const duration = parseMp3Duration(new Uint8Array(buffer), totalBytes) ?? 0

      return json({ filename, duration })
    } catch {
      // try next candidate
    }
  }

  return json({ filename: '', duration: 0 })
}
