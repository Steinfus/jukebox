import { NextRequest, NextResponse } from 'next/server'
import { spotifyApi } from '@/lib/spotify'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.json({ error: 'Autorisation refusée' }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'Code manquant' }, { status: 400 })
  }

  try {
    const data = await spotifyApi.authorizationCodeGrant(code)

    const accessToken = data.body.access_token
    const refreshToken = data.body.refresh_token
    const expiresAt = new Date(Date.now() + data.body.expires_in * 1000)

    await supabaseAdmin
      .from('spotify_tokens')
      .upsert({
        id: 1,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })

    return NextResponse.redirect(new URL('/admin', request.url))
  } catch (err) {
    console.error('Erreur OAuth Spotify:', err)
    return NextResponse.json({ error: 'Erreur lors de la connexion Spotify' }, { status: 500 })
  }
}