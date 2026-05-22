import { NextResponse } from 'next/server'
import { spotifyApi } from '@/lib/spotify'

const SCOPES = [
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-modify-public',
  'playlist-modify-private',
]

export async function GET() {
  const authUrl = spotifyApi.createAuthorizeURL(SCOPES, 'jukebox-state')
  return NextResponse.redirect(authUrl)
}