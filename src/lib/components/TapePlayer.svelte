<script lang="ts">
  import cassette from '$lib/assets/Casette-empty.png'
  import { onMount } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import PlayerControls from '$lib/components/PlayerControls.svelte'
  import { checkTracks } from '$lib/checkLinks'
  import type { PlayerTape } from '$lib/tape'

  let { tape, checkLinks = false }: { tape: PlayerTape; checkLinks?: boolean } = $props()

  let currentTrackIndex = $state(0)
  let isPlaying = $state(false)
  let ytReady = $state(false)
  let coverFailed = $state(false)
  let player: any = null
  let audioEl: HTMLAudioElement | null = $state(null)
  // Indexes into allTracks that failed a link check or errored during playback
  const failed = new SvelteSet<number>()

  const tracksA = $derived(tape.tracks.filter(t => t.side !== 'b'))
  const tracksB = $derived(tape.tracks.filter(t => t.side === 'b'))
  const allTracks = $derived([...tracksA, ...tracksB])
  const midpoint = $derived(tracksA.length)
  const currentSide = $derived(currentTrackIndex < midpoint ? 'A' : 'B')
  const currentTrack = $derived(allTracks[currentTrackIndex])
  const isAudioTrack = $derived(currentTrack?.kind === 'audio')
  const hasYoutubeTracks = $derived(allTracks.some(t => t.kind === 'youtube' && !t.unavailable))
  const isLoaded = $derived(hasYoutubeTracks ? ytReady : true)

  function isUnavailable(index: number) {
    return !!allTracks[index]?.unavailable || failed.has(index)
  }

  function sideStart() {
    return currentSide === 'A' ? 0 : midpoint
  }

  function sideEnd() {
    return currentSide === 'A' ? midpoint - 1 : allTracks.length - 1
  }

  // Next playable index from `from` in direction `dir`, staying on the current side; -1 if none
  function findPlayable(from: number, dir: 1 | -1) {
    for (let i = from; i >= sideStart() && i <= sideEnd(); i += dir) {
      if (!isUnavailable(i)) return i
    }
    return -1
  }

  function goToTrack(index: number) {
    currentTrackIndex = index
    const track = allTracks[index]
    if (!track || isUnavailable(index)) return
    if (track.kind === 'audio') {
      player?.stopVideo?.()
      if (audioEl) {
        audioEl.src = track.src
        if (isPlaying) audioEl.play().catch(() => {})
      }
    } else {
      audioEl?.pause()
      if (!player) return
      if (isPlaying) player.loadVideoById(track.src)
      else player.cueVideoById(track.src)
    }
  }

  function advance() {
    const nextIdx = findPlayable(currentTrackIndex + 1, 1)
    if (nextIdx >= 0) goToTrack(nextIdx)
    else isPlaying = false
  }

  function play() {
    if (isUnavailable(currentTrackIndex)) {
      const nextIdx = findPlayable(currentTrackIndex, 1)
      if (nextIdx < 0) return
      isPlaying = true
      goToTrack(nextIdx)
      return
    }
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

  function next() {
    const nextIdx = findPlayable(currentTrackIndex + 1, 1)
    if (nextIdx >= 0) goToTrack(nextIdx)
  }

  function prev() {
    const prevIdx = findPlayable(currentTrackIndex - 1, -1)
    if (prevIdx >= 0) {
      goToTrack(prevIdx)
    } else if (isAudioTrack) {
      if (audioEl) audioEl.currentTime = 0
    } else {
      player?.seekTo(0, true)
    }
  }

  function switchSide() {
    const targetStart = currentSide === 'A' ? midpoint : 0
    if (targetStart >= allTracks.length) return
    stop()
    currentTrackIndex = targetStart
    const first = findPlayable(targetStart, 1)
    goToTrack(first >= 0 ? first : targetStart)
  }

  // Placeholder for every kind of failure; the "warped gap" design comes later
  function markFailed(index: number) {
    failed.add(index)
    if (index === currentTrackIndex && isPlaying) advance()
  }

  function onYoutubeStateChange(event: any) {
    if (event.data === 0 && isPlaying) advance()
    else if (event.data === 1) isPlaying = true
  }

  function onYoutubeError() {
    if (currentTrack?.kind === 'youtube') markFailed(currentTrackIndex)
  }

  function onAudioError() {
    if (isAudioTrack && currentTrack?.src && audioEl?.getAttribute('src')) markFailed(currentTrackIndex)
  }

  onMount(() => {
    const first = findPlayable(0, 1)
    if (first > 0) currentTrackIndex = first

    if (hasYoutubeTracks) {
      const initPlayer = () => {
        player = new (window as any).YT.Player('youtube-player', {
          height: '1',
          width: '1',
          videoId: currentTrack?.kind === 'youtube' && !isUnavailable(currentTrackIndex) ? currentTrack.src : undefined,
          playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: () => { ytReady = true },
            onStateChange: onYoutubeStateChange,
            onError: onYoutubeError,
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

    // Results only mark tracks; a track that's already playing is left alone
    if (checkLinks) checkTracks(allTracks, i => { if (!(i === currentTrackIndex && isPlaying)) failed.add(i) })

    return () => { if (player?.destroy) player.destroy() }
  })
</script>

<div style="position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;" aria-hidden="true">
  <div id="youtube-player"></div>
  <!-- svelte-ignore a11y_media_has_caption -->
  <audio
    bind:this={audioEl}
    src={isAudioTrack && !isUnavailable(currentTrackIndex) ? currentTrack?.src : undefined}
    onended={advance}
    onerror={onAudioError}
  ></audio>
</div>

<header class="tape-header">
  <h1 class="tape-title">{tape.title}</h1>
  {#if tape.dedication}
    <p class="tape-dedication">{tape.dedication}</p>
  {/if}
</header>

<div class="cassette-container">
  <div class="cassette-wrap">
    <img src={cassette} alt="Cassette tape" class="cassette-image" />
    {#if tape.coverUrl && !coverFailed}
      <img
        src={tape.coverUrl}
        alt="Cover"
        class="cover-image"
        style="object-position: {tape.coverPosition ?? '50% 50%'}"
        onerror={() => coverFailed = true}
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
    canNext={findPlayable(currentTrackIndex + 1, 1) >= 0}
    hasSideB={tracksB.length > 0}
    {currentSide}
  />
</div>

<div class="track-list">
  <div class="side-tracks">
    <p class="side-label">Side {currentSide}</p>
    {#each currentSide === 'A' ? tracksA : tracksB as track, i}
      {@const index = (currentSide === 'A' ? 0 : midpoint) + i}
      <div class="track-item" class:active={index === currentTrackIndex} class:unavailable={isUnavailable(index)}>
        <span class="track-number">{i + 1}.</span>
        <span class="track-title">{track.title}</span>
        {#if isUnavailable(index)}
          <span class="track-status">unavailable</span>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
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

  .track-item.unavailable .track-title {
    color: var(--color-gray-muted);
    text-decoration: line-through;
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

  .track-status {
    font-family: 'Chivo Mono', monospace;
    font-size: var(--text-xs);
    color: var(--color-gray-muted);
  }

  @media (max-width: 500px) {
    .tape-title { font-size: var(--text-3xl); }
    .player-controls { gap: var(--space-1); }
  }
</style>
