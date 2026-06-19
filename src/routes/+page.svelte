<script lang="ts">
  import introVideo from '$lib/assets/intro-video.mov'

  let vid0: HTMLVideoElement
  let vid1: HTMLVideoElement
  let active = $state(0)
  let crossfading = false
  const FADE = 0.8

  function onTimeUpdate(i: number) {
    const self = i === 0 ? vid0 : vid1
    const other = i === 0 ? vid1 : vid0
    if (!self || !other || crossfading || i !== active) return
    if (isNaN(self.duration)) return
    if (self.duration - self.currentTime <= FADE) {
      crossfading = true
      other.currentTime = 0
      other.play().catch(() => {})
      active = 1 - i
      setTimeout(() => { crossfading = false }, FADE * 1000 + 100)
    }
  }
</script>

<svelte:head>
  <title>Flip+Spin — Make someone a tape</title>
</svelte:head>

<div class="landing">
  <div class="video-container">
    <div class="video-frame">
      <!-- svelte-ignore a11y_media_has_caption -->
      <video bind:this={vid0} src={introVideo} autoplay muted playsinline
        class="video-bg" style="opacity: {active === 0 ? 1 : 0}"
        ontimeupdate={() => onTimeUpdate(0)}></video>
      <!-- svelte-ignore a11y_media_has_caption -->
      <video bind:this={vid1} src={introVideo} muted playsinline
        class="video-bg" style="opacity: {active === 1 ? 1 : 0}"
        ontimeupdate={() => onTimeUpdate(1)}></video>
    </div>
  </div>

  <p class="tagline">Where has sincere listening gone? <br> Make someone a tape and share it peer-to-peer.</p>

  <a href="/create" class="btn-create">Create tape</a>

  <div class="kofi" aria-label="Support on Ko-fi"></div>
</div>

<style>
  .landing {
    position: relative;
    width: 100%;
    height: 100vh;
    margin-top: calc(-1 * var(--header-h));
    background: #EDEBE3;
    overflow: hidden;
  }

  .landing::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 100;
    opacity: 0.3;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 200px 200px;
  }

  .video-container {
    position: absolute;
    inset: 0 0 2px 0;
    background: #DBD7CD;
    padding: 40px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .video-frame {
    box-sizing: border-box;
    align-self: stretch;
    flex-grow: 1;
    background: #c0bbb2;
    border: 1px solid #ffffff;
    border-radius: 20px;
    position: relative;
    overflow: hidden;
  }

  .video-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    
    transition: opacity 0.8s ease;
  }

  .tagline {
    position: absolute;
    width: 700px;
    left: calc(50% - 350px);
    top: 304px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 40px;
    line-height: 48px;
    color: #000000;
    letter-spacing: -0.03em;
    /*text-transform: uppercase;*/
  }

  .btn-create {
    position: absolute;
    left: calc(50% - 350px);
    top: 484px;
    display: inline-block;
    padding: 14px 32px;
    background: #000;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: 16px;
    letter-spacing: -0.03em;
    text-decoration: none;
    border-radius: 8px;
    transition: opacity 0.15s;
  }

  .btn-create:hover {
    opacity: 0.75;
  }

  .kofi {
    position: absolute;
    width: 34px;
    height: 27px;
    right: 44px;
    top: 7px;
    background: #b0aca3;
    border-radius: 4px;
    mix-blend-mode: darken;
  }
</style>
