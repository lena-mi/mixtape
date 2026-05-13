<script lang="ts">
  import type { PageData, ActionData } from './$types'
  import { onMount } from 'svelte'

  let { data, form }: { data: PageData, form: ActionData } = $props()

  let youtubeUrl = $state('')
  let trackTitle = $state('')
  let trackArtist = $state('')
  let loading = $state(false)
  let inputError = $state('')
  let playingId = $state<string | null>(null)
  let progress = $state(0)
  let player: any = null
  let ticker: ReturnType<typeof setInterval> | null = null

  function startTicker() {
    if (ticker) return
    ticker = setInterval(() => {
      if (!player?.getCurrentTime) return
      const cur = player.getCurrentTime()
      const dur = player.getDuration()
      progress = dur > 0 ? (cur / dur) * 100 : 0
    }, 500)
  }

  function stopTicker() {
    if (ticker) { clearInterval(ticker); ticker = null }
  }

  function seek(e: MouseEvent) {
    const bar = e.currentTarget as HTMLElement
    const ratio = (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth
    const dur = player?.getDuration() ?? 0
    if (dur > 0) player?.seekTo(ratio * dur, true)
  }

  function extractYoutubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  function togglePlay(track: { id: string; storage_path?: string }) {
    if (playingId === track.id) {
      playingId = null
      stopTicker()
      player?.pauseVideo()
      return
    }
    const videoId = track.storage_path ?? null
    if (!videoId) return
    playingId = track.id
    progress = 0
    if (player) {
      player.loadVideoById(videoId)
    }
  }

  onMount(() => {
    const initPlayer = () => {
      player = new (window as any).YT.Player('yt-preview-player', {
        height: '1',
        width: '1',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, playsinline: 1 },
        events: {
          onReady: () => {},
          onStateChange: (e: any) => {
            if (e.data === 1) {
              startTicker()
            } else if (e.data === 0) {
              stopTicker()
              progress = 0
              const idx = data.tracks.findIndex(t => t.id === playingId)
              const next = data.tracks[idx + 1]
              if (next) {
                playingId = next.id
                player.loadVideoById(next.storage_path)
              } else {
                playingId = null
              }
            } else if (e.data === 2) {
              stopTicker()
            }
          }
        }
      })
    }

    if ((window as any).YT?.Player) {
      initPlayer()
    } else {
      ;(window as any).onYouTubeIframeAPIReady = initPlayer
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
    }

    return () => { stopTicker(); player?.destroy() }
  })

  async function addTrack() {
    inputError = ''

    if (!youtubeUrl.trim()) {
      inputError = 'Please enter a YouTube URL or video ID'
      return
    }

    if (!trackTitle.trim()) {
      inputError = 'Please enter a track title'
      return
    }

    const videoId = extractYoutubeVideoId(youtubeUrl.trim())
    if (!videoId) {
      inputError = 'Please enter a valid YouTube URL or video ID'
      return
    }

    loading = true

    try {
      const formData = new FormData()
      formData.append('youtube_id', videoId)
      formData.append('youtube_url', `https://www.youtube.com/watch?v=${videoId}`)
      formData.append('title', trackTitle.trim())
      formData.append('artist', trackArtist.trim())

      const response = await fetch(`?/addTrack`, { method: 'POST', body: formData })
      const responseText = await response.text()

      if (response.ok) {
        youtubeUrl = ''
        trackTitle = ''
        trackArtist = ''
        location.reload()
      } else {
        try {
          const errorData = JSON.parse(responseText)
          inputError = errorData.error || `Error: ${response.status}`
        } catch {
          inputError = `Error: ${response.status} - ${responseText.substring(0, 100)}`
        }
      }
    } catch (err) {
      inputError = `Network error: ${err}`
    } finally {
      loading = false
    }
  }
</script>

<div style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;" aria-hidden="true">
  <div id="yt-preview-player"></div>
</div>

<main class="page">
  <header class="page-header">
    <h1 class="page-title">{data.tape.title}</h1>
    {#if data.tape.dedication}
      <p class="page-dedication">{data.tape.dedication}</p>
    {/if}
  </header>

  <hr class="divider" />

  <section class="form-section">
    <h2 class="section-title">Add a track</h2>

    <div class="form-fields">
      <div class="field">
        <label class="label" for="youtube_url">YouTube URL or Video ID</label>
        <input
          class="input"
          type="text"
          id="youtube_url"
          bind:value={youtubeUrl}
          placeholder="https://youtube.com/watch?v=… or dQw4w9WgXcQ"
          disabled={loading}
        />
      </div>

      <div class="field">
        <label class="label" for="title">Track title</label>
        <input
          class="input"
          type="text"
          id="title"
          bind:value={trackTitle}
          placeholder="Enter track title"
          disabled={loading}
        />
      </div>

      <div class="field">
        <label class="label" for="artist">Artist (optional)</label>
        <input
          class="input"
          type="text"
          id="artist"
          bind:value={trackArtist}
          placeholder="Enter artist name"
          disabled={loading}
        />
      </div>

      <button
        type="button"
        class="btn btn-primary"
        onclick={addTrack}
        disabled={loading || !youtubeUrl.trim()}
      >
        {loading ? 'Adding…' : 'Add Track'}
      </button>
    </div>

    {#if inputError}
      <p class="error">{inputError}</p>
    {/if}
  </section>

  <hr class="divider" />

  <section class="tracks-section">
    <h2 class="section-title">Tracks ({data.tracks.length})</h2>

    {#if data.tracks.length === 0}
      <p class="empty-state">No tracks yet — add one above.</p>
    {/if}

    {#each data.tracks as track}
      <div class="track-row">
        <div class="track-row-main">
          <button
            type="button"
            class="play-btn"
            onclick={() => togglePlay(track)}
            aria-label={playingId === track.id ? 'Pause' : 'Play'}
          >
            {playingId === track.id ? '■' : '▶'}
          </button>
          <span class="track-title">{track.title}</span>
          {#if track.artist}<span class="track-artist">{track.artist}</span>{/if}
          <form method="POST" action="?/deleteTrack">
            <input type="hidden" name="id" value={track.id} />
            <button type="submit" class="delete-btn" aria-label="Remove track">×</button>
          </form>
        </div>
        {#if playingId === track.id}
          <button
            type="button"
            class="seek-bar"
            aria-label="Seek"
            onclick={seek}
          >
            <div class="seek-fill" style="width: {progress}%"></div>
          </button>
        {/if}
      </div>
    {/each}
  </section>

  <hr class="divider" />

  <a href="/tape/{data.tape.id}" class="btn btn-outline">Share this tape →</a>
</main>

<style>
  .page {
    max-width: 600px;
    margin: 0 auto;
    padding: var(--space-8) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
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

  .divider {
    border: none;
    border-top: 1px solid var(--color-gray-border);
    margin: 0;
  }

  .section-title {
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: var(--tracking-lg);
    margin-bottom: var(--space-4);
  }

  /* Form */

  .form-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .form-fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .label {
    font-size: var(--text-sm);
    font-weight: 500;
    letter-spacing: var(--tracking-sm);
  }

  .error {
    font-size: var(--text-sm);
    letter-spacing: var(--tracking-sm);
    color: #c00;
  }

  /* Tracks */

  .tracks-section {
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    font-size: var(--text-sm);
    letter-spacing: var(--tracking-sm);
    color: var(--color-gray-secondary);
  }

  .track-row {
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--color-gray-border);
  }

  .track-row-main {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .play-btn {
    flex-shrink: 0;
    width: var(--space-8);
    height: var(--space-8);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid var(--color-gray-border);
    background: var(--color-white);
    color: var(--color-black);
    font-size: var(--text-xs);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .play-btn:hover {
    border-color: var(--color-black);
    background: var(--color-black);
    color: var(--color-white);
  }

  .track-title {
    flex: 1;
    font-size: var(--text-base);
    font-weight: 500;
    letter-spacing: var(--tracking-base);
  }

  .track-artist {
    font-size: var(--text-sm);
    letter-spacing: var(--tracking-sm);
    color: var(--color-gray-secondary);
  }

  .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-gray-muted);
    font-size: var(--text-lg);
    line-height: 1;
    padding: 0 var(--space-1);
    transition: color 0.15s;
  }

  .delete-btn:hover {
    color: var(--color-black);
  }

  .seek-bar {
    display: block;
    width: 100%;
    margin-top: var(--space-2);
    height: 3px;
    background: var(--color-gray-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    padding: 0;
    border: none;
  }

  .seek-fill {
    height: 100%;
    background: var(--color-black);
    border-radius: var(--radius-sm);
    transition: width 0.4s linear;
  }
</style>
