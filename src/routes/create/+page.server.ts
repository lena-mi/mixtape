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
      secure: true,
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
    const storagePath = data.get('storage_path') as string
    const sourceUrl = data.get('source_url') as string
    const sourceType = (data.get('source_type') as string) || 'youtube'
    const side = (data.get('side') as string) || 'a'

    if (!title) return fail(400, { error: 'Please add a track title' })
    if (!storagePath) return fail(400, { error: 'Please provide a track source' })

    const durationSeconds = parseInt(data.get('duration_seconds') as string) || 0
    const isGoogleDrive = sourceType === 'google_drive'

    if (!isGoogleDrive && durationSeconds <= 0) return fail(422, { error: "Couldn't resolve track duration" })
    if (durationSeconds > 2700) return fail(422, { error: 'Track exceeds 45-minute limit' })

    const { data: sideTracks } = await supabaseAdmin
      .from('tracks')
      .select('duration_seconds')
      .eq('tape_id', tapeId)
      .eq('side', side)

    const sideTotal = (sideTracks ?? []).reduce((s: number, t: any) => s + (t.duration_seconds ?? 0), 0)
    if (!isGoogleDrive && sideTotal + durationSeconds > 2700) {
      return fail(422, { error: `Side ${side.toUpperCase()} would exceed 45 minutes` })
    }

    const { count } = await supabaseAdmin
      .from('tracks')
      .select('*', { count: 'exact', head: true })
      .eq('tape_id', tapeId)
      .eq('side', side)

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('tracks')
      .insert({
        tape_id: tapeId,
        title,
        storage_path: storagePath,
        source_url: sourceUrl,
        source_type: sourceType,
        duration_seconds: durationSeconds,
        side,
        position: count ?? 0,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[addTrack] insert failed:', insertError.message)
      return fail(500, { error: insertError.message })
    }

    return { success: true, id: inserted!.id }
  },

  deleteTrack: async ({ request }) => {
    const data = await request.formData()
    const id = data.get('id') as string
    if (!id) return fail(400, { error: 'Missing id' })
    await supabaseAdmin.from('tracks').delete().eq('id', id)
  },

  renameTrack: async ({ request }) => {
    const data = await request.formData()
    const id = data.get('id') as string
    const title = data.get('title') as string
    if (!id || !title) return fail(400, { error: 'Missing id or title' })
    await supabaseAdmin.from('tracks').update({ title }).eq('id', id)
  },

  updateCover: async ({ request, cookies }) => {
    const data = await request.formData()
    const tapeId = (data.get('tape_id') as string) || cookies.get('draft_tape_id')
    if (!tapeId) return fail(400, { error: 'No active tape' })
    const coverUrl = (data.get('cover_url') as string).trim() || null
    const coverPosition = (data.get('cover_position') as string).trim() || null
    await supabaseAdmin.from('tapes').update({ cover_url: coverUrl, cover_position: coverPosition }).eq('id', tapeId)
  },

  share: async ({ request, cookies }) => {
    const data = await request.formData()
    const tapeId = (data.get('tape_id') as string) || cookies.get('draft_tape_id')
    if (!tapeId) return fail(400, { error: 'No active tape' })

    const { data: tracks } = await supabaseAdmin
      .from('tracks')
      .select('side, duration_seconds')
      .eq('tape_id', tapeId)

    const sum = (s: string) =>
      (tracks ?? [])
        .filter((t: any) => !t.side || t.side === s)
        .reduce((acc: number, t: any) => acc + (t.duration_seconds ?? 0), 0)

    const sideA = sum('a')
    const sideB = sum('b')

    if (sideA > 2700 || sideB > 2700) {
      return fail(422, {
        error: 'Side limit exceeded',
        sideA,
        sideB,
      })
    }

    cookies.delete('draft_tape_id', { path: '/' })
    redirect(303, `/tape/${tapeId}`)
  },
}
