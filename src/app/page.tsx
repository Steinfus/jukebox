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
  const { queue, loadQueue } = useQueue()

  useEffect(() => {
    setSessionId(getSessionId())
    const saved = localStorage.getItem('jukebox_voted')
    if (saved) setVotedIds(new Set(JSON.parse(saved)))
  }, [])

  useEffect(() => {
    if (query.trim().length < 2) { setSearchResults([]); return }
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
      showFeedback("Cet artiste n'est pas disponible ici", 'error')
    } else if (res.status === 409) {
      showFeedback('Cette chanson est déjà dans la file !', 'error')
    } else if (data.success) {
      showFeedback('Chanson ajoutée à la file !', 'success')
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
      showFeedback('Vote enregistré !', 'success')
      const newVoted = new Set(votedIds).add(queueId)
      setVotedIds(newVoted)
      localStorage.setItem('jukebox_voted', JSON.stringify([...newVoted]))
    } else {
      showFeedback(data.error || 'Erreur', 'error')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1510', color: '#f0e8d8', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#241e17', borderBottom: '1px solid rgba(200,169,110,0.2)', padding: '24px 16px 14px', position: 'sticky', top: 0, zIndex: 10 }}>
        
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '38px', fontWeight: 700, color: '#f0e8d8', letterSpacing: '12px', fontFamily: 'Georgia, serif', lineHeight: 1 }}>
            MOS
          </span>
        </div>
        <div style={{ fontSize: '10px', letterSpacing: '5px', color: '#c8a96e', textTransform: 'uppercase', textAlign: 'center', marginBottom: '16px' }}>
          Maker of Songs
        </div>

        {/* Séparateur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(200,169,110,0.2)' }} />
          <div style={{ width: '5px', height: '5px', background: '#c8a96e', transform: 'rotate(45deg)', flexShrink: 0 }} />
          <div style={{ flex: 1, height: '1px', background: 'rgba(200,169,110,0.2)' }} />
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', background: '#1a1510', borderRadius: '10px', padding: '3px', gap: '3px' }}>
          <button
            onClick={() => setView('search')}
            style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: view === 'search' ? '#1a8a7a' : 'transparent', color: view === 'search' ? 'white' : '#a09080', transition: 'all 0.2s' }}
          >
            Rechercher
          </button>
          <button
            onClick={() => setView('queue')}
            style={{ flex: 1, padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: view === 'queue' ? '#1a8a7a' : 'transparent', color: view === 'queue' ? 'white' : '#a09080', transition: 'all 0.2s' }}
          >
            File ({queue.length})
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{ margin: '12px 16px 0', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', textAlign: 'center', fontWeight: 500, letterSpacing: '0.5px', background: feedback.type === 'success' ? 'rgba(26,138,122,0.2)' : 'rgba(180,60,40,0.2)', border: `1px solid ${feedback.type === 'success' ? '#1a8a7a' : 'rgba(180,60,40,0.5)'}`, color: feedback.type === 'success' ? '#2ab5a0' : '#e07060' }}>
          {feedback.message}
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>

        {/* Vue recherche */}
        {view === 'search' && (
          <div>
            {/* Barre de recherche */}
            <div style={{ background: '#241e17', border: '1px solid rgba(200,169,110,0.2)', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ color: '#c8a96e', fontSize: '16px', flexShrink: 0 }}>♪</span>
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Titre, artiste..."
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#f0e8d8', fontSize: '14px' }}
                autoFocus
              />
            </div>

            {isSearching && (
              <p style={{ textAlign: 'center', color: '#a09080', fontSize: '13px', marginTop: '24px' }}>Recherche...</p>
            )}

            {searchResults.length > 0 && (
              <div style={{ fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', color: '#c8a96e', marginBottom: '10px' }}>
                Résultats
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map(track => (
                <button
                  key={track.id}
                  onClick={() => proposeTrack(track)}
                  style={{ background: '#241e17', border: '1px solid rgba(200,169,110,0.2)', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'border-color 0.2s' }}
                >
                  {track.cover_url ? (
                    <img src={track.cover_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#1a3a4a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c8a96e' }}>♪</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0e8d8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                    <div style={{ fontSize: '11px', color: '#a09080', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artist}</div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#a09080', flexShrink: 0 }}>{formatDuration(track.duration_ms)}</span>
                </button>
              ))}
            </div>

            {query.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p style={{ textAlign: 'center', color: '#a09080', fontSize: '13px', marginTop: '32px' }}>Aucun résultat</p>
            )}

            {query.length === 0 && (
              <p style={{ textAlign: 'center', color: '#5a5040', fontSize: '13px', marginTop: '40px', letterSpacing: '0.5px' }}>Tape le nom d'une chanson ou d'un artiste</p>
            )}
          </div>
        )}

        {/* Vue file d'attente */}
        {view === 'queue' && (
          <div>
            {queue.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: '60px' }}>
                <p style={{ color: '#a09080', fontSize: '13px', letterSpacing: '0.5px' }}>La file est vide</p>
                <button
                  onClick={() => setView('search')}
                  style={{ marginTop: '16px', background: '#1a8a7a', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '24px', fontSize: '12px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Proposer une chanson
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {queue.map((entry, index) => {
                  const hasVoted = votedIds.has(entry.id)
                  return (
                    <div key={entry.id} style={{ background: '#241e17', border: '1px solid rgba(200,169,110,0.2)', borderRadius: '12px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#5a5040', fontSize: '12px', width: '16px', textAlign: 'center', flexShrink: 0 }}>{index + 1}</span>
                      {entry.cover_url ? (
                        <img src={entry.cover_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#1a3a4a', flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0e8d8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.title}</div>
                        <div style={{ fontSize: '11px', color: '#a09080', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.artist}</div>
                      </div>
                      <button
                        onClick={() => voteForTrack(entry.id)}
                        disabled={hasVoted}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: hasVoted ? '#0f5c52' : '#1a1510', border: `1px solid ${hasVoted ? '#1a8a7a' : 'rgba(200,169,110,0.2)'}`, borderRadius: '8px', padding: '6px 10px', flexShrink: 0, cursor: hasVoted ? 'default' : 'pointer' }}
                      >
                        <span style={{ fontSize: '13px', color: hasVoted ? '#2ab5a0' : '#c8a96e' }}>{hasVoted ? '✓' : '↑'}</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#f0e8d8', marginTop: '2px' }}>{entry.votes}</span>
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