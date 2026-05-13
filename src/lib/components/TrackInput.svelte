<script lang="ts">
  type TrackState = 'idle' | 'processing' | 'filled' | 'renaming'

  let {
    index,
    oncommit,
    ondelete,
    initialState = 'idle',
    initialTitle = '',
    initialArtist = '',
  }: {
    index: number
    oncommit?: (url: string) => Promise<{ title: string; artist: string }>
    ondelete?: () => void
    initialState?: TrackState
    initialTitle?: string
    initialArtist?: string
  } = $props()

  // Intentional one-time init from props — we own this state from here on
  let trackState: TrackState = $state(initialState)
  let url = $state('')
  let title = $state(initialTitle)
  let artist = $state(initialArtist)
  let renameValue = $state('')

  const displayText = $derived(artist ? `${title} — ${artist}` : title)

  async function confirm() {
    if (!url.trim() || !oncommit) return
    trackState = 'processing'
    try {
      const result = await oncommit(url.trim())
      title = result.title
      artist = result.artist
      trackState = 'filled'
    } catch {
      trackState = 'idle'
    }
  }

  function handleUrlKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') url = ''
  }

  function resetToIdle() {
    url = ''
    title = ''
    artist = ''
    trackState = 'idle'
  }

  function startRenaming() {
    renameValue = displayText
    trackState = 'renaming'
  }

  function saveRename() {
    const sep = renameValue.indexOf('—')
    if (sep !== -1) {
      title = renameValue.slice(0, sep).trim()
      artist = renameValue.slice(sep + 1).trim()
    } else {
      title = renameValue.trim()
      artist = ''
    }
    trackState = 'filled'
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') saveRename()
    if (e.key === 'Escape') trackState = 'filled'
  }
</script>

<div class="track-row">
  <span class="track-label">Track {index}:</span>

  <div class="track-field">
    {#if trackState === 'idle'}
      <input
        class="url-input"
        type="text"
        bind:value={url}
        onkeydown={handleUrlKeydown}
        placeholder=""
        aria-label="YouTube URL for track {index}"
      />

    {:else if trackState === 'processing'}
      <div class="processing-line" aria-label="Processing…" aria-busy="true"></div>

    {:else if trackState === 'filled'}
      <button
        class="filled-text"
        onclick={resetToIdle}
        title="Click to change the YouTube link"
      >{displayText}</button>
      <button class="rename-btn" onclick={startRenaming}>rename track</button>

    {:else if trackState === 'renaming'}
      <input
        class="input rename-input"
        type="text"
        bind:value={renameValue}
        onkeydown={handleRenameKeydown}
        aria-label="Rename track {index}"
      />
      <button
        class="delete-btn"
        onclick={ondelete}
        aria-label="Delete track {index}"
      >×</button>
    {/if}
  </div>
</div>

<style>
  .track-row {
    display: grid;
    grid-template-columns: 96px 1fr;
    align-items: center;
    gap: var(--space-3);
  }

  .track-label {
    text-align: right;
    font-size: var(--text-base);
    font-weight: 500;
    letter-spacing: var(--tracking-base);
    white-space: nowrap;
    user-select: none;
  }

  .track-field {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* ── Idle: underline-only input ── */

  .url-input {
    flex: 1;
    border: none;
    border-bottom: 1.5px solid var(--color-black);
    border-radius: 0;
    background: transparent;
    padding: var(--space-1) 0;
    font-family: inherit;
    font-size: var(--text-base);
    letter-spacing: var(--tracking-base);
    color: var(--color-black);
    outline: none;
    transition: border-bottom-color 0.15s;
  }

  .url-input:hover {
    border-bottom-color: var(--color-gray-border);
  }

  .url-input:focus {
    border-bottom-color: var(--color-black);
  }

  /* ── Processing: shimmer on the line ── */

  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  .processing-line {
    flex: 1;
    height: 1.5px;
    background: linear-gradient(
      90deg,
      var(--color-black) 0%,
      var(--color-gray-border) 50%,
      var(--color-black) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }

  /* ── Filled: Caveat handwriting display ── */

  .filled-text {
    font-family: 'Caveat', cursive;
    font-size: 18px;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--color-black);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    line-height: var(--leading-snug);
    text-align: left;
  }

  .rename-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-xs);
    color: var(--color-gray-muted);
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.15s;
  }

  .rename-btn:hover {
    color: var(--color-black);
  }

  /* ── Renaming: standard input + delete ── */

  .rename-input {
    flex: 1;
  }

  .delete-btn {
    flex-shrink: 0;
    background: none;
    border: 1px solid var(--color-gray-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: var(--text-base);
    color: var(--color-gray-muted);
    width: var(--space-8);
    height: var(--space-8);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s, color 0.15s;
  }

  .delete-btn:hover {
    border-color: var(--color-black);
    color: var(--color-black);
  }
</style>
