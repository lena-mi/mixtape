<script lang="ts">
  import type { PageData } from './$types'
  let { data }: { data: PageData } = $props()

  function getEmbedUrl(url: string) {
    const encoded = encodeURIComponent(url)
    return `https://bandcamp.com/EmbeddedPlayer/url=${encoded}/size=large/bgcol=ffffff/linkcol=0687f5/tracklist=false/transparent=true/`
  }
</script>

<main style="max-width: 600px; margin: 40px auto; padding: 0 20px; font-family: sans-serif;">
  <h1>{data.tape.title}</h1>
  {#if data.tape.dedication}
    <p style="color: gray;">{data.tape.dedication}</p>
  {/if}

  <hr />

  <pre>{JSON.stringify(data.tracks, null, 2)}</pre>
  
  {#each data.tracks as track}
    <div style="margin-bottom: 24px;">
      <p><strong>{track.title}</strong>{#if track.artist} — {track.artist}{/if}</p>
      {#if track.source_type === 'bandcamp' && track.source_url}
        <iframe
          src={getEmbedUrl(track.source_url)}
          style="border: 0; width: 100%; height: 120px;"
          seamless
          title={track.title}
        ></iframe>
      {/if}
    </div>
  {/each}
</main>