<script lang="ts">
  import RedButton from './RedButton.svelte'
  import MetallicButton from './MetallicButton.svelte'

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
  <div class="play-wrap">
    <RedButton onclick={onplay} disabled={!isLoaded} {isPlaying} />
  </div>
  <MetallicButton class="prev-btn" onclick={onprev} disabled={!canPrev} aria-label="Previous">⏮</MetallicButton>
  <MetallicButton class="stop-btn" onclick={onstop} disabled={!isPlaying} aria-label="Pause">⏸</MetallicButton>
  <MetallicButton class="next-btn" onclick={onnext} disabled={!canNext} aria-label="Next">⏭</MetallicButton>
  <MetallicButton class="switch-btn" onclick={onswitchside} disabled={!hasSideB} aria-label="Switch side">
    {currentSide === 'A' ? 'SIDE B' : 'SIDE A'}
  </MetallicButton>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
  }

  .play-wrap {
    margin-top: 4px;
  }

  /* 2px between the three metallic control buttons */
  .controls :global(.metallic-btn) {
    margin-left: 4px;
  }

  /* 8px gap between red button and rewind */
  .controls :global(.prev-btn) {
    margin-left: 8px;
  }

  /* 20px gap before switch side */
  .controls :global(.switch-btn) {
    margin-left: 20px;
  }
</style>
