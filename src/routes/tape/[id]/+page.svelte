<script lang="ts">
  import type { PageData } from './$types'
  import cassette from '$lib/assets/Casette.jpg'
  import { onMount } from 'svelte'

  let { data }: { data: PageData } = $props()

  let currentTrackIndex = $state(0)
  let isPlaying = $state(false)
  let isLoaded = $state(false)
  let player: any = null

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

  function playAll() {
    if (!player) return
    isPlaying = true
    player.playVideo()
  }

  function stopAll() {
    if (!player) return
    isPlaying = false
    player.pauseVideo()
  }

  function togglePlayAll() {
    if (isPlaying) {
      stopAll()
    } else {
      playAll()
    }
  }

  function nextTrack() {
    const next = currentTrackIndex + 1
    if (next < data.tracks.length) {
      goToTrack(next)
    } else {
      // Loop back to start when playing
      if (isPlaying) {
        currentTrackIndex = 0
        const videoId = getVideoId(0)
        if (player && videoId) player.loadVideoById(videoId)
      }
    }
  }

  function prevTrack() {
    if (currentTrackIndex > 0) goToTrack(currentTrackIndex - 1)
  }

  function onYoutubeStateChange(event: any) {
    // 0 = ENDED, 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 5 = CUED
    if (event.data === 0 && isPlaying) {
      const next = currentTrackIndex + 1
      if (next < data.tracks.length) {
        currentTrackIndex = next
        const videoId = getVideoId(next)
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
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1
        },
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

    return () => {
      if (player?.destroy) player.destroy()
    }
  })
</script>

<!-- Hidden YouTube IFrame player — invisible but required in the DOM -->
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

    <div class="tracks-overlay">
      {#each data.tracks as track, index}
        <div class="track-label" style="top: {20 + index * 15}%">
          {track.title} — {track.artist}
        </div>
      {/each}
    </div>
  </div>

  <div class="player-controls">
    {#if data.tracks[currentTrackIndex]}
      <div class="now-playing">
        <span class="now-playing-title">{data.tracks[currentTrackIndex].title}</span>
        {#if data.tracks[currentTrackIndex].artist}
          <span class="now-playing-artist">— {data.tracks[currentTrackIndex].artist}</span>
        {/if}
      </div>
    {/if}

    <div class="track-info">
      Track {currentTrackIndex + 1} of {data.tracks.length}
    </div>

    <div class="control-buttons">
      <button onclick={prevTrack} disabled={currentTrackIndex === 0} class="nav-btn">← Prev</button>
      <button
        onclick={togglePlayAll}
        class="play-all-btn"
        class:active={isPlaying}
        disabled={!isLoaded}
      >
        {isPlaying ? 'Stop' : 'Play All'}
      </button>
      <button onclick={nextTrack} disabled={currentTrackIndex === data.tracks.length - 1 && !isPlaying} class="nav-btn">Next →</button>
    </div>
  </div>

  <div class="track-list">
    <h3>Tracklist</h3>
    <div class="tracks">
      {#each data.tracks as track, index}
        <button
          type="button"
          class="track-item"
          class:active={index === currentTrackIndex}
          onclick={() => goToTrack(index)}
        >
          <span class="track-number">{index + 1}.</span>
          <span class="track-title">{track.title}</span>
          {#if track.artist}
            <span class="track-artist">— {track.artist}</span>
          {/if}
        </button>
      {/each}
    </div>
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
    position: relative;
    max-width: 600px;
    margin: 0 auto 40px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .cassette-image {
    width: 100%;
    max-width: 500px;
    height: auto;
    display: block;
  }

  .tracks-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .track-label {
    position: absolute;
    left: 13%;
    margin-top: 12px;
    color: black;
    font-size: 0.9rem;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: auto;
  }

  .player-controls {
    max-width: 500px;
    margin: 0 auto 30px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #d2d2d2;
    padding: 20px;
    border-radius: 4px;
  }

  .now-playing {
    text-align: center;
  }

  .now-playing-title {
    font-weight: 700;
    color: black;
    font-size: 1rem;
  }

  .now-playing-artist {
    color: #555;
    font-style: italic;
    margin-left: 4px;
    font-size: 0.95rem;
  }

  .track-info {
    text-align: center;
    font-size: 0.85rem;
    color: #666;
  }

  .control-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  button {
    padding: 8px 16px;
    border: 1px solid black;
    background: white;
    color: black;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  button:hover:not(:disabled) {
    background: black;
    color: white;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .play-all-btn {
    background: #f0f0f0;
    min-width: 90px;
  }

  .play-all-btn.active {
    background: black;
    color: white;
  }

  .track-list {
    max-width: 500px;
    margin: 0 auto;
    text-align: center;
  }

  .track-list h3 {
    margin: 0 0 15px 0;
    color: black;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .tracks {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    margin: 0;
  }

  .track-item {
    padding: 8px 12px;
    margin: 0;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid transparent;
    background: white;
    text-align: left;
    font-family: inherit;
    font-size: inherit;
  }

  .track-item:hover {
    background-color: #f5f5f5;
    border-color: #ddd;
  }

  .track-item.active {
    background-color: #d2d2d2;
    border-color: #999;
    font-weight: 600;
  }

  .track-number {
    color: #666;
    font-weight: 500;
    min-width: 24px;
  }

  .track-title {
    flex: 1;
    color: black;
  }

  .track-artist {
    color: #666;
    font-style: italic;
  }

  @media (max-width: 768px) {
    .tape-title {
      font-size: 1.5rem;
    }

    .track-label {
      font-size: 0.8rem;
    }

    .cassette-image {
      max-width: 400px;
    }

    .control-buttons {
      flex-direction: column;
    }

    button {
      width: 100%;
    }
  }
</style>
