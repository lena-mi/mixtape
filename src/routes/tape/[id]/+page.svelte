<script lang="ts">
  import type { PageData } from './$types'
  import cassette from '$lib/assets/Casette.jpg'

  let { data }: { data: PageData } = $props()

  function getEmbedUrl(url: string) {
    const encoded = encodeURIComponent(url)
    return `https://bandcamp.com/EmbeddedPlayer/url=${encoded}/size=small/bgcol=d2d2d2/linkcol=0687f5/transparent=true/`
  }
</script>

<main class="tape-page">
  <div class="tape-header">
    <h1 class="tape-title">{data.tape.title}</h1>
    {#if data.tape.dedication}
      <p class="tape-dedication">{data.tape.dedication}</p>
    {/if}
  </div>

  <div class="cassette-container">
    <img src={cassette} alt="Cassette tape" class="cassette-image" />

    <div class="tracks-overlay">
      {#each data.tracks as track, index}
        <div class="track-label" style="top: {20 + index * 15}%">
          {track.title} — {track.artist}
        </div>
      {/each}
    </div>
  </div>

  <span class="players-section">
    {#each data.tracks as track}
      {#if track.source_type === 'bandcamp' && track.source_url}
        <div class="track-player">
          <div class="bandcamp-player-frame">
            <iframe
              src={getEmbedUrl(track.source_url)}
              class="bandcamp-embed"
              allowfullscreen
              title={track.title}
            ></iframe>
          </div>
        </div>
      {/if}
    {/each}
  </span>
</main>

<style>
  .tape-page {
    min-height: 100vh;
    background: white;
    padding: 20px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: black;
  }

  .tape-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .tape-title {
    font-size: 2rem;
    font-weight: bold;
    color: black;
    margin: 0 0 10px 0;
  }

  .tape-dedication {
    font-size: 1.1rem;
    color: black;
    font-style: italic;
    margin: 0;
  }

  .cassette-container {
    position: relative;
    max-width: 600px;
    margin: 0 auto 40px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .cassette-image {
    width: 100%;
    max-width: 500px;
    height: auto;
    display: block;
  }

  .tracks-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .track-label {
    position: absolute;
    left: 13%;    margin-top: 12px;    color: black;
    font-size: 0.9rem;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: auto;
  }

  .players-section {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 500px;
    margin: 0 auto;
    padding: 10px;
    background: #d2d2d2;
  }

  .track-player {
    background: transparent;
    border: none;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
    outline: none;
    margin: 0;
  }

  .bandcamp-player-frame {
    max-width: 700px;
    width: 100%;
    height: 42px;
    position: relative;
    border: none;
    background: #d2d2d2;
  }

  .bandcamp-embed {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: 0;
    outline: none;
    background: transparent;
    display: block;
  }

  @media (max-width: 768px) {
    .tape-title {
      font-size: 1.5rem;
    }

    .track-label {
      font-size: 0.8rem;
    }

    .cassette-image {
      max-width: 400px;
    }
  }
</style>