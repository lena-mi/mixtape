<script lang="ts">
  let {
    onclick,
    disabled = false,
    isPlaying = false,
  }: {
    onclick?: () => void
    disabled?: boolean
    isPlaying?: boolean
  } = $props()
</script>

<button class="red-btn" class:is-playing={isPlaying} {onclick} {disabled} aria-label="Play">
  <span class="red-btn-gloss"></span>
  <svg class="red-btn-icon" viewBox="0 0 9 11" fill="none" aria-hidden="true">
    <path d="M0 0L9 5.5L0 11Z" fill="#D9D9D9" />
  </svg>
</button>
