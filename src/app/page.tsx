'use client'

import { useState, useEffect } from 'react'
import { useQueue } from '@/lib/useQueue'

interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration_ms: number
  cover_url: string
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function getSessionId(): string {
  let sessionId = localStorage.getItem('jukebox_session_id')
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem('jukebox_session_id', sessionId)
  }
  return sessionId
}

export default function ClientPage() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [sessionId, setSessionId] = useState('')
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [view, setView] = useState<'search' | 'queue'>('search')

  // Utilise le hook temps réel
  const { queue, loadQueue } = useQueue()

  useEffect(() => {
    setSessionId(getSessionId())
    const saved = localStorage.getItem('jukebox_voted')
    if (saved) setVotedIds(new Set(JSON.parse(saved)))
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSearchResults(data.tracks || [])
      setIsSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 3000)
  }

  const proposeTrack = async (track: Track) => {
    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'propose', track, session_id: sessionId }),
    })
    const data = await res.json()

    if (res.status === 403) {
      showFeedback('Cet artiste n\'est pas disponible sur ce jukebox', 'error')
    } else if (res.status === 409) {
      showFeedback('Cette chanson est déjà dans la file !', 'error')
    } else if (data.success) {
      showFeedback('Chanson ajoutée à la file ! 🎵', 'success')
      setQuery('')
      setSearchResults([])
      const newVoted = new Set(votedIds).add(data.entry.id)
      setVotedIds(newVoted)
      localStorage.setItem('jukebox_voted', JSON.stringify([...newVoted]))
      setView('queue')
    } else {
      showFeedback('Erreur, réessaie', 'error')
    }
  }

  const voteForTrack = async (queueId: string) => {
    if (votedIds.has(queueId)) return

    const res = await fetch('/api/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote', queue_id: queueId, session_id: sessionId }),
    })
    const data = await res.json()

    if (data.success) {
      showFeedback('Vote enregistré ! 👍', 'success')
      const newVoted = new Set(votedIds).add(queueId)
      setVotedIds(newVoted)
      localStorage.setItem('jukebox_voted', JSON.stringify([...newVoted]))
    } else {
      showFeedback(data.error || 'Erreur', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center text-green-400">🎵 Jukebox</h1>
        <div className="flex mt-3 bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setView('search')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'search' ? 'bg-green-500 text-black' : 'text-gray-400'
            }`}
          >
            Rechercher
          </button>
          <button
            onClick={() => setView('queue')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'queue' ? 'bg-green-500 text-black' : 'text-gray-400'
            }`}
          >
            File ({queue.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm text-center font-medium ${
          feedback.type === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
        }`}>
          {feedback.message}
        </div>
      )}

      <div className="px-4 py-4">
        {view === 'search' && (
          <div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Titre, artiste..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 text-base"
              autoFocus
            />
            {isSearching && (
              <p className="text-center text-gray-500 mt-6">Recherche...</p>
            )}
            <div className="mt-3 space-y-2">
              {searchResults.map(track => (
                <button
                  key={track.id}
                  onClick={() => proposeTrack(track)}
                  className="w-full flex items-center gap-3 bg-gray-800 hover:bg-gray-700 rounded-xl p-3 transition-colors text-left"
                >
                  {track.cover_url && (
                    <img src={track.cover_url} alt={track.album} className="w-12 h-12 rounded-lg flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                  </div>
                  <span className="text-gray-500 text-sm flex-shrink-0">{formatDuration(track.duration_ms)}</span>
                </button>
              ))}
            </div>
            {query.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-center text-gray-500 mt-6">Aucun résultat</p>
            )}
            {query.length === 0 && (
              <p className="text-center text-gray-600 mt-8 text-sm">Tape le nom d'une chanson ou d'un artiste</p>
            )}
          </div>
        )}

        {view === 'queue' && (
          <div>
            {queue.length === 0 ? (
              <div className="text-center mt-12">
                <p className="text-gray-500">La file est vide</p>
                <button
                  onClick={() => setView('search')}
                  className="mt-4 bg-green-500 text-black font-medium px-6 py-2 rounded-full text-sm"
                >
                  Proposer une chanson
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((entry, index) => {
                  const hasVoted = votedIds.has(entry.id)
                  return (
                    <div key={entry.id} className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                      <span className="text-gray-600 text-sm w-5 text-center flex-shrink-0">{index + 1}</span>
                      {entry.cover_url && (
                        <img src={entry.cover_url} alt="" className="w-12 h-12 rounded-lg flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.title}</p>
                        <p className="text-gray-400 text-sm truncate">{entry.artist}</p>
                      </div>
                      <button
                        onClick={() => voteForTrack(entry.id)}
                        disabled={hasVoted}
                        className={`flex flex-col items-center px-3 py-2 rounded-lg transition-colors flex-shrink-0 ${
                          hasVoted
                            ? 'bg-green-900 text-green-400 cursor-default'
                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                        }`}
                      >
                        <span className="text-lg">{hasVoted ? '✓' : '👍'}</span>
                        <span className="text-xs font-bold">{entry.votes}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}