<script lang="ts">
  import { fly } from 'svelte/transition'
  import { toasts } from '$lib/stores/toasts'
</script>

<div class="toasts-wrap" aria-live="polite" aria-atomic="false">
  {#each $toasts as t (t.id)}
    <div class="toast toast--{t.kind}" role="status" transition:fly={{ y: -6, duration: 200 }}>
      {#if t.kind === 'warn'}
        <svg class="toast-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.871l-8.106-13.534a1.914 1.914 0 0 0-3.274 0z"/>
          <path d="M12 9v4"/><path d="M12 16h.01"/>
        </svg>
      {:else if t.kind === 'error'}
        <svg class="toast-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/><path d="M12 16h.01"/>
        </svg>
      {/if}
      <span class="toast-message">{t.message}</span>
    </div>
  {/each}
</div>

<style>
  .toasts-wrap {
    position: fixed;
    top: var(--space-6);
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-gray-border);
    background: var(--color-white);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    font-size: var(--text-sm);
    letter-spacing: var(--tracking-sm);
    white-space: nowrap;
    max-width: calc(100vw - var(--space-12));
    white-space: normal;
  }

  .toast--warn {
    background: #fffbeb;
    border-color: #fcd34d;
    color: #92400e;
  }

  .toast--error {
    background: #fef2f2;
    border-color: #fca5a5;
    color: #991b1b;
  }

  .toast-icon {
    flex-shrink: 0;
  }

  .toast-message {
    line-height: var(--leading-normal);
  }
</style>
