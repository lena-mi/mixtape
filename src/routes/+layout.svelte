<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import '../app.css';
	import ManifestoDialog from '$lib/components/ManifestoDialog.svelte';

	let { children } = $props();
	const isLanding = $derived(page.route.id === '/');
	let manifestoOpen = $state(false);
	let mobileMenuOpen = $state(false);

	function openManifesto() {
		manifestoOpen = true
		mobileMenuOpen = false
	}

	function closeMobileMenu() {
		mobileMenuOpen = false
	}

	function scramble(node: HTMLElement) {
		const original = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
		let ids: ReturnType<typeof setTimeout>[] = []

		node.style.width = node.offsetWidth + 'px'

		function shuffle(word: string) {
			const a = [...word]
			for (let i = a.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1))
				;[a[i], a[j]] = [a[j], a[i]]
			}
			return a.join('')
		}

		function shuffled() {
			return original.split(' ').map(shuffle).join(' ')
		}

		function run() {
			ids.forEach(clearTimeout)
			ids = [
				setTimeout(() => { node.textContent = shuffled() }, 0),
				setTimeout(() => { node.textContent = shuffled() }, 60),
				setTimeout(() => { node.textContent = shuffled() }, 120),
				setTimeout(() => { node.textContent = original },   180),
			]
		}

		function reset() {
			ids.forEach(clearTimeout)
			node.textContent = original
		}

		node.addEventListener('mouseenter', run)
		node.addEventListener('mouseleave', reset)

		return {
			destroy() {
				ids.forEach(clearTimeout)
				node.removeEventListener('mouseenter', run)
				node.removeEventListener('mouseleave', reset)
			}
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="site-header" class:transparent={isLanding}>
	<a href="/" class="brand" use:scramble>Flip+Spin</a>

	<nav class="nav-links">
		<a href="/create" class="nav-link nav-new" use:scramble>New Mixtape</a>
		<button class="nav-link" onclick={() => (manifestoOpen = true)} use:scramble>Manifesto</button>
		<a href="/tape/96662555-062c-420f-8967-b445da49fd5c?skip_intro=true" class="nav-link" use:scramble>Tape of the Season</a>
		<a href="https://buymeacoffee.com/le_na_mi" target="_blank" rel="noopener" class="nav-link bmc-link" use:scramble>Buy me a coffee</a>
	</nav>

	<button
		class="menu-toggle"
		class:open={mobileMenuOpen}
		onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
		aria-label="Menu"
		aria-expanded={mobileMenuOpen}
	>
		<span></span><span></span><span></span>
	</button>
</header>

{#if mobileMenuOpen}
	<div class="mobile-menu" transition:fly={{ y: -16, duration: 200 }}>
		<a href="/create" class="mobile-link" onclick={closeMobileMenu} use:scramble>New Mixtape</a>
		<button class="mobile-link" onclick={openManifesto} use:scramble>Manifesto</button>
		<a href="/tape/96662555-062c-420f-8967-b445da49fd5c?skip_intro=true" class="mobile-link" onclick={closeMobileMenu} use:scramble>Tape of the Season</a>
		<a href="https://buymeacoffee.com/le_na_mi" target="_blank" rel="noopener" class="mobile-link" onclick={closeMobileMenu} use:scramble>Buy me a coffee</a>
	</div>
{/if}

<ManifestoDialog bind:open={manifestoOpen} />

<div class="layout-body">
	{@render children()}
</div>

<style>
	.site-header {
		position: fixed;
		left: 0;
		right: 0;
		top: 0;
		padding: 12px 48px;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 48px;
		z-index: 1000;
		background: var(--color-page-bg);
	}

	.site-header.transparent {
		background: transparent;
	}

	.site-header.transparent::after {
		display: none;
	}

	.site-header.transparent .brand,
	.site-header.transparent .nav-link {
		color: #f7f4ec;
	}

	.site-header.transparent .nav-new::before {
		background: #f7f4ec;
	}

	.site-header.transparent .menu-toggle span {
		background: #f7f4ec;
	}

	.site-header::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.3;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)'/%3E%3C/svg%3E");
		background-repeat: repeat;
		background-size: 200px 200px;
	}

	.brand {
		font-family: 'Inter', sans-serif;
		font-weight: 700;
		font-size: 16px;
		line-height: 19px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #000000;
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
	}

	.nav-link {
		font-family: 'Inter', sans-serif;
		font-weight: 400;
		font-size: 16px;
		line-height: 19px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #000000;
		text-decoration: none;
		white-space: nowrap;
		overflow: hidden;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.nav-new {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-weight: 700;
	}

	.nav-new::before {
		content: '';
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #000000;
		flex-shrink: 0;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 48px;
		margin-left: auto;
	}

	.bmc-link {
		margin-left: auto;
	}

	.menu-toggle {
		display: none;
		flex-direction: column;
		align-items: flex-end;
		justify-content: center;
		gap: 6px;
		width: 28px;
		height: 22px;
		margin-left: auto;
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		z-index: 1001;
	}

	.menu-toggle span {
		display: block;
		width: 100%;
		height: 2px;
		background: #000000;
		transition: transform 0.25s ease, opacity 0.2s ease, width 0.25s ease;
	}

	.menu-toggle span:nth-child(2) {
		width: 70%;
	}

	.menu-toggle.open span {
		width: 100%;
	}

	.menu-toggle.open span:nth-child(1) {
		transform: translateY(8px) rotate(45deg);
	}

	.menu-toggle.open span:nth-child(2) {
		opacity: 0;
	}

	.menu-toggle.open span:nth-child(3) {
		transform: translateY(-8px) rotate(-45deg);
	}

	.mobile-menu {
		position: fixed;
		left: 0;
		right: 0;
		top: var(--header-h);
		bottom: 0;
		z-index: 999;
		display: flex;
		flex-direction: column;
		gap: 28px;
		padding: 40px 32px;
		background: var(--color-page-bg);
		overflow-y: auto;
	}

	.mobile-link {
		font-family: 'Inter', sans-serif;
		font-weight: 500;
		font-size: 28px;
		line-height: 1.1;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: #000000;
		text-decoration: none;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
	}

	.layout-body {
		padding-top: var(--header-h);
	}

	@media (max-width: 949px) {
		.site-header {
			padding: 12px 24px;
		}

		.nav-links {
			display: none;
		}

		.menu-toggle {
			display: flex;
		}
	}
</style>
