<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    onclick,
    disabled = false,
    'aria-label': ariaLabel = '',
    class: cls = '',
    children,
  }: {
    onclick?: () => void
    disabled?: boolean
    'aria-label'?: string
    class?: string
    children?: Snippet
  } = $props()

  let pressed = $state(false)

  function down() { if (!disabled) pressed = true }
  function up() { pressed = false }
</script>

<button
  class="metallic-btn {cls}"
  class:is-pressed={pressed}
  {onclick}
  {disabled}
  aria-label={ariaLabel}
  onpointerdown={down}
  onpointerup={up}
  onpointerleave={up}
  onpointercancel={up}
>
  <span class="m-height" aria-hidden="true"></span>
  <span class="m-face" aria-hidden="true">
    <span class="m-inner" aria-hidden="true"></span>
    <span class="m-label">{#if children}{@render children()}{/if}</span>
  </span>
</button>

<style>
  .metallic-btn {
    position: relative;
    height: 48px;
    width: 84px;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  /* ── Depth edge (28px, 8px visible below outer) ── */
  .m-height {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    height: 28px;
    border-radius: 0 0 4px 4px;
    background: linear-gradient(180deg, #9A9F9D 19.23%, #2E3537 74.52%, #C1C2C3 100%);
  }

  /* ── Outer face (40px) ── */
  .m-face {
    position: absolute;
    left: 0; right: 0;
    top: 0; height: 40px;
    border-radius: 4px;
    background: linear-gradient(180deg, #393B3A 0%, #656362 19.48%, #E8E6E4 28.82%, #E3E2E0 55.71%, #9BA0A1 69.42%, #797E80 85.18%, #9CA19E 100%);
    transition: transform 0.08s ease;
  }

  /* ── Inner surface (32px: 4px inset top and bottom within 40px face) ── */
  .m-inner {
    position: absolute;
    left: 4px; right: 4px;
    top: 4px; bottom: 4px;
    border-radius: 4px;
    background: linear-gradient(0deg, #E2E1DF 29.02%, #9CA19E 100%);
    box-shadow:
      inset 0px -4px 4px #4A4E51,
      inset 0px -4px 12px rgba(16, 18, 22, 0.2),
      inset 0px 4px 4px #575B5F;
  }

  /* ── Label ── */
  .m-label {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 2px;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 400;
    color: #4D4D4C;
    line-height: 1;
    user-select: none;
  }

  /* ── Press ── */
  .is-pressed .m-face   { transform: translateY(8px); }
  .is-pressed .m-height { height: 20px; }

  /* ── Hover ── */
  .metallic-btn:not(:disabled):not(.is-pressed):hover .m-face {
    transition: background 800ms, transform 0.08s ease;
    background: linear-gradient(180deg, #393B3A 0%, #656362 18.27%, #E8E6E4 42.31%, #E3E2E0 62.98%, #9BA0A1 76.44%, #797E80 90.38%, #9CA19E 100%);
  }
  .metallic-btn:not(:disabled):not(.is-pressed):hover .m-inner {
    transition: background 800ms;
    background: linear-gradient(0deg, #E2E1DF 61.06%, #9CA19E 100%);
  }

  /* ── Disabled ── */
  .metallic-btn:disabled { cursor: default; }
  .metallic-btn:disabled .m-label { opacity: 0.25; }

  /* ══ Per-button corner radii ══ */

  /* stop — 4px all corners (default, no overrides needed) */

  /* prev — left-pill, right-flat */
  .metallic-btn.prev-btn .m-face   { border-radius: 40px 8px 8px 40px; }
  .metallic-btn.prev-btn .m-inner  { border-radius: 36px 4px 4px 36px; }
  .metallic-btn.prev-btn .m-height { border-radius: 0 0 4px 20px; }

  /* next — left-flat, right-pill */
  .metallic-btn.next-btn .m-face   { border-radius: 8px 40px 40px 8px; }
  .metallic-btn.next-btn .m-inner  { border-radius: 4px 36px 36px 4px; }
  .metallic-btn.next-btn .m-height { border-radius: 0 0 20px 4px; }

  /* switch — full pill */
  .metallic-btn.switch-btn { width: 160px; }
  .metallic-btn.switch-btn .m-face   { border-radius: 40px; }
  .metallic-btn.switch-btn .m-inner  { border-radius: 36px; }
  .metallic-btn.switch-btn .m-height { border-radius: 0 0 20px 20px; }
  .metallic-btn.switch-btn .m-label  { padding-left: 20px; padding-right: 20px; }
</style>
