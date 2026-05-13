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
  <RedButton onclick={onplay} disabled={!isLoaded || isPlaying} />
  <MetallicButton onclick={onprev} disabled={!canPrev} aria-label="Previous">⏮</MetallicButton>
  <MetallicButton onclick={onstop} disabled={!isPlaying} aria-label="Stop">■</MetallicButton>
  <MetallicButton onclick={onnext} disabled={!canNext} aria-label="Next">⏭</MetallicButton>
  <MetallicButton class="switch-btn" onclick={onswitchside} disabled={!hasSideB} aria-label="Switch side">
    {currentSide === 'A' ? 'SIDE B' : 'SIDE A'}
  </MetallicButton>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }
</style>
