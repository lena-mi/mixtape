import { supabaseAdmin } from '$lib/supabaseAdmin'
import { fail, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
  createTape: async ({ request }) => {
    const data = await request.formData()
    const title = data.get('title') as string
    const dedication = data.get('dedication') as string

    if (!title) {
      return fail(400, { error: 'Please give your tape a title' })
    }

    // Create the tape
    const { data: tape, error } = await supabaseAdmin
      .from('tapes')
      .insert({ title, dedication })
      .select()
      .single()

    if (error) {
      return fail(500, { error: error.message })
    }

    // Redirect to the tape editor with the new tape's ID
    redirect(303, `/create/${tape.id}`)
  }
}