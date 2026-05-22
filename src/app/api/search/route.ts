import { NextRequest, NextResponse } from 'next/server'
import { getSpotifyClient } from '@/lib/spotify'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ tracks: [] })
  }

  try {
    const spotify = await getSpotifyClient()
    const results = await spotify.searchTracks(query, { limit: 8 })

    // On reformate les données pour n'envoyer que ce dont l'interface a besoin
    const tracks = results.body.tracks?.items.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      duration_ms: track.duration_ms,
      cover_url: track.album.images[1]?.url || track.album.images[0]?.url,
      preview_url: track.preview_url,
    })) || []

    return NextResponse.json({ tracks })
  } catch (error) {
    console.error('Erreur recherche Spotify:', error)
    return NextResponse.json({ error: 'Erreur lors de la recherche' }, { status: 500 })
  }
}