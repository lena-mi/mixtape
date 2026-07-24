<script lang="ts">
  import bgLoopVideo from '$lib/assets/bg_loop_web.mp4'
  import TapeButton from '$lib/components/TapeButton.svelte'
</script>

<svelte:head>
  <title>Flip+Spin — Make someone a tape</title>
</svelte:head>

<div class="landing">
  <div class="video-container">
    <div class="video-frame">
      <!-- svelte-ignore a11y_media_has_caption -->
      <video autoplay muted loop playsinline class="video-bg">
        <source src={bgLoopVideo} type="video/mp4" />
      </video>
    </div>
  </div>

  <div class="video-scrim"></div>

  <div class="hero-content">
    <p class="tagline">Where has sincere<br class="mobile-break"> listening gone? <br> Make someone a tape and<br class="mobile-break"> share it peer-to-peer</p>
    <TapeButton href="/create">Create a tape</TapeButton>
  </div>
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
    inset: 0;
  }

  .video-frame {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }

  .video-bg {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100vh;
    height: 100vw;
    transform: translate(-50%, -50%) rotate(270deg);
    object-fit: cover;
  }

  .video-scrim {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.4);
    mix-blend-mode: multiply;
  }

  .hero-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(700px, 88vw);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(24px, 5vw, 40px);
  }

  .tagline {
    margin: 0;
    text-align: center;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    font-size: clamp(24px, 6vw, 40px);
    line-height: 1.2;
    color: #f7f4ec;
    letter-spacing: -0.03em;
    /*text-transform: uppercase;*/
  }

  .mobile-break {
    display: none;
  }

  @media (max-width: 949px) {
    .mobile-break {
      display: inline;
    }
  }
</style>
