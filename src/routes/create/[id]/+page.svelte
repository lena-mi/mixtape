<script lang="ts">
  import type { PageData, ActionData } from './$types'
  let { data, form }: { data: PageData, form: ActionData } = $props()

  let bandcampUrl = $state('')
  let loading = $state(false)
  let inputError = $state('')
  let playingId = $state<string | null>(null)

  async function addTrack() {
    inputError = ''

    const isTrack = bandcampUrl.includes('/track/')
    const isAlbum = bandcampUrl.includes('/album/')

    if (!bandcampUrl.includes('bandcamp.com') || (!isTrack && !isAlbum)) {
      inputError = 'Please paste a Bandcamp track or album URL'
      return
    }

    loading = true

    const encoded = encodeURIComponent(bandcampUrl)
    const res = await fetch(`/api/bandcamp-oembed?url=${encoded}`)
    const meta = await res.json()

    const formData = new FormData()
    formData.append('source_url', bandcampUrl)
    formData.append('source_type', 'bandcamp')
    formData.append('title', meta.title ?? 'Untitled')
    formData.append('artist', meta.artist ?? '')

    await fetch(`?/addTrack`, {
      method: 'POST',
      body: formData
    })

    bandcampUrl = ''
    loading = false
    location.reload()
  }
</script>

<main style="max-width: 600px; margin: 40px auto; padding: 0 20px; font-family: sans-serif;">
  <h1>{data.tape.title}</h1>
  {#if data.tape.dedication}
    <p style="color: gray;">{data.tape.dedication}</p>
  {/if}

  <hr />
  <h2>Add a track</h2>

  <div style="display: flex; gap: 8px;">
    <input
      type="text"
      bind:value={bandcampUrl}
      placeholder="https://artist.bandcamp.com/track/..."
      disabled={loading}
      style="flex: 1; padding: 8px; box-sizing: border-box;"
    />
    <button type="button" onclick={addTrack} disabled={loading}>
      {loading ? 'Adding...' : 'Add'}
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
    {@const embedUrl = `https://bandcamp.com/EmbeddedPlayer/url=${encodeURIComponent(track.source_url)}/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/`}
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
        <iframe
          src={embedUrl}
          style="border: 0; width: 100%; height: 120px; margin-top: 8px;"
          seamless
          title={track.title}
        ></iframe>
      {/if}
    </div>
  {/each}

  <hr />
  <a href="/tape/{data.tape.id}">
    <button>Share this tape →</button>
  </a>
</main>