import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// GET : récupère la file d'attente actuelle
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('queue')
      .select('*')
      .eq('status', 'pending')
      .order('votes', { ascending: false })
      .order('proposed_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ queue: data })
  } catch (error) {
    console.error('Erreur récupération file:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST : propose une nouvelle chanson ou vote pour une existante
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { track, session_id, action } = body

    if (!session_id) {
      return NextResponse.json({ error: 'session_id manquant' }, { status: 400 })
    }

    // Action : voter pour une chanson déjà dans la file
    if (action === 'vote') {
      const { queue_id } = body

      // Vérifie que la chanson existe dans la file
      const { data: existing } = await supabaseAdmin
        .from('queue')
        .select('id, votes')
        .eq('id', queue_id)
        .eq('status', 'pending')
        .single()

      if (!existing) {
        return NextResponse.json({ error: 'Chanson introuvable dans la file' }, { status: 404 })
      }

      // Tente d'insérer le vote (échoue si déjà voté grâce au UNIQUE)
      const { error: voteError } = await supabaseAdmin
        .from('votes')
        .insert({ queue_id, session_id })

      if (voteError) {
        return NextResponse.json({ error: 'Tu as déjà voté pour cette chanson' }, { status: 409 })
      }

      // Incrémente le compteur de votes
      await supabaseAdmin
        .from('queue')
        .update({ votes: existing.votes + 1 })
        .eq('id', queue_id)

      return NextResponse.json({ success: true, message: 'Vote enregistré' })
    }

    // Action : proposer une nouvelle chanson
    if (action === 'propose') {
      if (!track) {
        return NextResponse.json({ error: 'Données de la chanson manquantes' }, { status: 400 })
      }

      // Vérifie la blacklist
      const { data: blacklisted } = await supabaseAdmin
        .from('blacklist')
        .select('artist_name')
        .ilike('artist_name', `%${track.artist}%`)
        .limit(1)

      if (blacklisted && blacklisted.length > 0) {
        return NextResponse.json({ error: 'Cet artiste n\'est pas disponible sur ce jukebox' }, { status: 403 })
      }

      // Vérifie que la chanson n'est pas déjà dans la file
      const { data: alreadyInQueue } = await supabaseAdmin
        .from('queue')
        .select('id')
        .eq('spotify_track_id', track.id)
        .eq('status', 'pending')
        .single()

      if (alreadyInQueue) {
        return NextResponse.json({
          error: 'Cette chanson est déjà dans la file',
          queue_id: alreadyInQueue.id
        }, { status: 409 })
      }

      // Ajoute la chanson à la file
      const { data: newEntry, error: insertError } = await supabaseAdmin
        .from('queue')
        .insert({
          spotify_track_id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          duration_ms: track.duration_ms,
          cover_url: track.cover_url,
          session_id,
          votes: 1,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Enregistre le vote initial du proposant
      await supabaseAdmin
        .from('votes')
        .insert({ queue_id: newEntry.id, session_id })

      // Met à jour les stats
      await supabaseAdmin
        .from('stats')
        .upsert({
          spotify_track_id: track.id,
          title: track.title,
          artist: track.artist,
          request_count: 1,
        }, {
          onConflict: 'spotify_track_id',
          ignoreDuplicates: false,
        })

      return NextResponse.json({ success: true, entry: newEntry })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })

  } catch (error) {
    console.error('Erreur file d\'attente:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}