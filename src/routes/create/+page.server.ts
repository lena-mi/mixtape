import { supabaseAdmin } from '$lib/supabaseAdmin'
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ cookies }) => {
  let tapeId = cookies.get('draft_tape_id')

  if (tapeId) {
    const { data: existing } = await supabaseAdmin
      .from('tapes').select('id').eq('id', tapeId).single()
    if (!existing) tapeId = undefined
  }

  if (!tapeId) {
    const { data: newTape } = await supabaseAdmin
      .from('tapes').insert({ title: '', dedication: null }).select().single()
    tapeId = newTape!.id
    cookies.set('draft_tape_id', tapeId!, {
      path: '/',
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      sameSite: 'lax',
    })
  }

  const [{ data: tape }, { data: tracks }] = await Promise.all([
    supabaseAdmin.from('tapes').select('*').eq('id', tapeId).single(),
    supabaseAdmin.from('tracks').select('*').eq('tape_id', tapeId).order('side').order('position'),
  ])

  return { tape: tape!, tracks: tracks ?? [] }
}

export const actions: Actions = {
  updateTape: async ({ request, cookies }) => {
    const data = await request.formData()
    const tapeId = (data.get('tape_id') as string) || cookies.get('draft_tape_id')
    if (!tapeId) return fail(400, { error: 'No active tape' })
    await supabaseAdmin
      .from('tapes')
      .update({
        title: data.get('title') as string,
        dedication: (data.get('dedication') as string) || null,
      })
      .eq('id', tapeId)
  },

  addTrack: async ({ request, cookies }) => {
    const data = await request.formData()
    const tapeId = (data.get('tape_id') as string) || cookies.get('draft_tape_id')
    if (!tapeId) return fail(400, { error: 'No active tape' })

    const title = data.get('title') as string
    const artist = data.get('artist') as string
    const youtubeId = data.get('youtube_id') as string
    const youtubeUrl = data.get('youtube_url') as string
    const side = (data.get('side') as string) || 'a'

    if (!title) return fail(400, { error: 'Please add a track title' })
    if (!youtubeId) return fail(400, { error: 'Please provide a YouTube video ID' })

    const { count } = await supabaseAdmin
      .from('tracks')
      .select('*', { count: 'exact', head: true })
      .eq('tape_id', tapeId)
      .eq('side', side)

    const { error: insertError } = await supabaseAdmin
      .from('tracks')
      .insert({
        tape_id: tapeId,
        title,
        artist,
        storage_path: youtubeId,
        source_url: youtubeUrl,
        source_type: 'youtube',
        side,
        position: count ?? 0,
      })

    if (insertError) {
      console.error('[addTrack] insert failed:', insertError.message)
      return fail(500, { error: insertError.message })
    }

    return { success: true }
  },

  deleteTrack: async ({ request }) => {
    const data = await request.formData()
    const id = data.get('id') as string
    await supabaseAdmin.from('tracks').delete().eq('id', id)
  },

  updateCover: async ({ request, cookies }) => {
    const data = await request.formData()
    const tapeId = (data.get('tape_id') as string) || cookies.get('draft_tape_id')
    if (!tapeId) return fail(400, { error: 'No active tape' })
    const coverUrl = (data.get('cover_url') as string).trim() || null
    await supabaseAdmin.from('tapes').update({ cover_url: coverUrl }).eq('id', tapeId)
  },

  share: async ({ cookies }) => {
    const tapeId = cookies.get('draft_tape_id')
    cookies.delete('draft_tape_id', { path: '/' })
    redirect(303, `/tape/${tapeId}`)
  },
}
