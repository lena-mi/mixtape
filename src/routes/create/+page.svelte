<script lang="ts">
  import type { PageData } from './$types'
  import { untrack } from 'svelte'
  import { invalidateAll } from '$app/navigation'
  import TrackInput from '$lib/components/TrackInput.svelte'
  import type { CommitHint } from '$lib/utils/audioUrl'
  import { extractVideoId, formatDuration } from '$lib/utils/audioUrl'
  import cassette from '$lib/assets/Casette-empty.png'

  const SIDE_LIMIT = 2700

  let { data }: { data: PageData } = $props()

  let coverUrl = $state(untrack(() => data.tape.cover_url ?? ''))

  function parseCoverPosition(pos: string | null | undefined): [number, number] {
    if (!pos) return [50, 50]
    const parts = pos.split(' ').map(v => parseFloat(v))
    const x = isFinite(parts[0]) ? parts[0] : 50
    const y = isFinite(parts[1]) ? parts[1] : 50
    return [x, y]
  }
  const [initX, initY] = untrack(() => parseCoverPosition((data.tape as any).cover_position))
  let coverPosX = $state(initX)
  let coverPosY = $state(initY)

  let coverDrag = $state<{ startX: number; startY: number; posX: number; posY: number } | null>(null)

  function onCoverPointerDown(e: PointerEvent) {
    if (!coverUrl) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    coverDrag = { startX: e.clientX, startY: e.clientY, posX: coverPosX, posY: coverPosY }
  }

  function onCoverPointerMove(e: PointerEvent) {
    if (!coverDrag) return
    const el = e.currentTarget as HTMLElement
    const dx = e.clientX - coverDrag.startX
    const dy = e.clientY - coverDrag.startY
    coverPosX = Math.max(0, Math.min(100, coverDrag.posX - (dx / el.offsetWidth) * 100))
    coverPosY = Math.max(0, Math.min(100, coverDrag.posY - (dy / el.offsetHeight) * 100))
  }

  function onCoverPointerUp() {
    if (!coverDrag) return
    coverDrag = null
    saveCover()
  }

  async function saveCover() {
    const formData = new FormData()
    formData.append('tape_id', data.tape.id)
    formData.append('cover_url', coverUrl)
    formData.append('cover_position', `${coverPosX}% ${coverPosY}%`)
    await fetch('?/updateCover', { method: 'POST', body: formData })
  }

  type Side = 'a' | 'b'
  type Slot = {
    key: number
    trackId?: string
    savedTitle?: string
    savedDuration?: number
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
      savedDuration: (t as any).duration_seconds ?? 0,
      locked: i === 0,
    }))
  }

  const allTracks = untrack(() => data.tracks)
  const tracksA = allTracks.filter(t => !t.side || t.side === 'a')
  const tracksB = allTracks.filter(t => t.side === 'b')

  let slotsA = $state<Slot[]>(makeSlots(tracksA))
  let slotsB = $state<Slot[]>(makeSlots(tracksB))

  const sideASeconds = $derived(slotsA.reduce((s, slot) => s + (slot.savedDuration ?? 0), 0))
  const sideBSeconds = $derived(slotsB.reduce((s, slot) => s + (slot.savedDuration ?? 0), 0))

  function probeYtDuration(videoId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      let settled = false
      let ytPlayer: any = null

      const container = document.createElement('div')
      document.body.appendChild(container)

      const done = (fn: () => void) => {
        if (settled) return
        settled = true
        fn()
        setTimeout(() => { ytPlayer?.destroy(); container.remove() }, 0)
      }

      const timer = setTimeout(
        () => done(() => reject(new Error('Could not load this video'))),
        10_000
      )

      const probe = () => {
        ytPlayer = new (window as any).YT.Player(container, {
          height: '1',
          width: '1',
          videoId,
          playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, playsinline: 1 },
          events: {
            onReady: () => {
              const dur: number = ytPlayer.getDuration()
              if (isFinite(dur) && dur > 0) { clearTimeout(timer); done(() => resolve(dur)) }
            },
            onStateChange: (e: any) => {
              if (e.data === 5) { // cued — getDuration() is reliable here
                const dur: number = ytPlayer.getDuration()
                if (isFinite(dur) && dur > 0) { clearTimeout(timer); done(() => resolve(dur)) }
              }
            },
            onError: () => {
              clearTimeout(timer)
              done(() => reject(new Error('This video is unavailable or private')))
            },
          },
        })
      }

      if ((window as any).YT?.Player) {
        probe()
      } else {
        const prev = (window as any).onYouTubeIframeAPIReady
        ;(window as any).onYouTubeIframeAPIReady = () => { if (prev) prev(); probe() }
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script')
          tag.src = 'https://www.youtube.com/iframe_api'
          document.head.appendChild(tag)
        }
      }
    })
  }

  async function handleCommit(slotKey: number, url: string, side: Side, hint?: CommitHint): Promise<{ title: string }> {
    let title = ''
    let storagePath = ''
    let sourceUrl = url
    let sourceType: 'youtube' | 'web_url' | 'google_drive' = 'youtube'
    let duration = 0

    if (hint) {
      title = hint.title
      storagePath = hint.resolvedUrl
      sourceUrl = url
      sourceType = hint.sourceType === 'google_drive' ? 'google_drive' : 'web_url'
      duration = hint.duration
    } else {
      const videoId = extractVideoId(url)
      if (!videoId) throw new Error('Invalid YouTube URL')

      const [durationResult, oembedResult] = await Promise.allSettled([
        probeYtDuration(videoId),
        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null),
      ])

      if (durationResult.status === 'rejected') {
        throw durationResult.reason instanceof Error ? durationResult.reason : new Error('Could not load this video')
      }
      duration = durationResult.value

      const oembed = oembedResult.status === 'fulfilled' ? oembedResult.value : null
      if (oembed?.title) {
        title = oembed.title as string
      }

      if (!title) title = videoId
      storagePath = videoId
      sourceUrl = `https://www.youtube.com/watch?v=${videoId}`
    }

    if (duration > SIDE_LIMIT) {
      throw new Error(`This track is ${formatDuration(duration)} — longer than 45 minutes`)
    }

    const slots = side === 'a' ? slotsA : slotsB
    const existingTotal = slots.reduce((s, slot) => s + (slot.savedDuration ?? 0), 0)
    if (existingTotal + duration > SIDE_LIMIT) {
      throw new Error(`Side ${side.toUpperCase()} only has ${formatDuration(SIDE_LIMIT - existingTotal)} left`)
    }

    const formData = new FormData()
    formData.append('tape_id', data.tape.id)
    formData.append('title', title)
    formData.append('storage_path', storagePath)
    formData.append('source_url', sourceUrl)
    formData.append('source_type', sourceType)
    formData.append('duration_seconds', String(Math.round(duration)))
    formData.append('side', side)

    const response = await fetch('?/addTrack', { method: 'POST', body: formData })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.error ?? 'Failed to save track')
    }

    const slot = slots.find(s => s.key === slotKey)
    if (slot) slot.savedDuration = Math.round(duration)

    await invalidateAll()

    const saved = [...data.tracks].reverse().find(t => t.storage_path === storagePath && t.side === side)
    if (slot && saved) slot.trackId = saved.id

    return { title }
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
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="cassette-frame"
      class:cover-draggable={!!coverUrl}
      class:cover-dragging={!!coverDrag}
      onpointerdown={onCoverPointerDown}
      onpointermove={onCoverPointerMove}
      onpointerup={onCoverPointerUp}
      onpointercancel={onCoverPointerUp}
    >
      <img src={cassette} alt="Cassette tape" class="cassette-img" />
      {#if coverUrl}
        <img
          src={coverUrl}
          alt="Cover"
          class="cover-img"
          style="object-position: {coverPosX}% {coverPosY}%"
          draggable="false"
        />
      {/if}
    </div>
    <label class="cover-label">
      J-card picture
      <input
        class="input cover-url-input"
        type="url"
        placeholder="Paste a link to any image"
        bind:value={coverUrl}
        onblur={saveCover}
        onkeydown={(e) => e.key === 'Enter' && saveCover()}
      />
    </label>
  </div>

  <div class="sides">
    {#each (['a', 'b'] as Side[]) as side (side)}
      {@const slots = side === 'a' ? slotsA : slotsB}
      {@const sideSeconds = side === 'a' ? sideASeconds : sideBSeconds}
      {@const remaining = SIDE_LIMIT - sideSeconds}
      <div class="side-group">
        <div class="side-header">
          <p class="side-label">Side {side.toUpperCase()}</p>
          <span class="side-time" class:near-full={remaining < 120}>
            {#if remaining < 120}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.871l-8.106 -13.534a1.914 1.914 0 0 0 -3.274 0z"/>
                <path d="M12 9v4"/>
                <path d="M12 16h.01"/>
              </svg>
            {/if}
            {formatDuration(sideSeconds)} / 45:00
          </span>
        </div>
        <div class="side-content">
          <div class="slots-container">
            {#each slots as slot (slot.key)}
              <div class="slot-row">
                <div class="slot-input">
                  <TrackInput
                    index={slots.indexOf(slot) + 1}
                    initialState={slot.savedTitle ? 'filled' : 'idle'}
                    initialTitle={slot.savedTitle ?? ''}
                    oncommit={(url, hint) => handleCommit(slot.key, url, side, hint)}
                  />
                </div>
                {#if !slot.locked}
                  <button
                    class="slot-delete"
                    onclick={() => handleDelete(slot.key, side)}
                    aria-label="Remove track {slots.indexOf(slot) + 1} from Side {side.toUpperCase()}"
                  >×</button>
                {/if}
              </div>
            {/each}
          </div>
          <button class="btn btn-outline add-btn" onclick={() => addSlot(side)}>+ Track</button>
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
    max-width: calc(500px + 2 * var(--space-6));
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

  .cassette-frame.cover-draggable { cursor: grab; }
  .cassette-frame.cover-dragging  { cursor: grabbing; }

  .cassette-img {
    width: 100%;
    height: auto;
    display: block;
    filter: drop-shadow(10px 14px 14px rgba(73, 68, 61, 0.3));
    filter: drop-shadow(2px 4px 6px rgba(73, 68, 61, 0.3));
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

  .cover-label {
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: var(--tracking-xs);
    text-transform: uppercase;
    color: var(--color-gray-muted);
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

  .side-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
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

  .side-time {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-xs);
    color: var(--color-gray-muted);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .side-time.near-full {
    background: #ebebeb;
    color: var(--color-gray-secondary);
    padding: 3px var(--space-2);
    border-radius: var(--radius-md);
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
    position: relative;
  }

  .slot-input {
    display: flex;
    flex-direction: column;
  }

  .slot-delete {
    position: absolute;
    right: calc(-1 * (var(--space-3) + var(--space-8)));
    top: 50%;
    transform: translateY(-50%);
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
    width: 100%;
  }

  .page-footer {
    display: flex;
  }
</style>
