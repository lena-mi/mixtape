<script lang="ts">
  import type { PageData } from './$types'
  import cassette from '$lib/assets/Casette-empty.png'
  import { onMount } from 'svelte'
  import PlayerControls from '$lib/components/PlayerControls.svelte'

  let { data }: { data: PageData } = $props()

  let currentTrackIndex = $state(0)
  let isPlaying = $state(false)
  let isLoaded = $state(false)
  let player: any = null
  let audioEl: HTMLAudioElement | null = $state(null)

  const tracksA = $derived(data.tracks.filter(t => !t.side || t.side === 'a'))
  const tracksB = $derived(data.tracks.filter(t => t.side === 'b'))
  const allTracks = $derived([...tracksA, ...tracksB])
  const midpoint = $derived(tracksA.length)
  const currentSide = $derived(currentTrackIndex < midpoint ? 'A' : 'B')
  const currentTrack = $derived(allTracks[currentTrackIndex])
  const isAudioTrack = $derived(
    currentTrack?.source_type === 'google_drive' ||
    currentTrack?.source_type === 'web_url' ||
    currentTrack?.source_type === 'dropbox'
  )

  function getVideoId(index: number): string {
    return allTracks[index]?.storage_path ?? ''
  }

  function goToTrack(index: number) {
    currentTrackIndex = index
    const track = allTracks[index]
    if (!track) return
    const isAudio = track.source_type === 'google_drive' || track.source_type === 'web_url' || track.source_type === 'dropbox'
    if (isAudio) {
      if (audioEl) {
        audioEl.src = track.storage_path
        if (isPlaying) audioEl.play().catch(() => {})
      }
    } else {
      if (!player) return
      const videoId = track.storage_path ?? ''
      if (!videoId) return
      if (isPlaying) player.loadVideoById(videoId)
      else player.cueVideoById(videoId)
    }
  }

  function play() {
    isPlaying = true
    if (isAudioTrack) {
      audioEl?.play().catch(() => {})
    } else {
      player?.playVideo()
    }
  }

  function stop() {
    isPlaying = false
    if (isAudioTrack) {
      audioEl?.pause()
    } else {
      player?.pauseVideo()
    }
  }

  function sideEnd() {
    return currentSide === 'A' ? midpoint - 1 : allTracks.length - 1
  }

  function sideStart() {
    return currentSide === 'A' ? 0 : midpoint
  }

  function next() {
    const nextIdx = currentTrackIndex + 1
    if (nextIdx <= sideEnd()) goToTrack(nextIdx)
  }

  function prev() {
    const prevIdx = currentTrackIndex - 1
    if (prevIdx >= sideStart()) goToTrack(prevIdx)
  }

  function switchSide() {
    const targetIndex = currentSide === 'A' ? midpoint : 0
    if (targetIndex >= data.tracks.length) return
    goToTrack(targetIndex)
  }

  function onYoutubeStateChange(event: any) {
    if (event.data === 0 && isPlaying) {
      const nextIdx = currentTrackIndex + 1
      if (nextIdx <= sideEnd()) {
        currentTrackIndex = nextIdx
        const videoId = getVideoId(nextIdx)
        if (player && videoId) player.loadVideoById(videoId)
      } else {
        isPlaying = false
      }
    } else if (event.data === 1) {
      isPlaying = true
    } else if (event.data === 2) {
      isPlaying = false
    }
  }

  onMount(() => {
    const hasYoutubeTracks = allTracks.some(t => !t.source_type || t.source_type === 'youtube')

    if (hasYoutubeTracks) {
      const initPlayer = () => {
        const firstYt = allTracks.find(t => !t.source_type || t.source_type === 'youtube')
        player = new (window as any).YT.Player('youtube-player', {
          height: '1',
          width: '1',
          videoId: firstYt?.storage_path ?? '',
          playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: () => { if (!isAudioTrack) isLoaded = true },
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
    }

    if (isAudioTrack) isLoaded = true

    return () => { if (player?.destroy) player.destroy() }
  })
</script>

<div style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;" aria-hidden="true">
  <div id="youtube-player"></div>
  <!-- svelte-ignore a11y_media_has_caption -->
  <audio
    bind:this={audioEl}
    src={isAudioTrack ? currentTrack?.storage_path : undefined}
    onended={() => {
      const nextIdx = currentTrackIndex + 1
      if (nextIdx <= sideEnd()) goToTrack(nextIdx)
      else isPlaying = false
    }}
    oncanplay={() => { if (isAudioTrack) isLoaded = true }}
  ></audio>
</div>

<main class="tape-page">
  <header class="tape-header">
    <h1 class="tape-title">{data.tape.title}</h1>
    {#if data.tape.dedication}
      <p class="tape-dedication">{data.tape.dedication}</p>
    {/if}
  </header>

  <div class="cassette-container">
    <div class="cassette-wrap">
      <img src={cassette} alt="Cassette tape" class="cassette-image" />
      {#if data.tape.cover_url}
        <img src={data.tape.cover_url} alt="Cover" class="cover-image" />
      {/if}
    </div>
  </div>

  <div class="player-controls">
    <PlayerControls
      onplay={play}
      onstop={stop}
      onnext={next}
      onprev={prev}
      onswitchside={switchSide}
      {isPlaying}
      {isLoaded}
      canPrev={currentTrackIndex > (currentSide === 'A' ? 0 : midpoint)}
      canNext={currentTrackIndex < (currentSide === 'A' ? midpoint - 1 : allTracks.length - 1)}
      hasSideB={tracksB.length > 0}
      {currentSide}
    />
  </div>

  <div class="track-list">
    {#if currentSide === 'A'}
      <div class="side-tracks">
        <p class="side-label">Side A</p>
        {#each tracksA as track, i}
          <button class="track-item" class:active={i === currentTrackIndex} onclick={() => goToTrack(i)}>
            <span class="track-number">{i + 1}.</span>
            <span class="track-title">{track.title}</span>
          </button>
        {/each}
      </div>
    {:else}
      <div class="side-tracks">
        <p class="side-label">Side B</p>
        {#each tracksB as track, i}
          <button class="track-item" class:active={midpoint + i === currentTrackIndex} onclick={() => goToTrack(midpoint + i)}>
            <span class="track-number">{i + 1}.</span>
            <span class="track-title">{track.title}</span>
          </button>
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
    margin: 0 auto 20px;
    max-width: 600px;
    display: flex;
    justify-content: center;
  }

  .cassette-wrap {
    position: relative;
    display: inline-block;
    max-width: 500px;
    width: 100%;
  }

  .cassette-image {
    width: 100%;
    height: auto;
    display: block;
    filter: drop-shadow(4px 10px 14px rgba(0, 0, 0, 0.35));
    filter: drop-shadow(2px 4px 4px rgba(0, 0, 0, 0.35));
  }

  .cover-image {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 470px;
    height: 286px;
    object-fit: cover;
    mix-blend-mode: multiply;
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


  .track-item {
    padding: var(--space-2) var(--space-3);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    background: none;
    border: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: background 0.1s;
  }

  .track-item:hover {
    background: #f5f5f5;
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

  @media (max-width: 500px) {
    .tape-title { font-size: var(--text-3xl); }
    .player-controls { gap: var(--space-1); }
  }
</style>
