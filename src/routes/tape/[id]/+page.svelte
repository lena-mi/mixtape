<script lang="ts">
  import type { PageData } from './$types'
  import cassette from '$lib/assets/Casette-empty.png'
  import { onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import { cubicIn } from 'svelte/easing'
  import PlayerControls from '$lib/components/PlayerControls.svelte'

  let { data }: { data: PageData } = $props()

  let intro = $state(true)
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
    if (prevIdx >= sideStart()) {
      goToTrack(prevIdx)
    } else {
      if (isAudioTrack) {
        if (audioEl) audioEl.currentTime = 0
      } else {
        player?.seekTo(0, true)
      }
    }
  }

  function switchSide() {
    const targetIndex = currentSide === 'A' ? midpoint : 0
    if (targetIndex >= data.tracks.length) return
    isPlaying = false
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

{#if intro}
  <div class="intro-screen" out:fly={{ y: -60, duration: 380, easing: cubicIn }}>
    <p class="intro-heading">You've received the tape!</p>

    <div class="intro-cassette-wrap">
      <img src={cassette} alt="Cassette tape" class="intro-cassette-img" />
      {#if data.tape.cover_url}
        <img
          src={data.tape.cover_url}
          alt="Cover"
          class="intro-cover-img"
          style="object-position: {(data.tape as any).cover_position ?? '50% 50%'}"
          draggable="false"
        />
      {/if}
      <div class="intro-label-card">
        <span class="intro-label-title">{data.tape.title}</span>
        {#if data.tape.dedication}
          <span class="intro-label-desc">{data.tape.dedication}</span>
        {/if}
      </div>
    </div>

    <button class="btn-put-on" onclick={() => intro = false}>
      Put on the tape →
    </button>
  </div>
{/if}

<main class="tape-page" class:hidden={intro}>
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
        <img
          src={data.tape.cover_url}
          alt="Cover"
          class="cover-image"
          style="object-position: {(data.tape as any).cover_position ?? '50% 50%'}"
        />
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
      canPrev={true}
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
          <div class="track-item" class:active={i === currentTrackIndex}>
            <span class="track-number">{i + 1}.</span>
            <span class="track-title">{track.title}</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="side-tracks">
        <p class="side-label">Side B</p>
        {#each tracksB as track, i}
          <div class="track-item" class:active={midpoint + i === currentTrackIndex}>
            <span class="track-number">{i + 1}.</span>
            <span class="track-title">{track.title}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>

<style>
  /* Intro */

  .intro-screen {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: #F7F3EF;
    z-index: 1001;
    animation: intro-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes intro-enter {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .intro-heading {
    font-family: 'Caveat', cursive;
    font-weight: 400;
    font-size: 50px;
    line-height: 63px;
    letter-spacing: -1px;
    color: #000000;
    margin: 0;
  }

  .intro-cassette-wrap {
    position: relative;
    width: 439px;
    height: 282px;
    flex-shrink: 0;
  }

  .intro-cassette-img {
    width: 439px;
    height: 282px;
    display: block;
  }

  .intro-cover-img {
    position: absolute;
    left: 16px;
    top: 15px;
    width: 411px;
    height: 250px;
    object-fit: cover;
    mix-blend-mode: multiply;
    border-radius: 1px;
  }

  .intro-label-card {
    position: absolute;
    left: calc(50% - 131px);
    top: calc(50% - 23px);
    width: 262px;
    height: 46px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5px 10px;
    gap: 2px;
    background: #F7F3EF;
    box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5);
    box-sizing: border-box;
  }

  .intro-label-title {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 16px;
    line-height: 19px;
    text-align: center;
    color: #000000;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .intro-label-desc {
    font-family: 'Chivo Mono', monospace;
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    text-align: center;
    color: #000000;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-put-on {
    padding: var(--space-3) var(--space-6);
    background: var(--color-black, #000);
    color: var(--color-white, #fff);
    border: none;
    font-family: inherit;
    font-size: var(--text-base);
    letter-spacing: var(--tracking-base);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: opacity 0.15s;
  }

  .btn-put-on:hover { opacity: 0.75; }

  .tape-page {
    min-height: 100vh;
    padding: var(--space-6);
    animation: fade-in 0.5s ease;
  }

  .tape-page.hidden {
    display: none;
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(48px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .tape-header {
    position: relative;
    height: 40px;
    margin-bottom: 7px;
  }

  .tape-title {
    position: absolute;
    width: 185px;
    left: calc(50% - 185px / 2 + 0.5px);
    top: 0;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 16px;
    line-height: 19px;
    text-align: center;
    color: #000000;
    margin: 0;
  }

  .tape-dedication {
    position: absolute;
    width: 242px;
    left: calc(50% - 242px / 2);
    top: 21px;
    font-family: 'Chivo Mono', monospace;
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    text-align: center;
    color: #000000;
    font-style: normal;
    margin: 0;
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
    filter: drop-shadow(4px 8px 6px rgba(39, 38, 46, 0.25));
    
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
    border-radius: var(--radius-md);
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
