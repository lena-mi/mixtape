<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import '../app.css';

	let { children } = $props();
	const isLanding = $derived($page.route.id === '/');

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
	<a href="#manifesto" class="nav-link" use:scramble>Manifesto</a>
	<a href="#tape-of-season" class="nav-link" use:scramble>Tape of the Season</a>
	<a href="/create" class="nav-link nav-new" use:scramble>New Mixtape</a>
</header>

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

	.layout-body {
		padding-top: var(--header-h);
	}
</style>
