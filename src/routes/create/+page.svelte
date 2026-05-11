<script lang="ts">
  let bandcampUrl = $state('')
  let embedUrl = $state('')
  let error = $state('')

  function extractBandcampEmbed(url: string) {
    error = ''
    embedUrl = ''

    const isTrack = url.includes('/track/')
    const isAlbum = url.includes('/album/')

    if (!url.includes('bandcamp.com') || (!isTrack && !isAlbum)) {
        error = 'Please paste a Bandcamp track or album URL'
        return
    }

    const encoded = encodeURIComponent(url)
    embedUrl = `https://bandcamp.com/EmbeddedPlayer/url=${encoded}/size=large/bgcol=ffffff/linkcol=0687f5/minimal=true/transparent=true/`
    }
</script>

<main style="max-width: 600px; margin: 40px auto; padding: 0 20px; font-family: sans-serif;">
  <h1>Add a Bandcamp track</h1>

  <label for="url">Paste a Bandcamp URL</label>
  <input
    id="url"
    type="text"
    bind:value={bandcampUrl}
    placeholder="https://artist.bandcamp.com/track/..."
    style="width: 100%; padding: 8px; margin: 8px 0 16px; box-sizing: border-box;"
  />

  <button on:click={() => extractBandcampEmbed(bandcampUrl)}>
    Preview
  </button>

  {#if error}
    <p style="color: red; margin-top: 12px;">{error}</p>
  {/if}

  {#if embedUrl}
    <div style="margin-top: 24px;">
      <p>Preview:</p>
      <iframe
        src={embedUrl}
        style="border: 0; width: 100%; height: 120px;"
        seamless
        title="Bandcamp player"
      ></iframe>
    </div>
  {/if}
</main>