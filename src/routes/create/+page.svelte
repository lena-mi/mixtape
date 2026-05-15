<script lang="ts">
  import type { PageData } from './$types'
  import { untrack } from 'svelte'
  import { invalidateAll } from '$app/navigation'
  import TrackInput from '$lib/components/TrackInput.svelte'
  import cassette from '$lib/assets/Casette-empty.png'

  let { data }: { data: PageData } = $props()

  let coverUrl = $state(untrack(() => data.tape.cover_url ?? ''))

  async function saveCover() {
    const formData = new FormData()
    formData.append('tape_id', data.tape.id)
    formData.append('cover_url', coverUrl)
    await fetch('?/updateCover', { method: 'POST', body: formData })
  }

  type Side = 'a' | 'b'
  type Slot = {
    key: number
    trackId?: string
    savedTitle?: string
    savedArtist?: string
    locked?: boolean
  }

  let tapeTitle = $state(untrack(() => data.tape.title ?? ''))
  let tapeDedication = $state(untrack(() => data.tape.dedication ?? ''))

  async function saveTape() {
    const formData = new FormData()
    formData.append('tape_id', data.tape.id)
    formData.append('title', tapeTitle)
    formData.append('dedication', tapeDedication)
    await fetch('?/updateTape', { method: 'POST', body: formData })
  }

  let keySeq = 1

  function makeSlots(tracks: typeof data.tracks): Slot[] {
    if (tracks.length === 0) return [{ key: keySeq++, locked: true }]
    return tracks.map((t, i) => ({
      key: keySeq++,
      trackId: t.id,
      savedTitle: t.title,
      savedArtist: t.artist ?? '',
      locked: i === 0,
    }))
  }

  const allTracks = untrack(() => data.tracks)
  const tracksA = allTracks.filter(t => !t.side || t.side === 'a')
  const tracksB = allTracks.filter(t => t.side === 'b')

  let slotsA = $state<Slot[]>(makeSlots(tracksA))
  let slotsB = $state<Slot[]>(makeSlots(tracksB))

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

  async function handleCommit(slotKey: number, url: string, side: Side): Promise<{ title: string; artist: string }> {
    const videoId = extractVideoId(url)
    if (!videoId) throw new Error('Invalid YouTube URL')

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
    } catch { /* oEmbed failed */ }

    if (!title) title = videoId

    const formData = new FormData()
    formData.append('tape_id', data.tape.id)
    formData.append('youtube_id', videoId)
    formData.append('youtube_url', `https://www.youtube.com/watch?v=${videoId}`)
    formData.append('title', title)
    formData.append('artist', artist)
    formData.append('side', side)

    const response = await fetch('?/addTrack', { method: 'POST', body: formData })
    if (!response.ok) throw new Error('Failed to save track')

    await invalidateAll()

    const slots = side === 'a' ? slotsA : slotsB
    const saved = [...data.tracks].reverse().find(t => t.storage_path === videoId && t.side === side)
    const slot = slots.find(s => s.key === slotKey)
    if (slot && saved) slot.trackId = saved.id

    return { title, artist }
  }

  async function handleDelete(slotKey: number, side: Side) {
    const slots = side === 'a' ? slotsA : slotsB
    const slot = slots.find(s => s.key === slotKey)
    if (slot?.trackId) {
      const formData = new FormData()
      formData.append('id', slot.trackId)
      await fetch('?/deleteTrack', { method: 'POST', body: formData })
    }
    const idx = slots.findIndex(s => s.key === slotKey)
    if (idx !== -1) slots.splice(idx, 1)
  }

  function addSlot(side: Side) {
    const slots = side === 'a' ? slotsA : slotsB
    slots.push({ key: keySeq++ })
  }
</script>

<main class="page">
  <header class="page-header">
    <input
      class="tape-title"
      type="text"
      bind:value={tapeTitle}
      onblur={saveTape}
      placeholder="Tape title"
      aria-label="Tape title"
    />
    <input
      class="tape-dedication"
      type="text"
      bind:value={tapeDedication}
      onblur={saveTape}
      placeholder="For someone special…"
      aria-label="Dedication"
    />
  </header>

  <div class="cassette-preview">
    <div class="cassette-frame">
      <img src={cassette} alt="Cassette tape" class="cassette-img" />
      {#if coverUrl}
        <img src={coverUrl} alt="Cover" class="cover-img" />
      {/if}
    </div>
    <input
      class="input cover-url-input"
      type="url"
      placeholder="Paste image URL for cover…"
      bind:value={coverUrl}
      onblur={saveCover}
      onkeydown={(e) => e.key === 'Enter' && saveCover()}
    />
  </div>

  <div class="sides">
    {#each (['a', 'b'] as Side[]) as side (side)}
      {@const slots = side === 'a' ? slotsA : slotsB}
      <div class="side-group">
        <p class="side-label">Side {side.toUpperCase()}</p>
        <div class="side-content">
          <div class="slots-container">
            {#each slots as slot (slot.key)}
              <div class="slot-row">
                <div class="slot-input">
                  <TrackInput
                    index={slots.indexOf(slot) + 1}
                    initialState={slot.savedTitle ? 'filled' : 'idle'}
                    initialTitle={slot.savedTitle ?? ''}
                    initialArtist={slot.savedArtist ?? ''}
                    oncommit={(url) => handleCommit(slot.key, url, side)}
                  />
                </div>
                {#if slot.locked}
                  <div class="slot-spacer"></div>
                {:else}
                  <button
                    class="slot-delete"
                    onclick={() => handleDelete(slot.key, side)}
                    aria-label="Remove track {slots.indexOf(slot) + 1} from Side {side.toUpperCase()}"
                  >×</button>
                {/if}
              </div>
            {/each}
          </div>
          <div class="slot-row">
            <button class="btn btn-outline add-btn" onclick={() => addSlot(side)}>+ Track</button>
            <div class="slot-spacer"></div>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <footer class="page-footer">
    <form method="POST" action="?/share">
      <button type="submit" class="btn btn-primary">Share this tape →</button>
    </form>
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

  .tape-title {
    font-size: var(--text-3xl);
    font-weight: 700;
    letter-spacing: var(--tracking-3xl);
    line-height: var(--leading-tight);
    font-family: inherit;
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    color: var(--color-black);
    padding: 0;
  }

  .tape-title::placeholder {
    color: var(--color-gray-border);
  }

  .tape-dedication {
    font-size: var(--text-base);
    letter-spacing: var(--tracking-base);
    color: var(--color-gray-secondary);
    font-style: italic;
    font-family: inherit;
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    padding: 0;
  }

  .tape-dedication::placeholder {
    color: var(--color-gray-border);
    font-style: italic;
  }

  .cassette-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-4);
  }

  .cassette-frame {
    position: relative;
    display: inline-block;
    max-width: 500px;
    width: 100%;
  }

  .cassette-img {
    width: 100%;
    height: auto;
    display: block;
  }

  .cover-img {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 470px;
    height: 286px;
    object-fit: cover;
    mix-blend-mode: multiply;
  }


  .sides {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  .side-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .side-label {
    font-family: var(--font-label);
    font-weight: 400;
    font-size: 17px;
    line-height: 27px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-black);
  }

  .side-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .slots-container {
    display: flex;
    flex-direction: column;
  }

  .slot-row {
    display: flex;
    align-items: stretch;
    gap: var(--space-3);
  }

  .slot-input {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .slot-spacer {
    flex-shrink: 0;
    width: var(--space-8);
  }

  .slot-delete {
    flex-shrink: 0;
    align-self: center;
    background: none;
    border: 1px solid var(--color-gray-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--text-base);
    color: var(--color-gray-muted);
    width: var(--space-8);
    height: var(--space-8);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s, color 0.15s;
  }

  .slot-delete:hover {
    border-color: var(--color-black);
    color: var(--color-black);
  }

  .add-btn {
    flex: 1;
  }

  .page-footer {
    display: flex;
  }
</style>
