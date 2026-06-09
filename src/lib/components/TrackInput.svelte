<script lang="ts">
  import { isYoutubeUrl, rewriteAudioUrl, probeAudio, formatDuration, extractFilename } from '$lib/utils/audioUrl'
  import type { AudioSourceType, CommitHint } from '$lib/utils/audioUrl'

  type TrackState = 'idle' | 'processing' | 'probing' | 'naming' | 'filled' | 'renaming' | 'error'

  let {
    index,
    oncommit,
    onrename,
    initialState = 'idle',
    initialTitle = '',
  }: {
    index: number
    oncommit?: (url: string, hint?: CommitHint) => Promise<{ title: string }>
    onrename?: (newTitle: string) => Promise<void>
    initialState?: TrackState
    initialTitle?: string
  } = $props()

  let trackState: TrackState = $state(initialState)
  let url = $state('')
  let title = $state(initialTitle)
  let renameValue = $state('')
  let nameValue = $state('')
  let probedDuration = $state(0)
  let probedResolvedUrl = $state('')
  let probedSourceType: AudioSourceType = $state('unknown')
  let errorMessage = $state('')
  let nameInputEl: HTMLInputElement | null = $state(null)

  const SIDE_LIMIT = 2700

  const displayText = $derived(title)

  $effect(() => {
    if (trackState === 'naming' && nameInputEl) nameInputEl.focus()
  })

  async function confirm() {
    if (!url.trim() || !oncommit) return
    if (trackState === 'processing' || trackState === 'probing') return

    const rawUrl = url.trim()

    if (isYoutubeUrl(rawUrl)) {
      trackState = 'processing'
      try {
        const result = await oncommit(rawUrl)
        title = result.title
        trackState = 'filled'
      } catch (e) {
        errorMessage = e instanceof Error ? e.message : 'Could not load this track'
        trackState = 'error'
      }
    } else {
      trackState = 'probing'
      errorMessage = ''
      const { resolvedUrl, sourceType } = rewriteAudioUrl(rawUrl)

      if (sourceType === 'google_drive') {
        const gdId = rawUrl.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)?.[1] ?? ''
        const [metaResult, probeResult] = await Promise.allSettled([
          gdId ? fetch(`/api/gdrive-meta?id=${gdId}`).then(r => r.json()) : Promise.resolve({ filename: '', duration: 0 }),
          probeAudio(resolvedUrl, 20000),
        ])
        const meta = metaResult.status === 'fulfilled' ? metaResult.value : { filename: '', duration: 0 }
        const duration = (meta.duration > 0)
          ? meta.duration
          : (probeResult.status === 'fulfilled' ? probeResult.value.duration : 0)
        if (duration > SIDE_LIMIT) {
          errorMessage = `This track is ${formatDuration(duration)} — longer than 45 minutes`
          trackState = 'error'
          return
        }
        try {
          const result = await oncommit(rawUrl, {
            title: meta.filename || 'Google Drive track',
            resolvedUrl,
            sourceType: 'google_drive',
            duration,
          })
          title = result.title
          trackState = 'filled'
        } catch (e) {
          errorMessage = e instanceof Error ? e.message : 'Could not save this track'
          trackState = 'error'
        }
        return
      }

      try {
        const { duration } = await probeAudio(resolvedUrl)
        if (duration > SIDE_LIMIT) {
          errorMessage = `This track is ${formatDuration(duration)} — longer than 45 minutes`
          trackState = 'error'
          return
        }
        probedResolvedUrl = resolvedUrl
        probedSourceType = sourceType
        probedDuration = duration
        nameValue = extractFilename(resolvedUrl) || extractFilename(rawUrl)
        trackState = 'naming'
      } catch (e) {
        if (e instanceof Error && e.message !== 'invalid_duration' && e.message !== 'load_error' && e.message !== 'timeout') {
          errorMessage = e.message
          trackState = 'error'
        } else {
          errorMessage = "Couldn't load this file. It may be private, or the host may block external playback."
          trackState = 'error'
        }
      }
    }
  }

  async function confirmNaming() {
    if (!nameValue.trim() || !oncommit) return

    trackState = 'processing'
    try {
      const result = await oncommit(url.trim(), {
        title: nameValue.trim(),
        resolvedUrl: probedResolvedUrl,
        sourceType: probedSourceType,
        duration: probedDuration,
      })
      title = result.title
      trackState = 'filled'
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : 'Could not save this track'
      trackState = 'error'
    }
  }

  function handleUrlKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') resetToIdle()
  }

  function handleNamingKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') confirmNaming()
    if (e.key === 'Escape') resetToIdle()
  }

  function resetToIdle() {
    url = ''
    title = ''
    nameValue = ''
    probedDuration = 0
    probedResolvedUrl = ''
    errorMessage = ''
    trackState = 'idle'
  }

  function startRenaming() {
    renameValue = displayText
    trackState = 'renaming'
  }

  function saveRename() {
    if (!renameValue.trim()) return
    title = renameValue.trim()
    trackState = 'filled'
    onrename?.(title)
  }

  function handleRenameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') saveRename()
    if (e.key === 'Escape') trackState = 'filled'
  }
</script>

<div class="track-wrap">
  <div class="track-row">
    <div
      class="track-field"
      class:is-idle={trackState === 'idle'}
      class:is-error={trackState === 'error'}
      class:is-processing={trackState === 'processing' || trackState === 'probing'}
    >
      <span class="track-label">{index}:</span>

      {#if trackState === 'idle' || trackState === 'error'}
        <input
          class="url-input"
          type="text"
          bind:value={url}
          onkeydown={handleUrlKeydown}
          onblur={confirm}
          placeholder=""
          aria-label="YouTube or audio URL for track {index}"
          aria-invalid={trackState === 'error'}
        />

      {:else if trackState === 'processing' || trackState === 'probing'}
        <div class="processing-fill" aria-label="Loading…" aria-busy="true"></div>

      {:else if trackState === 'naming'}
        <div class="naming-wrap">
          <span class="duration-badge">{formatDuration(probedDuration)}</span>
          <input
            bind:this={nameInputEl}
            class="name-input"
            type="text"
            bind:value={nameValue}
            onkeydown={handleNamingKeydown}
            onblur={confirmNaming}
            placeholder="Track name"
            aria-label="Name for track {index}"
          />
          <button
            class="check-btn"
            onclick={confirmNaming}
            disabled={!nameValue.trim()}
            aria-label="Confirm track name"
          ><svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.1722 0.370117C10.6294 0.370135 11 0.748804 11 1.21591C11 1.68302 10.6294 2.06169 10.1722 2.06171C9.93989 2.06171 9.79425 2.07424 9.70004 2.09392C9.65975 2.10235 9.63805 2.1107 9.6289 2.11457C9.14198 2.53158 8.85848 2.80023 8.489 3.39483C8.08935 4.03807 7.5949 5.05565 6.74683 6.98699C6.02426 8.6325 5.5567 10.1455 5.06124 11.3878C4.83998 11.9425 4.58648 12.5091 4.27787 12.8712C4.12237 13.0537 3.85136 13.3069 3.45326 13.3602C3.00867 13.4196 2.66228 13.2019 2.44515 12.9803C2.05144 12.5783 1.47772 11.7392 1.02796 11.04C0.793418 10.6754 0.575688 10.322 0.409506 10.0406C0.326688 9.90037 0.253927 9.77387 0.197697 9.67058C0.156009 9.594 0.0846837 9.46177 0.0457109 9.3468C-0.103788 8.90545 0.125483 8.4234 0.55745 8.27055C0.989427 8.11781 1.46124 8.35206 1.61084 8.79339C1.59373 8.74292 1.58712 8.74195 1.64479 8.84791C1.68813 8.92751 1.75026 9.03594 1.8275 9.16673C1.98139 9.42733 2.18702 9.76232 2.41119 10.1108C2.70988 10.5752 3.01757 11.0217 3.2649 11.3523C3.33973 11.1966 3.42847 10.9987 3.52764 10.7501C3.93807 9.72111 4.52126 7.92405 5.23667 6.29482C6.08011 4.37405 6.6185 3.24868 7.09122 2.48791C7.59173 1.68244 8.01892 1.28515 8.5747 0.809535C9.05082 0.402085 9.68077 0.370117 10.1722 0.370117Z" fill="currentColor"/></svg></button>
        </div>

      {:else if trackState === 'filled'}
        <span class="filled-text">{displayText}</span>
        <div class="track-actions">
          <button class="action-btn" onclick={startRenaming}>rename</button>
          <button class="action-btn" onclick={resetToIdle}>change link</button>
        </div>

      {:else if trackState === 'renaming'}
        <div class="rename-wrap">
          <input
            class="rename-input"
            type="text"
            bind:value={renameValue}
            onkeydown={handleRenameKeydown}
            aria-label="Rename track {index}"
          />
          <button
            class="check-btn"
            onclick={saveRename}
            disabled={!renameValue.trim()}
            aria-label="Confirm rename"
          ><svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.1722 0.370117C10.6294 0.370135 11 0.748804 11 1.21591C11 1.68302 10.6294 2.06169 10.1722 2.06171C9.93989 2.06171 9.79425 2.07424 9.70004 2.09392C9.65975 2.10235 9.63805 2.1107 9.6289 2.11457C9.14198 2.53158 8.85848 2.80023 8.489 3.39483C8.08935 4.03807 7.5949 5.05565 6.74683 6.98699C6.02426 8.6325 5.5567 10.1455 5.06124 11.3878C4.83998 11.9425 4.58648 12.5091 4.27787 12.8712C4.12237 13.0537 3.85136 13.3069 3.45326 13.3602C3.00867 13.4196 2.66228 13.2019 2.44515 12.9803C2.05144 12.5783 1.47772 11.7392 1.02796 11.04C0.793418 10.6754 0.575688 10.322 0.409506 10.0406C0.326688 9.90037 0.253927 9.77387 0.197697 9.67058C0.156009 9.594 0.0846837 9.46177 0.0457109 9.3468C-0.103788 8.90545 0.125483 8.4234 0.55745 8.27055C0.989427 8.11781 1.46124 8.35206 1.61084 8.79339C1.59373 8.74292 1.58712 8.74195 1.64479 8.84791C1.68813 8.92751 1.75026 9.03594 1.8275 9.16673C1.98139 9.42733 2.18702 9.76232 2.41119 10.1108C2.70988 10.5752 3.01757 11.0217 3.2649 11.3523C3.33973 11.1966 3.42847 10.9987 3.52764 10.7501C3.93807 9.72111 4.52126 7.92405 5.23667 6.29482C6.08011 4.37405 6.6185 3.24868 7.09122 2.48791C7.59173 1.68244 8.01892 1.28515 8.5747 0.809535C9.05082 0.402085 9.68077 0.370117 10.1722 0.370117Z" fill="currentColor"/></svg></button>
        </div>
      {/if}
    </div>
  </div>

  {#if trackState === 'error' && errorMessage}
    <p class="error-hint">{errorMessage}</p>
  {/if}
</div>

<style>
  .track-wrap {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .track-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .track-field {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-4) var(--space-4) var(--space-4) var(--space-6);
    background: var(--color-tape-bg);
    border-bottom: 1.5px solid transparent;
    transition: border-bottom-color 0.15s;
    min-width: 0;
  }

  .track-field.is-idle,
  .track-field.is-error {
    border-bottom-color: var(--color-black);
  }

  .track-field.is-idle:hover {
    border-bottom-color: var(--color-gray-secondary);
  }

  .track-field.is-idle:focus-within {
    border-bottom-color: var(--color-black);
  }

  .track-field.is-error {
    border-bottom-color: #c00;
  }

  .error-hint {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-xs);
    color: #c00;
    padding: var(--space-1) var(--space-4) 0 var(--space-6);
  }

  .track-label {
    font-size: var(--text-base);
    font-weight: 700;
    letter-spacing: var(--tracking-base);
    white-space: nowrap;
    user-select: none;
    flex-shrink: 0;
  }

  /* ── Idle: input fills remaining space ── */

  .url-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: var(--text-base);
    letter-spacing: var(--tracking-base);
    color: var(--color-black);
    outline: none;
    min-width: 0;
  }

  /* ── Processing/probing: shimmer ── */

  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  .processing-fill {
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

  /* ── Naming: duration badge + name input ── */

  .naming-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .duration-badge {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-xs);
    color: var(--color-gray-muted);
  }

  .name-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: var(--text-base);
    letter-spacing: var(--tracking-base);
    color: var(--color-black);
    outline: none;
    min-width: 0;
  }

  /* ── Filled: Caveat display + action buttons ── */

  .filled-text {
    font-family: 'Caveat', cursive;
    font-size: 18px;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--color-black);
    line-height: var(--leading-snug);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .track-actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-shrink: 0;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-xs);
    color: var(--color-black);
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
    white-space: nowrap;
    transition: color 0.15s;
  }

  .action-btn:hover {
    color: var(--color-gray-secondary);
  }

  /* ── Renaming: inline input with confirm ── */

  .rename-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    margin: calc(-1 * var(--space-2) - 1px) 0;
    border: 1px solid var(--color-gray-border);
    border-radius: var(--radius-md);
    background: var(--color-white);
    transition: border-color 0.15s;
    min-width: 0;
  }

  .rename-wrap:focus-within {
    border-color: var(--color-black);
  }

  .rename-input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: var(--text-base);
    letter-spacing: var(--tracking-base);
    color: var(--color-black);
    outline: none;
    min-width: 0;
  }

  .check-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    font-size: var(--text-base);
    color: var(--color-gray-muted);
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }

  .check-btn:hover:not(:disabled) {
    color: var(--color-black);
  }

  .check-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
