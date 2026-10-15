<script lang="ts">
  import cassette from '$lib/assets/Casette-empty.png'
  import TapeButton from '$lib/components/TapeButton.svelte'
  import TapePlayer from '$lib/components/TapePlayer.svelte'
  import { decodeFlip, FlipError, MAX_FILE_BYTES, type FlipErrorCode } from '$lib/flip'
  import type { PlayerTape } from '$lib/tape'

  const ERRORS: Record<FlipErrorCode, string> = {
    damaged: 'This tape is damaged — it doesn’t look like a .flip file.',
    newer_version: 'This tape needs a newer player. Try refreshing the page.',
    too_large: 'This file is too big to be a tape.',
  }

  let tape: PlayerTape | null = $state(null)
  let error = $state('')
  let dragging = $state(false)
  let loading = $state(false)
  let fileInput: HTMLInputElement | null = $state(null)

  async function insert(file: File | undefined) {
    if (!file) return
    error = ''
    if (file.size > MAX_FILE_BYTES) {
      error = ERRORS.too_large
      return
    }
    loading = true
    try {
      tape = await decodeFlip(await file.text())
    } catch (e) {
      console.error('[play] could not insert tape', e)
      error = ERRORS[e instanceof FlipError ? e.code : 'damaged']
    } finally {
      loading = false
    }
  }

  function eject() {
    tape = null
    error = ''
    if (fileInput) fileInput.value = ''
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragging = false
    insert(e.dataTransfer?.files[0])
  }
</script>

<svelte:head>
  <title>Flip+Spin — Tape player</title>
</svelte:head>

<svelte:window
  ondragover={(e) => { e.preventDefault(); if (!tape) dragging = true }}
  ondragleave={(e) => { if (!e.relatedTarget) dragging = false }}
  ondrop={onDrop}
/>

<!-- No `accept`: iOS greys out unknown extensions like .flip, so the contents are checked instead -->
<input
  bind:this={fileInput}
  type="file"
  class="file-input"
  onchange={(e) => { insert(e.currentTarget.files?.[0]); e.currentTarget.value = '' }}
/>

<main class="play-page">
  {#if tape}
    {#key tape}
      <TapePlayer {tape} checkLinks />
    {/key}
    <div class="deck-actions">
      <TapeButton onclick={eject} style="padding: 8px 18px; font-size: 13px;">Eject</TapeButton>
    </div>
  {:else}
    <h1 class="deck-heading">Insert a tape</h1>

    <button
      type="button"
      class="deck"
      class:dragging
      onclick={() => fileInput?.click()}
      disabled={loading}
    >
      <img src={cassette} alt="" class="deck-cassette" draggable="false" />
      <span class="deck-slot">
        {loading ? 'Loading…' : dragging ? 'Drop it in' : 'Drop a .flip file here, or tap to choose'}
      </span>
    </button>

    {#if error}
      <p class="deck-error" role="alert">{error}</p>
    {/if}

    <p class="deck-hint">Saved a tape from a share link? This is where it plays.</p>
  {/if}
</main>

<style>
  .file-input {
    display: none;
  }

  .play-page {
    min-height: 100vh;
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .play-page > :global(*) {
    width: 100%;
  }

  .deck-heading {
    font-family: 'Caveat', cursive;
    font-weight: 400;
    font-size: 50px;
    line-height: 63px;
    letter-spacing: -1px;
    text-align: center;
    margin: var(--space-8) 0 var(--space-4);
  }

  .deck {
    position: relative;
    width: 100%;
    max-width: 500px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }

  .deck:disabled {
    cursor: progress;
  }

  .deck-cassette {
    display: block;
    width: 100%;
    height: auto;
    opacity: 0.35;
    filter: grayscale(1);
    transition: opacity 0.2s ease;
  }

  .deck:hover .deck-cassette,
  .deck:focus-visible .deck-cassette,
  .deck.dragging .deck-cassette {
    opacity: 0.6;
  }

  .deck-slot {
    position: absolute;
    inset: 12% 8%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    border: 2px dashed var(--color-gray-muted);
    border-radius: var(--radius-md);
    font-family: 'Chivo Mono', monospace;
    font-size: 13px;
    line-height: 15px;
    color: var(--color-black);
    text-align: center;
  }

  .deck.dragging .deck-slot {
    border-color: var(--color-black);
    background: rgba(255, 255, 255, 0.4);
  }

  .deck-error {
    margin: var(--space-4) 0 0;
    font-size: var(--text-sm);
    color: #b3261e;
    text-align: center;
  }

  .deck-hint {
    margin: var(--space-4) 0 0;
    font-size: var(--text-xs);
    color: var(--color-gray-muted);
    text-align: center;
  }

  .deck-actions {
    display: flex;
    justify-content: center;
    margin-top: var(--space-8);
  }
</style>
