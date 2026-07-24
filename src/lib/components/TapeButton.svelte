<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    href,
    onclick,
    background = '#f7f4ec',
    color = '#000000',
    class: cls = '',
    style = '',
    children,
  }: {
    href?: string
    onclick?: () => void
    background?: string
    color?: string
    class?: string
    style?: string
    children?: Snippet
  } = $props()
</script>

{#if href}
  <a {href} class="tape-btn {cls}" style="--bg: {background}; --fg: {color}; {style}">
    {#if children}{@render children()}{/if}
  </a>
{:else}
  <button type="button" {onclick} class="tape-btn {cls}" style="--bg: {background}; --fg: {color}; {style}">
    {#if children}{@render children()}{/if}
  </button>
{/if}

<style>
  .tape-btn {
    display: inline-block;
    padding: 14px 32px;
    background: var(--bg);
    color: var(--fg);
    font-family: 'Inter', sans-serif;
    font-weight: 400;
    font-size: 16px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    text-decoration: none;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    cursor: pointer;
    box-sizing: border-box;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .tape-btn:hover {
    background: var(--fg);
    color: var(--bg);
  }
</style>
