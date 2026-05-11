<script lang="ts">
  import { supabase } from '$lib/supabase'
  import { onMount } from 'svelte'

  onMount(async () => {
    const { data, error } = await supabase.from('tapes').select('*')
    if (error) {
      console.error('Supabase error:', error.message)
    } else {
      console.log('Connected! Tapes:', data)
    }
  })
</script>

<h1>Mixtape</h1>