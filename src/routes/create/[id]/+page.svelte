<script lang="ts">
  import type { PageData, ActionData } from './$types'
  let { data, form }: { data: PageData, form: ActionData } = $props()

  let selectedFile: File | null = $state(null)
  let trackTitle = $state('')
  let trackArtist = $state('')
  let loading = $state(false)
  let inputError = $state('')
  let playingId = $state<string | null>(null)

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      selectedFile = file
      // Auto-fill title from filename if empty
      if (!trackTitle) {
        trackTitle = file.name.replace(/\.[^/.]+$/, '') // Remove extension
      }
    }
  }

  async function addTrack() {
    inputError = ''

    if (!selectedFile) {
      inputError = 'Please select an audio file'
      return
    }

    if (!trackTitle.trim()) {
      inputError = 'Please enter a track title'
      return
    }

    loading = true

    const formData = new FormData()
    formData.append('audio_file', selectedFile)
    formData.append('title', trackTitle.trim())
    formData.append('artist', trackArtist.trim())

    const response = await fetch(`?/addTrack`, {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      // Reset form
      selectedFile = null
      trackTitle = ''
      trackArtist = ''
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      location.reload()
    } else {
      const errorData = await response.json()
      inputError = errorData.error || 'Failed to add track'
    }

    loading = false
  }
</script>

<main style="max-width: 600px; margin: 40px auto; padding: 0 20px; font-family: sans-serif;">
  <h1>{data.tape.title}</h1>
  {#if data.tape.dedication}
    <p style="color: gray;">{data.tape.dedication}</p>
  {/if}

  <hr />
  <h2>Add a track</h2>

  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div>
      <label for="audio_file" style="display: block; margin-bottom: 4px; font-weight: bold;">Audio file</label>
      <input
        type="file"
        id="audio_file"
        accept="audio/*"
        on:change={handleFileSelect}
        disabled={loading}
        style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
      />
    </div>

    <div>
      <label for="title" style="display: block; margin-bottom: 4px; font-weight: bold;">Track title</label>
      <input
        type="text"
        id="title"
        bind:value={trackTitle}
        placeholder="Enter track title"
        disabled={loading}
        style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
      />
    </div>

    <div>
      <label for="artist" style="display: block; margin-bottom: 4px; font-weight: bold;">Artist (optional)</label>
      <input
        type="text"
        id="artist"
        bind:value={trackArtist}
        placeholder="Enter artist name"
        disabled={loading}
        style="width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px;"
      />
    </div>

    <button
      type="button"
      onclick={addTrack}
      disabled={loading || !selectedFile}
      style="padding: 10px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
    >
      {loading ? 'Adding...' : 'Add Track'}
    </button>
  </div>

  {#if inputError}
    <p style="color: red; margin-top: 8px;">{inputError}</p>
  {/if}

  <hr />
  <h2>Tracks ({data.tracks.length})</h2>

  {#if data.tracks.length === 0}
    <p style="color: gray;">No tracks yet — add one above.</p>
  {/if}

  {#each data.tracks as track}
    <div style="padding: 8px 0; border-bottom: 1px solid #eee;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <button
          type="button"
          onclick={() => playingId = playingId === track.id ? null : track.id}
          style="background: none; border: 1px solid #ccc; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-size: 12px;"
        >
          {playingId === track.id ? '■' : '▶'}
        </button>
        <strong style="flex: 1;">{track.title}</strong>
        {#if track.artist}<span style="color: gray;">{track.artist}</span>{/if}
        <form method="POST" action="?/deleteTrack">
          <input type="hidden" name="id" value={track.id} />
          <button
            type="submit"
            style="background: none; border: none; cursor: pointer; color: #ccc; font-size: 16px; padding: 0 4px;"
          >
            ×
          </button>
        </form>
      </div>
      {#if playingId === track.id}
        {#if track.file_path}
          <audio
            src={track.file_path}
            controls
            style="width: 100%; margin-top: 8px;"
            title={track.title}
          ></audio>
        {:else}
          <p style="color: red; margin-top: 8px;">File not found</p>
        {/if}
      {/if}
    </div>
  {/each}

  <hr />
  <a href="/tape/{data.tape.id}">
    <button>Share this tape →</button>
  </a>
</main>