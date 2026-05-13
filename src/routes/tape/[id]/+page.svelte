<script lang="ts">
  import type { PageData } from './$types'
  import cassette from '$lib/assets/Casette.jpg'
  import { onMount } from 'svelte'

  let { data }: { data: PageData } = $props()

  let currentTrackIndex = $state(0)
  let isPlaying = $state(false)
  let isLoaded = $state(false)
  let player: any = null

  const midpoint = $derived(Math.ceil(data.tracks.length / 2))
  const currentSide = $derived(currentTrackIndex < midpoint ? 'A' : 'B')

  function extractYoutubeId(url: string): string {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return ''
  }

  function getVideoId(index: number): string {
    const track = data.tracks[index]
    if (!track) return ''
    if (track.storage_path) {
      if (/^[a-zA-Z0-9_-]{11}$/.test(track.storage_path)) return track.storage_path
      return extractYoutubeId(track.storage_path)
    }
    if (track.source_url) return extractYoutubeId(track.source_url)
    return ''
  }

  function goToTrack(index: number) {
    currentTrackIndex = index
    if (!player) return
    const videoId = getVideoId(index)
    if (!videoId) return
    if (isPlaying) {
      player.loadVideoById(videoId)
    } else {
      player.cueVideoById(videoId)
    }
  }

  function play() {
    if (!player) return
    isPlaying = true
    player.playVideo()
  }

  function stop() {
    if (!player) return
    isPlaying = false
    player.pauseVideo()
  }

  function next() {
    const nextIdx = currentTrackIndex + 1
    if (nextIdx < data.tracks.length) {
      goToTrack(nextIdx)
    } else if (isPlaying) {
      currentTrackIndex = 0
      const videoId = getVideoId(0)
      if (player && videoId) player.loadVideoById(videoId)
    }
  }

  function prev() {
    if (currentTrackIndex > 0) goToTrack(currentTrackIndex - 1)
  }

  function switchSide() {
    const targetIndex = currentSide === 'A' ? midpoint : 0
    if (targetIndex >= data.tracks.length) return
    goToTrack(targetIndex)
  }

  function onYoutubeStateChange(event: any) {
    if (event.data === 0 && isPlaying) {
      const nextIdx = currentTrackIndex + 1
      if (nextIdx < data.tracks.length) {
        currentTrackIndex = nextIdx
        const videoId = getVideoId(nextIdx)
        if (player && videoId) player.loadVideoById(videoId)
      } else {
        isPlaying = false
        currentTrackIndex = 0
        player.cueVideoById(getVideoId(0))
      }
    } else if (event.data === 1) {
      isPlaying = true
    } else if (event.data === 2) {
      isPlaying = false
    }
  }

  onMount(() => {
    const initPlayer = () => {
      player = new (window as any).YT.Player('youtube-player', {
        height: '1',
        width: '1',
        videoId: getVideoId(0),
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => { isLoaded = true },
          onStateChange: onYoutubeStateChange
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

    return () => { if (player?.destroy) player.destroy() }
  })
</script>

<div style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;" aria-hidden="true">
  <div id="youtube-player"></div>
</div>

<main class="tape-page">
  <div class="tape-header">
    <h1 class="tape-title">{data.tape.title}</h1>
    {#if data.tape.dedication}
      <p class="tape-dedication">{data.tape.dedication}</p>
    {/if}
  </div>

  <div class="cassette-container">
    <img src={cassette} alt="Cassette tape" class="cassette-image" />
  </div>

  <div class="player-controls">
    <div class="control-buttons">
      <button class="ctrl-btn" onclick={play} disabled={!isLoaded || isPlaying} aria-label="Play">▶</button>
      <button class="ctrl-btn" onclick={prev} disabled={currentTrackIndex === 0} aria-label="Previous">⏮</button>
      <button class="ctrl-btn stop-btn" onclick={stop} disabled={!isPlaying} aria-label="Stop">■</button>
      <button class="ctrl-btn" onclick={next} disabled={currentTrackIndex === data.tracks.length - 1 && !isPlaying} aria-label="Next">⏭</button>
      <button class="ctrl-btn side-btn" onclick={switchSide} disabled={!isLoaded || data.tracks.length < 2} aria-label="Switch side">
        {currentSide === 'A' ? 'Side B' : 'Side A'}
      </button>
    </div>
  </div>

  <div class="track-list">
    <div class="side-tracks">
      <p class="side-label">Side A</p>
      {#each data.tracks.slice(0, midpoint) as track, i}
        <div class="track-item" class:active={i === currentTrackIndex}>
          <span class="track-number">{i + 1}.</span>
          <span class="track-title">{track.title}</span>
          {#if track.artist}<span class="track-artist">— {track.artist}</span>{/if}
        </div>
      {/each}
    </div>

    {#if midpoint < data.tracks.length}
      <hr class="side-divider" />
      <div class="side-tracks">
        <p class="side-label">Side B</p>
        {#each data.tracks.slice(midpoint) as track, i}
          <div class="track-item" class:active={midpoint + i === currentTrackIndex}>
            <span class="track-number">{midpoint + i + 1}.</span>
            <span class="track-title">{track.title}</span>
            {#if track.artist}<span class="track-artist">— {track.artist}</span>{/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>

<style>
  .tape-page {
    min-height: 100vh;
    background: white;
    padding: 20px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: black;
  }

  .tape-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .tape-title {
    font-size: 2rem;
    font-weight: bold;
    color: black;
    margin: 0 0 10px 0;
  }

  .tape-dedication {
    font-size: 1.1rem;
    color: black;
    font-style: italic;
    margin: 0;
  }

  .cassette-container {
    max-width: 600px;
    margin: 0 auto 32px;
    display: flex;
    justify-content: center;
  }

  .cassette-image {
    width: 100%;
    max-width: 500px;
    height: auto;
    display: block;
  }

  /* ── Controls ── */

  .player-controls {
    max-width: 500px;
    margin: 0 auto 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .control-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: nowrap;
  }

  .ctrl-btn {
    padding: 8px 14px;
    border: 1px solid black;
    background: white;
    color: black;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .ctrl-btn:hover:not(:disabled) {
    background: black;
    color: white;
  }

  .ctrl-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .stop-btn {
    font-size: 0.85rem;
  }

  .side-btn {
    font-size: 0.8rem;
    letter-spacing: 0.04em;
    padding: 8px 12px;
  }

  /* ── Tracklist ── */

  .track-list {
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .side-label {
    margin: 0 0 6px 12px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #999;
  }

  .side-divider {
    border: none;
    border-top: 1px solid #ddd;
    margin: 12px 0;
  }

  .side-tracks {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .track-item {
    padding: 7px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 4px;
    border: 1px solid transparent;
    user-select: none;
    pointer-events: none;
  }

  .track-item.active .track-title {
    font-weight: 700;
  }

  .track-number {
    color: #999;
    font-weight: 500;
    min-width: 24px;
    font-size: 0.85rem;
  }

  .track-title {
    flex: 1;
    color: black;
  }

  .track-artist {
    color: #666;
    font-style: italic;
    font-size: 0.9rem;
  }

  @media (max-width: 500px) {
    .tape-title { font-size: 1.5rem; }

    .control-buttons { gap: 6px; }

    .ctrl-btn {
      padding: 8px 10px;
      font-size: 0.9rem;
    }

    .side-btn { font-size: 0.75rem; }
  }
</style>
