<script lang="ts">
  import type { PageData } from './$types'
  import { invalidateAll } from '$app/navigation'
  import TrackInput from '$lib/components/TrackInput.svelte'

  let { data }: { data: PageData } = $props()

  type Slot = {
    key: number
    trackId?: string
    savedTitle?: string
    savedArtist?: string
  }

  // Plain init — slots are independent UI state managed from here on;
  // data.tracks only informs the initial render.
  const initialTracks = data.tracks
  let keySeq = initialTracks.length + 1

  let slots = $state<Slot[]>([
    ...initialTracks.map((t, i) => ({
      key: i + 1,
      trackId: t.id,
      savedTitle: t.title,
      savedArtist: t.artist ?? '',
    })),
    { key: keySeq++ },
  ])

  function extractVideoId(url: string): string | null {
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

  async function handleCommit(slotKey: number, url: string): Promise<{ title: string; artist: string }> {
    const videoId = extractVideoId(url)
    if (!videoId) throw new Error('Invalid YouTube URL')

    // Auto-parse title/artist from YouTube oEmbed (no API key needed)
    let title = ''
    let artist = ''
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      )
      if (res.ok) {
        const oembed = await res.json()
        const videoTitle = oembed.title as string
        const sep = videoTitle.indexOf(' - ')
        if (sep !== -1) {
          artist = videoTitle.slice(0, sep).trim()
          title = videoTitle.slice(sep + 3).trim()
        } else {
          title = videoTitle
          artist = (oembed.author_name as string) ?? ''
        }
      }
    } catch { /* oEmbed failed — fall through to videoId fallback */ }

    if (!title) title = videoId

    // Persist to DB
    const formData = new FormData()
    formData.append('youtube_id', videoId)
    formData.append('youtube_url', `https://www.youtube.com/watch?v=${videoId}`)
    formData.append('title', title)
    formData.append('artist', artist)

    const response = await fetch('?/addTrack', { method: 'POST', body: formData })
    if (!response.ok) throw new Error('Failed to save track')

    // Refresh data.tracks so we can pull back the new track's DB id
    await invalidateAll()

    const saved = [...data.tracks].reverse().find(t => t.storage_path === videoId)
    const slot = slots.find(s => s.key === slotKey)
    if (slot && saved) slot.trackId = saved.id

    return { title, artist }
  }

  async function handleDelete(slotKey: number) {
    const slot = slots.find(s => s.key === slotKey)
    if (slot?.trackId) {
      const formData = new FormData()
      formData.append('id', slot.trackId)
      await fetch('?/deleteTrack', { method: 'POST', body: formData })
    }
    const idx = slots.findIndex(s => s.key === slotKey)
    if (idx !== -1) slots.splice(idx, 1)
  }

  function addSlot() {
    slots.push({ key: keySeq++ })
  }
</script>

<main class="page">
  <header class="page-header">
    <h1 class="page-title">{data.tape.title}</h1>
    {#if data.tape.dedication}
      <p class="page-dedication">{data.tape.dedication}</p>
    {/if}
  </header>

  <div class="track-list">
    {#each slots as slot (slot.key)}
      <TrackInput
        index={slots.indexOf(slot) + 1}
        initialState={slot.savedTitle ? 'filled' : 'idle'}
        initialTitle={slot.savedTitle ?? ''}
        initialArtist={slot.savedArtist ?? ''}
        oncommit={(url) => handleCommit(slot.key, url)}
        ondelete={() => handleDelete(slot.key)}
      />
    {/each}

    <button class="btn btn-outline add-btn" onclick={addSlot}>+ Track</button>
  </div>

  <footer class="page-footer">
    <a href="/tape/{data.tape.id}" class="btn btn-primary">Share this tape →</a>
  </footer>
</main>

<style>
  .page {
    max-width: 600px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .page-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    letter-spacing: var(--tracking-3xl);
    line-height: var(--leading-tight);
  }

  .page-dedication {
    font-size: var(--text-base);
    letter-spacing: var(--tracking-base);
    color: var(--color-gray-secondary);
    font-style: italic;
  }

  .track-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    border: 1px solid var(--color-black);
    padding: var(--space-6);
  }

  .add-btn {
    width: 100%;
    margin-top: var(--space-2);
  }

  .page-footer {
    display: flex;
  }
</style>
