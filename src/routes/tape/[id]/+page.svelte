<script lang="ts">
  import type { PageData } from './$types'
  import cassette from '$lib/assets/Casette-empty.png'
  import { fly } from 'svelte/transition'
  import { cubicIn } from 'svelte/easing'
  import TapeButton from '$lib/components/TapeButton.svelte'
  import TapePlayer from '$lib/components/TapePlayer.svelte'
  import { tapeFromDb } from '$lib/tape'
  import { saveFlip } from '$lib/flip'
  import { page } from '$app/state'

  let { data }: { data: PageData } = $props()

  let intro = $state(page.url.searchParams.get('skip_intro') !== 'true')
  let saving = $state(false)
  let saveError = $state('')
  const tape = $derived(tapeFromDb(data.tape, data.tracks))

  async function save() {
    if (saving) return
    saving = true
    saveError = ''
    try {
      await saveFlip(tape)
    } catch (e) {
      console.error('[tape] could not save', e)
      saveError = 'Couldn’t save the tape. Please try again.'
    } finally {
      saving = false
    }
  }
</script>

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
        {#if data.tape.dedication}
          <span class="intro-label-desc">{data.tape.dedication}</span>
        {/if}
        <TapeButton
          onclick={() => intro = false}
          background="#f7f4ec"
          color="#000000"
          style="padding: 8px 18px; font-size: 13px;"
        >
          Put on the tape →
        </TapeButton>
      </div>
    </div>
  </div>
{/if}

<main class="tape-page" class:hidden={intro}>
  <TapePlayer {tape} />

  <div class="save-tape">
    <TapeButton onclick={save} style="padding: 8px 18px; font-size: 13px;">
      {saving ? 'Saving…' : 'Save tape'}
    </TapeButton>
    {#if saveError}
      <p class="save-error" role="alert">{saveError}</p>
    {/if}
    <p class="save-hint">Keep it as a .flip file and play it anytime at <a href="/play">/play</a></p>
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
    top: 50%;
    transform: translateY(-50%);
    width: 262px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px;
    gap: 6px;
    box-sizing: border-box;
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

  .save-tape {
    max-width: 500px;
    margin: var(--space-8) auto 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
  }

  .save-hint {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--color-gray-muted);
    text-align: center;
  }

  .save-error {
    margin: 0;
    font-size: var(--text-sm);
    color: #b3261e;
    text-align: center;
  }

  .save-hint a {
    color: inherit;
  }
</style>
