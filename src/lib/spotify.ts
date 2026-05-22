import SpotifyWebApi from 'spotify-web-api-node'
import { supabaseAdmin } from './supabase-server'

export const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
})

export async function getSpotifyClient(): Promise<SpotifyWebApi> {
  const { data, error } = await supabaseAdmin
    .from('spotify_tokens')
    .select('*')
    .eq('id', 1)
    .single()

  if (error || !data) {
    throw new Error('Spotify non connecté. Le gérant doit se connecter via /api/auth/spotify/login')
  }

  const now = new Date()
  const expiresAt = new Date(data.expires_at)

  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    spotifyApi.setRefreshToken(data.refresh_token)
    const refreshed = await spotifyApi.refreshAccessToken()
    const newExpiresAt = new Date(Date.now() + refreshed.body.expires_in * 1000)

    await supabaseAdmin
      .from('spotify_tokens')
      .update({
        access_token: refreshed.body.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1)

    spotifyApi.setAccessToken(refreshed.body.access_token)
  } else {
    spotifyApi.setAccessToken(data.access_token)
  }

  return spotifyApi
}