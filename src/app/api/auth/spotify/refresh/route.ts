import { NextResponse } from 'next/server'
import { getSpotifyClient } from '@/lib/spotify'

export async function POST() {
  try {
    await getSpotifyClient()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Impossible de rafraîchir le token' }, { status: 500 })
  }
}