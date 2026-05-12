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
  let progress = $state(0)   // 0–100
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
            if (e.data === 1) {        // playing
              startTicker()
            } else if (e.data === 0) { // ended
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
            } else if (e.data === 2) { // paused
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

      console.log('Submitting form with:', { videoId, title: trackTitle.trim(), artist: trackArtist.trim() })

      const response = await fetch(`?/addTrack`, {
        method: 'POST',
        body: formData
      })

      console.log('Response status:', response.status)
      const responseText = await response.text()
      console.log('Response text:', responseText)

      if (response.ok) {
        // Reset form
        youtubeUrl = ''
        trackTitle = ''
        trackArtist = ''
        console.log('Track added successfully, reloading...')
        location.reload()
      } else {
        try {
          const errorData = JSON.parse(responseText)
          inputError = errorData.error || `Error: ${response.status}`
        } catch {
          inputError = `Error: ${response.status} - ${responseText.substring(0, 100)}`
        }
        console.error('Failed to add track:', inputError)
      }
    } catch (err) {
      inputError = `Network error: ${err}`
      console.error('Network error:', err)
    } finally {
      loading = false
    }
  }
</script>

<main style="max-width: 600px; margin: 40px auto; padding: 0 20px; font-family: sans-serif;">
  <h1>{data.tape.title}</h1>
  {#if data.tape.dedication}
    <p style="color: gray;">{data.tape.dedication}</p>
  {/if}

  <hr />
  <h2>Add a track</h2>

  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <label for="youtube_url" style="display: block; margin-bottom: 4px; font-weight: bold;">YouTube URL or Video ID</label>
      <input
        type="text"
        id="youtube_url"
        bind:value={youtubeUrl}
        placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
        disabled={loading}
        style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
      />
    </div>

    <div>
      <label for="title" style="display: block; margin-bottom: 4px; font-weight: bold;">Track title</label>
      <input
        type="text"
        id="title"
        bind:value={trackTitle}
        placeholder="Enter track title"
        disabled={loading}
        style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
      />
    </div>

    <div>
      <label for="artist" style="display: block; margin-bottom: 4px; font-weight: bold;">Artist (optional)</label>
      <input
        type="text"
        id="artist"
        bind:value={trackArtist}
        placeholder="Enter artist name"
        disabled={loading}
        style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
      />
    </div>

    <button
      type="button"
      onclick={addTrack}
      disabled={loading || !youtubeUrl.trim()}
      style="padding: 10px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
    >
      {loading ? 'Adding...' : 'Add Track'}
    </button>
  </div>

  {#if inputError}
    <p style="color: red; margin-top: 8px;">{inputError}</p>
  {/if}

  <hr />
  <h2>Tracks ({data.tracks.length})</h2>

  {#if data.tracks.length === 0}
    <p style="color: gray;">No tracks yet — add one above.</p>
  {/if}

  <!-- Hidden YouTube IFrame player -->
  <div style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;" aria-hidden="true">
    <div id="yt-preview-player"></div>
  </div>

  {#each data.tracks as track}
    <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <button
          type="button"
          onclick={() => togglePlay(track)}
          style="background: none; border: 1px solid #ccc; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 12px; flex-shrink: 0;"
        >
          {playingId === track.id ? '■' : '▶'}
        </button>
        <strong style="flex: 1;">{track.title}</strong>
        {#if track.artist}<span style="color: gray;">{track.artist}</span>{/if}
        <form method="POST" action="?/deleteTrack">
          <input type="hidden" name="id" value={track.id} />
          <button
            type="submit"
            style="background: none; border: none; cursor: pointer; color: #ccc; font-size: 16px; padding: 0 4px;"
          >
            ×
          </button>
        </form>
      </div>
      {#if playingId === track.id}
        <button
          type="button"
          aria-label="Seek"
          onclick={seek}
          style="display: block; width: 100%; margin-top: 6px; height: 3px; background: #eee; border-radius: 2px; cursor: pointer; padding: 0; border: none;"
        >
          <div style="height: 100%; width: {progress}%; background: #007bff; border-radius: 2px; transition: width 0.4s linear;"></div>
        </button>
      {/if}
    </div>
  {/each}

  <hr />
  <a href="/tape/{data.tape.id}">
    <button>Share this tape →</button>
  </a>
</main>