<script lang="ts">
  import { page } from '$app/stores'
  import errorBg from '$lib/assets/error-page.jpg'

  const is404 = $derived($page.status === 404)
  const errorText = $derived(
    is404
      ? 'The page you are looking for might not be reachable'
      : 'Something went wrong on our end. Try again in a moment'
  )
</script>

<div class="error-page">
  <img src={errorBg} alt="" class="error-bg" aria-hidden="true" />
  <div class="error-card">
    <span class="error-code">{$page.status}</span>
    <p class="error-message">{errorText}</p>
  </div>
</div>

<style>
  .error-page {
    position: fixed;
    inset: 0;
    background: #b0b0b0;
    overflow: hidden;
  }

  .error-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
    user-select: none;
  }

  .error-card {
    position: absolute;
    top: 40px;
    right: 40px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 15px;
    padding: 20px;
    width: 276px;
    background: #c3c3c3;
    border: 2px dashed #000;
    box-sizing: border-box;
  }

  .error-code {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 400;
    font-size: 40px;
    line-height: 1.2;
    color: #000;
    white-space: nowrap;
    flex: none;
  }

  .error-message {
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    font-size: 13px;
    line-height: 16px;
    color: #000;
    flex: 1;
    min-width: 0;
    margin: 0;
    word-wrap: break-word;
  }

  @media (max-width: 400px) {
    .error-card {
      right: 16px;
      top: 16px;
      width: calc(100vw - 32px);
    }
  }
</style>
