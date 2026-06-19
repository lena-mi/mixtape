<script lang="ts">
  import grain from '$lib/assets/grain-sample.png'
  import esc from '$lib/assets/icons/esc.svg'
  let { open = $bindable(false) }: { open: boolean } = $props()
  let dialog: HTMLDialogElement

  let angle = $state(0)
  let animating = false

  function spinClose() {
    if (animating) return
    animating = true
    const start = angle
    const end = start + 90
    const duration = 380
    const t0 = performance.now()
    function tick(now: number) {
      const t = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      angle = start + eased * 90
      if (t < 1) requestAnimationFrame(tick)
      else { angle = end; animating = false }
    }
    requestAnimationFrame(tick)
  }

  $effect(() => {
    if (!dialog) return
    if (open) dialog.showModal()
    else dialog.close()
  })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} onclose={() => (open = false)} onclick={(e) => { if (e.target === dialog) open = false }}>
  <button class="close-btn" onclick={() => (open = false)} onmouseenter={spinClose} aria-label="Close"><img src={esc} alt="Close" style="transform: rotate({angle}deg)" /></button>

  <div class="manifesto-wrap">
    <div class="text-layer blur-15" aria-hidden="true" >
      <span class="title">M a n i f e s t o</span>
      &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspToday music is being monopolized by big streaming companies, that trick us into paying them monthly for math-modeling our tastes and allowing global access to any kind of tunes and information you might want. But how much of it is that you actually need? How much of it in fact keeps you away from experiencing music in the enjoyable and caring way? <br><br>This project is a small, deliberate refusal. A tool for making mixtapes — acting like real ones, with a beginning and an end, given to a specific person, that expires. It's not a source for the algorithm to understand you. It is a space to share care, enjoy music intentionally and rebuild your connection with it. <br><br>We believe that "peer-to-peer" model is the only way to overthrow monopolies. And if you think closely, that is how we used to shape our music tastes a little earlier than just a decade ago, when limitation of knowledge made the space for curiosity and exploration to form. <br><br>That's why we integrated support for your own files as soon as they are stored anywhere online. That is why neither Spotify, nor Apple Music are integrated in this service. Because this is not a companion for streaming or a pretty wrapper for the playlists.
      <span class="end">* * *</span>
    </div>
    <div class="text-layer blur-10" aria-hidden="true">
      <span class="title">M a n i f e s t o</span>
      &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspToday music is being monopolized by big streaming companies, that trick us into paying them monthly for math-modeling our tastes and allowing global access to any kind of tunes and information you might want. But how much of it is that you actually need? How much of it in fact keeps you away from experiencing music in the enjoyable and caring way? <br><br>This project is a small, deliberate refusal. A tool for making mixtapes — acting like real ones, with a beginning and an end, given to a specific person, that expires. It's not a source for the algorithm to understand you. It is a space to share care, enjoy music intentionally and rebuild your connection with it. <br><br>We believe that "peer-to-peer" model is the only way to overthrow monopolies. And if you think closely, that is how we used to shape our music tastes a little earlier than just a decade ago, when limitation of knowledge made the space for curiosity and exploration to form. <br><br>That's why we integrated support for your own files as soon as they are stored anywhere online. That is why neither Spotify, nor Apple Music are integrated in this service. Because this is not a companion for streaming or a pretty wrapper for the playlists.
      <span class="end">* * *</span>
    </div>
    
    <div class="text-layer sharp">
      <span class="title">M a n i f e s t o</span>
      &nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbspToday music is being monopolized by big streaming companies, that trick us into paying them monthly for math-modeling our tastes and allowing global access to any kind of tunes and information you might want. But how much of it is that you actually need? How much of it in fact keeps you away from experiencing music in the enjoyable and caring way? <br><br>This project is a small, deliberate refusal. A tool for making mixtapes — acting like real ones, with a beginning and an end, given to a specific person, that expires. It's not a source for the algorithm to understand you. It is a space to share care, enjoy music intentionally and rebuild your connection with it. <br><br>We believe that "peer-to-peer" model is the only way to overthrow monopolies. And if you think closely, that is how we used to shape our music tastes a little earlier than just a decade ago, when limitation of knowledge made the space for curiosity and exploration to form. <br><br>That's why we integrated support for your own files as soon as they are stored anywhere online. That is why neither Spotify, nor Apple Music are integrated in this service. Because this is not a companion for streaming or a pretty wrapper for the playlists.
      <span class="end">* * *</span>
    </div>
    <div class="grain" style="--grain-url: url({grain})"></div>
  </div >
</dialog>

<style>
  dialog {
    position: fixed;
    inset: 24px 0;
    width: 920px;
    max-width: 100vw;
    height: calc(100vh - 48px);
    margin: 0 auto;
    padding: 0;
    border: none;
    background: transparent;
    overflow-y: auto;
    overflow-x: hidden;
  }

  dialog::backdrop {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .close-btn {
    position: fixed;
    top: 24px;
    right: 36px;
    z-index: 10;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.7;
    padding: 4px 8px;
    transition: opacity 0.15s;
  }

  .close-btn img {
    display: block;
    filter: invert(1) sepia(1) saturate(0) brightness(10);
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  .close-btn:hover img {
    opacity: 1;
  }

  .manifesto-wrap {
    position: relative;
    width: 920px;
    min-height: 1800px;
    background: #F7F3EF;
    overflow: hidden;
  }

  .grain {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background-image: var(--grain-url);
    background-repeat: repeat;
    background-size: 100px 100px;
    mix-blend-mode: overlay;
    opacity: 1;
  }

  .text-layer {
    position: absolute;
    width: 600px;
    left: 160px;
    top: 140px;
    font-family: 'Chivo Mono', monospace;
    font-style: normal;
    font-weight: 400;
    font-size: 24px;
    line-height: 40px;
    text-align: justify;
    letter-spacing: -2px;
    color: #000000;
  }

  .text-layer.blur-15 {
    filter: blur(1.2px);
  }

  .text-layer.blur-10 {
    filter: blur(0.8px);
  }

  .title {
    display: block;
    margin-bottom: 60px;
  }

  .end {
    display: block;
    margin-top: 100px;
    text-align: center;
  }

</style>
