import { supabaseAdmin } from '$lib/supabaseAdmin'
import { fail, error } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

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

export const actions: Actions = {
  addTrack: async ({ request, params }) => {
    try {
      const data = await request.formData()
      const title = data.get('title') as string
      const artist = data.get('artist') as string
      const youtubeId = data.get('youtube_id') as string
      const youtubeUrl = data.get('youtube_url') as string

      console.log('Adding track:', { title, artist, youtubeId, youtubeUrl })

      if (!title) {
        return fail(400, { error: 'Please add a track title' })
      }

      if (!youtubeId) {
        return fail(400, { error: 'Please provide a YouTube video ID' })
      }

      // Get current track count for position
      const { count } = await supabaseAdmin
        .from('tracks')
        .select('*', { count: 'exact', head: true })
        .eq('tape_id', params.id)

      console.log('Current track count:', count)

      const { data: insertedTrack, error: insertError } = await supabaseAdmin
        .from('tracks')
        .insert({
          tape_id: params.id,
          title,
          artist,
          storage_path: youtubeId,
          source_url: youtubeUrl,
          source_type: 'bandcamp',
          position: count ?? 0
        })
        .select()

      if (insertError) {
        console.error('Insert error:', insertError)
        return fail(500, { error: insertError.message })
      }

      console.log('Track inserted successfully:', insertedTrack)
      return { success: true }
    } catch (err) {
      console.error('Unexpected error:', err)
      return fail(500, { error: String(err) })
    }
  },

  deleteTrack: async ({ request }) => {
    const data = await request.formData()
    const id = data.get('id') as string

    await supabaseAdmin
      .from('tracks')
      .delete()
      .eq('id', id)
  }
}