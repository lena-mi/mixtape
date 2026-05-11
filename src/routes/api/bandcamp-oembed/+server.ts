import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url }) => {
  const bandcampUrl = url.searchParams.get('url')

  function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    }

  if (!bandcampUrl) {
    return json({ error: 'No URL provided' }, { status: 400 })
  }

  const response = await fetch(bandcampUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  if (!response.ok) {
    return json({ error: 'Could not fetch page' }, { status: 400 })
  }

  const html = await response.text()

  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/)
  const artistMatch = html.match(/<meta property="og:site_name" content="([^"]+)"/)

  const rawTitle = titleMatch?.[1] ?? 'Untitled'

  // og:title is usually "Track Name, by Artist" — split both parts
  const titleParts = rawTitle.split(', by ')
  const title = titleParts[0].trim()
  const artistFromTitle = titleParts[1]?.trim() ?? ''

  // Prefer artist from title, fall back to site name (which is often the label)
  const artist = artistFromTitle || (artistMatch?.[1] ?? '')

  return json({ 
    title: decodeHtmlEntities(title), 
    artist: decodeHtmlEntities(artist) 
    })
}