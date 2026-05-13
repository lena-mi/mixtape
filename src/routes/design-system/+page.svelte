<script lang="ts">
  import TrackInput from '$lib/components/TrackInput.svelte'
</script>

<main class="ds-page">
  <h1 class="ds-page-title">Design System</h1>

  <!-- ── Colors ── -->
  <section class="ds-section">
    <h2 class="ds-section-title">Colors</h2>

    <div class="ds-group">
      <h3 class="ds-group-title">Base</h3>
      <div class="swatch-row">
        <div class="swatch">
          <div class="swatch-block" style="background: var(--color-black); border: 1px solid var(--color-gray-border);"></div>
          <code>--color-black</code>
          <span class="swatch-value">#000000</span>
        </div>
        <div class="swatch">
          <div class="swatch-block" style="background: var(--color-white); border: 1px solid var(--color-gray-border);"></div>
          <code>--color-white</code>
          <span class="swatch-value">#ffffff</span>
        </div>
      </div>
    </div>

    <div class="ds-group">
      <h3 class="ds-group-title">Gray</h3>
      <div class="swatch-row">
        <div class="swatch">
          <div class="swatch-block" style="background: var(--color-gray-secondary);"></div>
          <code>--color-gray-secondary</code>
          <span class="swatch-value">#666666 — captions, artists</span>
        </div>
        <div class="swatch">
          <div class="swatch-block" style="background: var(--color-gray-muted);"></div>
          <code>--color-gray-muted</code>
          <span class="swatch-value">#999999 — labels, numbers</span>
        </div>
        <div class="swatch">
          <div class="swatch-block" style="background: var(--color-gray-border); border: 1px solid #eee;"></div>
          <code>--color-gray-border</code>
          <span class="swatch-value">#dddddd — dividers</span>
        </div>
        <div class="swatch">
          <div class="swatch-block" style="background: var(--color-gray-surface); border: 1px solid #eee;"></div>
          <code>--color-gray-surface</code>
          <span class="swatch-value">#d2d2d2 — cassette surface</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ── Spacing ── -->
  <section class="ds-section">
    <h2 class="ds-section-title">Spacing</h2>
    <p class="ds-description">Base-4 scale. Token name × 4 = px value.</p>

    <div class="spacing-list">
      {#each [
        { token: '--space-1',  px: '4px'  },
        { token: '--space-2',  px: '8px'  },
        { token: '--space-3',  px: '12px' },
        { token: '--space-4',  px: '16px' },
        { token: '--space-6',  px: '24px' },
        { token: '--space-8',  px: '32px' },
        { token: '--space-12', px: '48px' },
        { token: '--space-16', px: '64px' },
      ] as step}
        <div class="spacing-row">
          <code class="spacing-name">{step.token}</code>
          <div class="spacing-bar" style="width: var({step.token}); height: var(--space-4); background: var(--color-black);"></div>
          <span class="spacing-px">{step.px}</span>
        </div>
      {/each}
    </div>
  </section>

  <!-- ── Typography ── -->
  <section class="ds-section">
    <h2 class="ds-section-title">Typography</h2>
    <p class="ds-description">Inter — contextual alternates on. Letter-spacing tuned per size.</p>

    <div class="type-list">
      {#each [
        { size: '--text-xs',   tracking: '--tracking-xs',   detail: '12px · +0.04em'  },
        { size: '--text-sm',   tracking: '--tracking-sm',   detail: '14px · +0.01em'  },
        { size: '--text-base', tracking: '--tracking-base', detail: '16px · 0'         },
        { size: '--text-lg',   tracking: '--tracking-lg',   detail: '18px · −0.01em'  },
        { size: '--text-xl',   tracking: '--tracking-xl',   detail: '20px · −0.014em' },
        { size: '--text-2xl',  tracking: '--tracking-2xl',  detail: '24px · −0.019em' },
        { size: '--text-3xl',  tracking: '--tracking-3xl',  detail: '30px · −0.021em' },
        { size: '--text-4xl',  tracking: '--tracking-4xl',  detail: '36px · −0.022em' },
      ] as step}
        <div class="type-row">
          <div class="type-meta">
            <code>{step.size}</code>
            <span class="type-detail">{step.detail}</span>
          </div>
          <p class="type-sample" style="font-size: var({step.size}); letter-spacing: var({step.tracking});">
            Mixtape for you
          </p>
        </div>
      {/each}
    </div>

    <div class="ds-group">
      <h3 class="ds-group-title">Caveat — track display</h3>
      <div class="type-row">
        <div class="type-meta">
          <code>font-family: 'Caveat'</code>
          <span class="type-detail">18px · tracking 0 · used for filled track names</span>
        </div>
        <p style="font-family: 'Caveat', cursive; font-size: 18px; letter-spacing: 0;">
          Mixtape for you — Artist Name
        </p>
      </div>
    </div>
  </section>

  <!-- ── Inputs ── -->
  <section class="ds-section">
    <h2 class="ds-section-title">Inputs</h2>

    <div class="ds-group">
      <h3 class="ds-group-title">Text input</h3>
      <div class="input-col">
        <input class="input" type="text" placeholder="Placeholder text" />
        <input class="input" type="text" value="Filled value" />
        <input class="input" type="text" placeholder="Disabled" disabled />
      </div>
    </div>
  </section>

  <!-- ── Buttons ── -->
  <section class="ds-section">
    <h2 class="ds-section-title">Buttons</h2>

    <div class="ds-group">
      <h3 class="ds-group-title">Primary</h3>
      <div class="btn-row">
        <button class="btn btn-primary">Play All</button>
        <button class="btn btn-primary btn-icon" aria-label="Play">▶</button>
        <button class="btn btn-primary" disabled>Disabled</button>
      </div>
    </div>

    <div class="ds-group">
      <h3 class="ds-group-title">Outline</h3>
      <div class="btn-row">
        <button class="btn btn-outline">Next →</button>
        <button class="btn btn-outline btn-icon" aria-label="Stop">■</button>
        <button class="btn btn-outline" disabled>Disabled</button>
      </div>
    </div>
  </section>

  <!-- ── TrackInput ── -->
  <section class="ds-section">
    <h2 class="ds-section-title">TrackInput</h2>
    <p class="ds-description">Four states: idle → processing → filled → renaming.</p>

    <div class="ds-group">
      <h3 class="ds-group-title">Idle — enter YouTube URL</h3>
      <TrackInput index={1} />
    </div>

    <div class="ds-group">
      <h3 class="ds-group-title">Processing</h3>
      <TrackInput index={2} mockState="processing" />
    </div>

    <div class="ds-group">
      <h3 class="ds-group-title">Filled</h3>
      <TrackInput index={3} mockState="filled" mockTitle="Midnight City" mockArtist="M83" />
    </div>

    <div class="ds-group">
      <h3 class="ds-group-title">Renaming</h3>
      <TrackInput index={4} mockState="renaming" mockTitle="Midnight City" mockArtist="M83" />
    </div>
  </section>
</main>

<style>
  .ds-page {
    max-width: 760px;
    margin: 0 auto;
    padding: var(--space-12) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
  }

  .ds-page-title {
    font-size: var(--text-4xl);
    font-weight: 700;
    letter-spacing: var(--tracking-4xl);
    line-height: var(--leading-tight);
  }

  /* Sections */
  .ds-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .ds-section-title {
    font-size: var(--text-xl);
    font-weight: 600;
    letter-spacing: var(--tracking-xl);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--color-gray-border);
  }

  .ds-description {
    font-size: var(--text-sm);
    color: var(--color-gray-secondary);
    letter-spacing: var(--tracking-sm);
    margin-top: calc(-1 * var(--space-3));
  }

  .ds-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .ds-group-title {
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: var(--tracking-xs);
    text-transform: uppercase;
    color: var(--color-gray-muted);
  }

  /* Colors */
  .swatch-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
  }

  .swatch {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .swatch-block {
    width: 80px;
    height: 48px;
    border-radius: var(--radius-md);
  }

  .swatch code {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-xs);
  }

  .swatch-value {
    font-size: var(--text-xs);
    color: var(--color-gray-secondary);
    letter-spacing: var(--tracking-xs);
  }

  /* Spacing */
  .spacing-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .spacing-row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }

  .spacing-name {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-xs);
    min-width: 100px;
  }

  .spacing-px {
    font-size: var(--text-xs);
    color: var(--color-gray-secondary);
    letter-spacing: var(--tracking-xs);
  }

  /* Typography */
  .type-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  .type-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-6);
    flex-wrap: wrap;
  }

  .type-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 200px;
  }

  .type-meta code {
    font-size: var(--text-xs);
    letter-spacing: var(--tracking-xs);
  }

  .type-detail {
    font-size: var(--text-xs);
    color: var(--color-gray-secondary);
    letter-spacing: var(--tracking-xs);
  }

  .type-sample {
    line-height: var(--leading-tight);
  }

  /* Inputs */
  .input-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 320px;
  }

  /* Buttons */
  .btn-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
</style>
