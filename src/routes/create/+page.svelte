<script lang="ts">
  import type { ActionData } from './$types'
  let { form }: { form: ActionData } = $props()
</script>

<main class="page">
  <h1 class="page-title">New tape</h1>

  <form class="form" method="POST" action="?/createTape">
    <div class="field">
      <label class="label" for="title">Tape title</label>
      <input
        class="input"
        id="title"
        name="title"
        type="text"
        placeholder="Summer 2025"
      />
    </div>

    <div class="field">
      <label class="label" for="dedication">Dedication (optional)</label>
      <input
        class="input"
        id="dedication"
        name="dedication"
        type="text"
        placeholder="For someone special…"
      />
    </div>

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    <button type="submit" class="btn btn-primary">Create tape</button>
  </form>
</main>

<style>
  .page {
    max-width: 480px;
    margin: 0 auto;
    padding: var(--space-12) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
  }

  .page-title {
    font-size: var(--text-4xl);
    font-weight: 700;
    letter-spacing: var(--tracking-4xl);
    line-height: var(--leading-tight);
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .label {
    font-size: var(--text-sm);
    font-weight: 500;
    letter-spacing: var(--tracking-sm);
  }

  .error {
    font-size: var(--text-sm);
    letter-spacing: var(--tracking-sm);
    color: #c00;
  }
</style>
