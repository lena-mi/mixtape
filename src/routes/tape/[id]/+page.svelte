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
  <header class="tape-header">
    <h1 class="tape-title">{data.tape.title}</h1>
    {#if data.tape.dedication}
      <p class="tape-dedication">{data.tape.dedication}</p>
    {/if}
  </header>

  <div class="cassette-container">
    <img src={cassette} alt="Cassette tape" class="cassette-image" />
  </div>

  <div class="player-controls">
    <button class="btn btn-outline" onclick={play} disabled={!isLoaded || isPlaying} aria-label="Play">▶</button>
    <button class="btn btn-outline" onclick={prev} disabled={currentTrackIndex === 0} aria-label="Previous">⏮</button>
    <button class="btn btn-outline" onclick={stop} disabled={!isPlaying} aria-label="Stop">■</button>
    <button class="btn btn-outline" onclick={next} disabled={currentTrackIndex === data.tracks.length - 1 && !isPlaying} aria-label="Next">⏭</button>
    <button class="btn btn-outline side-btn" onclick={switchSide} disabled={!isLoaded || data.tracks.length < 2}>
      {currentSide === 'A' ? 'Side B' : 'Side A'}
    </button>
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
    padding: var(--space-6);
  }

  .tape-header {
    text-align: center;
    margin-bottom: var(--space-8);
  }

  .tape-title {
    font-size: var(--text-4xl);
    font-weight: 700;
    letter-spacing: var(--tracking-4xl);
    line-height: var(--leading-tight);
    margin-bottom: var(--space-2);
  }

  .tape-dedication {
    font-size: var(--text-lg);
    letter-spacing: var(--tracking-lg);
    font-style: italic;
    color: var(--color-gray-secondary);
  }

  .cassette-container {
    max-width: 600px;
    margin: 0 auto var(--space-8);
    display: flex;
    justify-content: center;
  }

  .cassette-image {
    width: 100%;
    max-width: 500px;
    height: auto;
    display: block;
  }

  /* Controls */

  .player-controls {
    max-width: 500px;
    margin: 0 auto var(--space-8);
    display: flex;
    gap: var(--space-2);
    justify-content: center;
    flex-wrap: nowrap;
  }

  .side-btn {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-xs);
  }

  /* Tracklist */

  .track-list {
    max-width: 500px;
    margin: 0 auto;
  }

  .side-tracks {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .side-label {
    margin: 0 0 var(--space-1) var(--space-3);
    font-size: var(--text-xs);
    font-weight: 700;
    letter-spacing: var(--tracking-xs);
    text-transform: uppercase;
    color: var(--color-gray-muted);
  }

  .side-divider {
    border: none;
    border-top: 1px solid var(--color-gray-border);
    margin: var(--space-3) 0;
  }

  .track-item {
    padding: var(--space-2) var(--space-3);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    user-select: none;
    pointer-events: none;
  }

  .track-item.active .track-title {
    font-weight: 700;
  }

  .track-number {
    font-size: var(--text-sm);
    letter-spacing: var(--tracking-sm);
    color: var(--color-gray-muted);
    min-width: var(--space-6);
  }

  .track-title {
    flex: 1;
    font-size: var(--text-base);
    letter-spacing: var(--tracking-base);
  }

  .track-artist {
    font-size: var(--text-sm);
    letter-spacing: var(--tracking-sm);
    color: var(--color-gray-secondary);
    font-style: italic;
  }

  @media (max-width: 500px) {
    .tape-title { font-size: var(--text-3xl); }
    .player-controls { gap: var(--space-1); }
  }
</style>
