import { supabaseAdmin } from '$lib/supabaseAdmin'
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from '../$types'

export const load: PageServerLoad = async ({ params }) => {
  const tapeId = (params as { id: string }).id

  const { data: tape } = await supabaseAdmin
    .from('tapes')
    .select('*')
    .eq('id', tapeId)
    .single()

  if (!tape) {
    throw error(404, 'Tape not found')
  }

  const { data: tracks } = await supabaseAdmin
    .from('tracks')
    .select('*')
    .eq('tape_id', tapeId)
    .order('position')

  return { tape, tracks: tracks ?? [] }
}