<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import Toasts from '$lib/components/Toasts.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<Toasts />
