<script lang="ts">
  let {
    onplay,
    onstop,
    onnext,
    onprev,
    onswitchside,
    isPlaying = false,
    isLoaded = false,
    canPrev = false,
    canNext = false,
    hasSideB = false,
    currentSide = 'A',
  }: {
    onplay: () => void
    onstop: () => void
    onnext: () => void
    onprev: () => void
    onswitchside: () => void
    isPlaying?: boolean
    isLoaded?: boolean
    canPrev?: boolean
    canNext?: boolean
    hasSideB?: boolean
    currentSide?: 'A' | 'B'
  } = $props()
</script>

<div class="controls">
  <button
    class="play-btn"
    onclick={onplay}
    disabled={!isLoaded || isPlaying}
    aria-label="Play"
  >
    <span class="play-gloss"></span>
    <svg class="play-icon" viewBox="0 0 9 11" fill="none" aria-hidden="true">
      <path d="M0 0L9 5.5L0 11Z" fill="#D9D9D9" />
    </svg>
  </button>

  <button class="ctrl-btn" onclick={onprev} disabled={!canPrev} aria-label="Previous"><span>⏮</span></button>
  <button class="ctrl-btn" onclick={onstop} disabled={!isPlaying} aria-label="Stop"><span>■</span></button>
  <button class="ctrl-btn" onclick={onnext} disabled={!canNext} aria-label="Next"><span>⏭</span></button>
  <button class="ctrl-btn switch-btn" onclick={onswitchside} disabled={!hasSideB} aria-label="Switch side">
    <span>{currentSide === 'A' ? 'SIDE B' : 'SIDE A'}</span>
  </button>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }
</style>
