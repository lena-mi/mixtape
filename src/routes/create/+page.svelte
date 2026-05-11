<script lang="ts">
  import type { ActionData } from './$types'
  let { form }: { form: ActionData } = $props()
</script>

<main style="max-width: 600px; margin: 40px auto; padding: 0 20px; font-family: sans-serif;">
  <h1>New tape</h1>

  <form method="POST" action="?/createTape">
    <label for="title">Tape title</label>
    <input
      id="title"
      name="title"
      type="text"
      placeholder="Summer 2025"
      style="width: 100%; padding: 8px; margin: 8px 0 16px; box-sizing: border-box;"
    />

    <label for="dedication">Dedication (optional)</label>
    <input
      id="dedication"
      name="dedication"
      type="text"
      placeholder="For someone special..."
      style="width: 100%; padding: 8px; margin: 8px 0 16px; box-sizing: border-box;"
    />

    {#if form?.error}
      <p style="color: red;">{form.error}</p>
    {/if}

    <button type="submit">Create tape</button>
  </form>
</main>