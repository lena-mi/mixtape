import { supabaseAdmin } from '$lib/supabaseAdmin'
import { fail, error } from '@sveltejs/kit'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
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
    const data = await request.formData()
    const title = data.get('title') as string
    const artist = data.get('artist') as string
    const audioFile = data.get('audio_file') as File

    if (!title) {
      return fail(400, { error: 'Please add a track title' })
    }

    if (!audioFile || audioFile.size === 0) {
      return fail(400, { error: 'Please select an audio file' })
    }

    // Validate file type
    if (!audioFile.type.startsWith('audio/')) {
      return fail(400, { error: 'Please select a valid audio file' })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'static', 'uploads')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (err) {
      // Directory might already exist, continue
    }

    // Generate unique filename
    const fileExtension = audioFile.name.split('.').pop()
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`
    const filePath = join(uploadsDir, uniqueFilename)

    // Save file
    try {
      const arrayBuffer = await audioFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await writeFile(filePath, buffer)
    } catch (err) {
      console.error('Error saving file:', err)
      return fail(500, { error: 'Failed to save audio file' })
    }

    // Get current track count for position
    const { count } = await supabaseAdmin
      .from('tracks')
      .select('*', { count: 'exact', head: true })
      .eq('tape_id', params.id)

    // Store relative path for serving
    const relativePath = `/uploads/${uniqueFilename}`

    const { error: insertError } = await supabaseAdmin
      .from('tracks')
      .insert({
        tape_id: params.id,
        title,
        artist,
        storage_path: relativePath,
        source_type: 'upload',
        position: count ?? 0
      })

    if (insertError) {
      return fail(500, { error: insertError.message })
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