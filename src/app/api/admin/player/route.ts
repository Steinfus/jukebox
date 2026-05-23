import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyClient } from '@/lib/spotify'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    const spotify = await getSpotifyClient()
    const devices = await spotify.getMyDevices()
    return NextResponse.json({ devices: devices.body.devices })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

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

      // Prend l'appareil actif en priorité, sinon le premier disponible
      const devicesRes = await spotify.getMyDevices()
      const devices = devicesRes.body.devices
      const device = devices.find(d => d.is_active) || devices[0]

      if (!device) {
        return NextResponse.json({ error: 'Aucun appareil Spotify disponible' }, { status: 404 })
      }

      await spotify.play({
        device_id: device.id as string,
        uris: [`spotify:track:${nextTrack.spotify_track_id}`]
      })

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