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

  <div class="player-section">
    {#if data.tracks[currentTrackIndex]}
      <div class="current-track">
        <h3>{data.tracks[currentTrackIndex].title}</h3>
        {#if data.tracks[currentTrackIndex].artist}
          <p>by {data.tracks[currentTrackIndex].artist}</p>
        {/if}

        {#if data.tracks[currentTrackIndex].storage_path}
          <audio
            bind:this={audioElement}
            src={data.tracks[currentTrackIndex].storage_path}
            controls
            onended={() => isPlayingAll ? nextTrack() : null}
          ></audio>
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

  audio {
    width: 100%;
    max-width: 400px;
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