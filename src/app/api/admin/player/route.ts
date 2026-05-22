import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyClient } from '@/lib/spotify'

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

    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
  } catch (error) {
    console.error('Erreur contrôle Spotify:', error)
    return NextResponse.json({ error: 'Erreur contrôle Spotify' }, { status: 500 })
  }
}