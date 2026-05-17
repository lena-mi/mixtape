<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    onclick,
    disabled = false,
    'aria-label': ariaLabel = '',
    class: cls = '',
    children,
  }: {
    onclick?: () => void
    disabled?: boolean
    'aria-label'?: string
    class?: string
    children?: Snippet
  } = $props()
</script>

<button class="metallic-btn {cls}" {onclick} {disabled} aria-label={ariaLabel}>
  <span class="metallic-btn-gloss" aria-hidden="true"></span>
  <span>{#if children}{@render children()}{/if}</span>
</button>
