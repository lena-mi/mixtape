import { supabaseAdmin } from '$lib/supabaseAdmin'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
  const { data: tape } = await supabaseAdmin
    .from('tapes')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!tape) {
    error(404, 'Tape not found')
  }

  const { data: tracks } = await supabaseAdmin
    .from('tracks')
    .select('*')
    .eq('tape_id', params.id)
    .order('position')

  return { tape, tracks: tracks ?? [] }
}