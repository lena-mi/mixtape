import type { RequestHandler } from './$types'
import { supabaseAdmin } from '$lib/supabaseAdmin'
import { json } from '@sveltejs/kit'

export const POST: RequestHandler = async ({ request, params }) => {
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.ops)) {
    return json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('tapes')
    .update({ canvas_state: body.ops })
    .eq('id', params.id)

  if (error) return json({ error: error.message }, { status: 500 })
  return json({ ok: true })
}
