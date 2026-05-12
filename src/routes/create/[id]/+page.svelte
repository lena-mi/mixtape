<script lang="ts">
  import type { PageData, ActionData } from './$types'
  let { data, form }: { data: PageData, form: ActionData } = $props()

  let youtubeUrl = $state('')
  let trackTitle = $state('')
  let trackArtist = $state('')
  let loading = $state(false)
  let inputError = $state('')
  let playingId = $state<string | null>(null)

  function extractYoutubeVideoId(url: string): string | null {
    // Handle youtube.com, youtu.be, and youtube-nocookie.com
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube-nocookie\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Just the ID
    ]
    
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    
    return null
  }

  async function addTrack() {
    inputError = ''

    if (!youtubeUrl.trim()) {
      inputError = 'Please enter a YouTube URL or video ID'
      return
    }

    if (!trackTitle.trim()) {
      inputError = 'Please enter a track title'
      return
    }

    const videoId = extractYoutubeVideoId(youtubeUrl.trim())
    if (!videoId) {
      inputError = 'Please enter a valid YouTube URL or video ID'
      return
    }

    loading = true

    try {
      const formData = new FormData()
      formData.append('youtube_id', videoId)
      formData.append('youtube_url', `https://www.youtube.com/watch?v=${videoId}`)
      formData.append('title', trackTitle.trim())
      formData.append('artist', trackArtist.trim())

      console.log('Submitting form with:', { videoId, title: trackTitle.trim(), artist: trackArtist.trim() })

      const response = await fetch(`?/addTrack`, {
        method: 'POST',
        body: formData
      })

      console.log('Response status:', response.status)
      const responseText = await response.text()
      console.log('Response text:', responseText)

      if (response.ok) {
        // Reset form
        youtubeUrl = ''
        trackTitle = ''
        trackArtist = ''
        console.log('Track added successfully, reloading...')
        location.reload()
      } else {
        try {
          const errorData = JSON.parse(responseText)
          inputError = errorData.error || `Error: ${response.status}`
        } catch {
          inputError = `Error: ${response.status} - ${responseText.substring(0, 100)}`
        }
        console.error('Failed to add track:', inputError)
      }
    } catch (err) {
      inputError = `Network error: ${err}`
      console.error('Network error:', err)
    } finally {
      loading = false
    }
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
      <label for="youtube_url" style="display: block; margin-bottom: 4px; font-weight: bold;">YouTube URL or Video ID</label>
      <input
        type="text"
        id="youtube_url"
        bind:value={youtubeUrl}
        placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
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
      disabled={loading || !youtubeUrl.trim()}
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
        {#if track.storage_path}
          <iframe
            width="100%"
            height="120"
            src="https://www.youtube.com/embed/{track.storage_path}"
            title={track.title}
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            style="margin-top: 8px; border-radius: 4px;"
          ></iframe>
        {:else}
          <p style="color: red; margin-top: 8px;">Video not found</p>
        {/if}
      {/if}
    </div>
  {/each}

  <hr />
  <a href="/tape/{data.tape.id}">
    <button>Share this tape →</button>
  </a>
</main>