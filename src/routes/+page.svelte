<svelte:head>
  <title>Flip+Spin — Make someone a tape</title>
</svelte:head>

<div class="landing">
  <div class="video-container">
    <div class="video-frame"></div>
  </div>

  <p class="tagline">Where has sincere listening gone? Make someone a tape and share it peer-to-peer.</p>

  <div class="kofi" aria-label="Support on Ko-fi"></div>
</div>

<style>
  .landing {
    position: relative;
    width: 100%;
    height: calc(100vh - var(--header-h));
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
  }

  .tagline {
    position: absolute;
    width: 469px;
    left: calc(50% - 234.5px);
    top: 304px;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 20px;
    line-height: 24px;
    color: #000000;
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
