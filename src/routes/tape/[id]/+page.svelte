<script lang="ts">
  import type { PageData } from './$types'
  import cassette from '$lib/assets/Casette.jpg'

  let { data }: { data: PageData } = $props()

  let currentTrackIndex = $state(0)
  let isPlayingAll = $state(false)
  let durationTimer: ReturnType<typeof setTimeout> | null = null
  let audioElement = $state<HTMLAudioElement | null>(null)

  function startDurationTimer() {
    // Clear any existing timer
    if (durationTimer) {
      clearTimeout(durationTimer)
      durationTimer = null
    }

    if (!isPlayingAll) return

    const currentTrack = data.tracks[currentTrackIndex]
    if (!currentTrack) return

    // Duration is stored in seconds, convert to milliseconds
    const durationMs = (currentTrack.duration || 180) * 1000

    durationTimer = setTimeout(() => {
      nextTrack()
      startDurationTimer() // Restart timer for next track
    }, durationMs)
  }

  function nextTrack() {
    if (currentTrackIndex < data.tracks.length - 1) {
      currentTrackIndex++
    } else if (isPlayingAll) {
      // Loop back to start when reaching the end in Play All mode
      currentTrackIndex = 0
    }
  }

  function prevTrack() {
    if (currentTrackIndex > 0) {
      currentTrackIndex--
    }
    // Clear and restart timer when manually navigating
    if (durationTimer) {
      clearTimeout(durationTimer)
      durationTimer = null
    }
  }

  function togglePlayAll() {
    isPlayingAll = !isPlayingAll

    if (isPlayingAll) {
      startDurationTimer()
    } else {
      // Stop auto-advance
      if (durationTimer) {
        clearTimeout(durationTimer)
        durationTimer = null
      }
    }
  }

  function playCurrentTrack() {
    if (audioElement) {
      audioElement.play()
    }
  }
</script>

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

  <div class="track-list">
    <h3>Tracklist</h3>
    <div class="tracks">
      {#each data.tracks as track, index}
        <button 
          type="button"
          class="track-item" 
          class:active={index === currentTrackIndex} 
          onclick={() => currentTrackIndex = index}
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

  <div class="player-section">
    {#if data.tracks[currentTrackIndex]}
      <div class="current-track">
        <h3>{data.tracks[currentTrackIndex].title}</h3>
        {#if data.tracks[currentTrackIndex].artist}
          <p>by {data.tracks[currentTrackIndex].artist}</p>
        {/if}

        {#if data.tracks[currentTrackIndex].source_type === 'bandcamp' && data.tracks[currentTrackIndex].storage_path}
          <iframe
            width="100%"
            height="200"
            src="https://www.youtube.com/embed/{data.tracks[currentTrackIndex].storage_path}"
            title={data.tracks[currentTrackIndex].title}
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            style="border-radius: 4px; margin: 10px 0;"
          ></iframe>
        {:else if data.tracks[currentTrackIndex].source_type === 'bandcamp' && data.tracks[currentTrackIndex].source_url}
          <iframe
            src="https://bandcamp.com/EmbeddedPlayer/url={encodeURIComponent(data.tracks[currentTrackIndex].source_url)}/size=small/bgcol=d2d2d2/linkcol=0687f5/transparent=true/"
            class="bandcamp-embed"
            allowfullscreen
            title={data.tracks[currentTrackIndex].title}
          ></iframe>
        {:else}
          <p>File not available</p>
        {/if}
      </div>
    {/if}
  </div>

  <div class="player-controls">
    <div class="track-info">
      Track {currentTrackIndex + 1} of {data.tracks.length}
    </div>
    <div class="control-buttons">
      <button onclick={prevTrack} disabled={currentTrackIndex === 0} class="nav-btn">← Previous</button>
      <button onclick={togglePlayAll} class="play-all-btn" class:active={isPlayingAll}>
        {isPlayingAll ? 'Stop Play All' : 'Play All'}
      </button>
      <button onclick={nextTrack} disabled={currentTrackIndex === data.tracks.length - 1} class="nav-btn">Next →</button>
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

  .player-section {
    max-width: 500px;
    margin: 0 auto 20px;
    background: #d2d2d2;
  }

  .current-track {
    padding: 20px;
    text-align: center;
  }

  .current-track h3 {
    margin: 0 0 10px 0;
    color: black;
    font-weight: 700;
  }

  .current-track p {
    margin: 0 0 15px 0;
    color: #666;
  }

  .bandcamp-embed {
    width: 100%;
    height: 42px;
    border: 0;
    border-radius: 0;
    outline: none;
    background: #d2d2d2;
  }

  .player-controls {
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .track-info {
    text-align: center;
    font-size: 0.9rem;
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
    background: #d2d2d2;
  }

  .play-all-btn.active {
    background: black;
    color: white;
  }

  .track-list {
    max-width: 500px;
    margin: 30px auto 0;
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

    .track-list {
      margin: 20px auto 0;
    }

    .track-item {
      padding: 6px 8px;
      font-size: 0.9rem;
    }
  }
</style>