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

  let pressed = $state(false)

  function down() { if (!disabled) pressed = true }
  function up() { pressed = false }
</script>

<button
  class="red-btn"
  class:is-pressed={pressed}
  class:is-playing={isPlaying}
  {onclick}
  {disabled}
  aria-label="Play"
  onpointerdown={down}
  onpointerup={up}
  onpointerleave={up}
  onpointercancel={up}
>
  <span class="m-height" aria-hidden="true"></span>
  <span class="m-face" aria-hidden="true">
    <span class="m-inner" aria-hidden="true"></span>
    <svg class="m-icon" viewBox="0 0 9 11" fill="none" aria-hidden="true">
      <path d="M0 0L9 5.5L0 11Z" fill="#FFEAE3" />
    </svg>
  </span>
</button>

<style>
  .red-btn {
    position: relative;
    flex-shrink: 0;
    width: 50px;
    height: 48px;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .red-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Depth edge ── */
  .m-height {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 28px;
    border-radius: 0 0 20px 20px;
    background: linear-gradient(180deg, #D72E10 19.23%, #5B0505 74.52%, #610303 100%);
  }

  /* ── Outer face ── */
  .m-face {
    position: absolute;
    left: 0; right: 0;
    top: 0; height: 40px;
    border-radius: 44px;
    background: linear-gradient(180deg, #880000 0%, #E92A0B 19.48%, #FF5A5A 28.82%, #FF7E7E 55.71%, #FF5D4D 69.42%, #DB3030 85.18%, #A50808 100%);
    transition: transform 0.08s ease;
  }

  /* ── Inner surface ── */
  .m-inner {
    position: absolute;
    left: 4px; right: 4px;
    top: 4px; bottom: 4px;
    border-radius: 44px;
    background: linear-gradient(0deg, #FF4713 29.02%, #FF210D 100%);
    box-shadow:
      inset 0px -4px 4px #870000,
      inset 0px -4px 12px rgba(141, 0, 0, 0.2),
      inset 0px 4px 4px #910000;
  }

  /* ── Play icon ── */
  .m-icon {
    position: absolute;
    left: 44%;
    right: 38.86%;
    top: 35.7%;
    bottom: 37.5%;
  }

  /* ── Press ── */
  .is-pressed .m-face   { transform: translateY(8px); }
  .is-pressed .m-height { height: 20px; }

  /* ── Playing state — locked in pressed position, no color change ── */
  .is-playing {
    pointer-events: none;
  }
  .is-playing .m-face   { transform: translateY(8px); }
  .is-playing .m-height { height: 20px; }

  /* ── Hover ── */
  .red-btn:not(:disabled):not(.is-pressed):not(.is-playing):hover .m-face {
    transition: background 800ms, transform 0.08s ease;
    background: linear-gradient(180deg, #880000 0%, #FF3D1F 19.48%, #FF7A7A 28.82%, #FF9E9E 55.71%, #FF7D6D 69.42%, #F04040 85.18%, #C01010 100%);
  }
</style>
