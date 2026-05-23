import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyClient } from '@/lib/spotify'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    const spotify = await getSpotifyClient()

    if (action === 'skip') {
      await spotify.skipToNext()
      return NextResponse.json({ success: true })
    }

    if (action === 'pause') {
      await spotify.pause()
      return NextResponse.json({ success: true })
    }

    if (action === 'play') {
      await spotify.play()
      return NextResponse.json({ success: true })
    }

    if (action === 'play_next') {
      // Récupère la chanson en tête de file
      const { data: nextTrack } = await supabaseAdmin
        .from('queue')
        .select('*')
        .eq('status', 'pending')
        .order('votes', { ascending: false })
        .order('proposed_at', { ascending: true })
        .limit(1)
        .single()

      if (!nextTrack) {
        return NextResponse.json({ error: 'File vide' }, { status: 404 })
      }

      // Lance la chanson sur Spotify
      await spotify.play({
        uris: [`spotify:track:${nextTrack.spotify_track_id}`]
      })

      // Met à jour le statut dans la file
      await supabaseAdmin
        .from('queue')
        .update({ status: 'playing', played_at: new Date().toISOString() })
        .eq('id', nextTrack.id)

      return NextResponse.json({ success: true, track: nextTrack })
    }

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (error) {
    console.error('Erreur contrôle Spotify:', error)
    return NextResponse.json({ error: 'Erreur contrôle Spotify' }, { status: 500 })
  }
}