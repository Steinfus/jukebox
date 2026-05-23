'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQueue } from '@/lib/useQueue'

interface BlacklistedArtist {
  id: string
  artist_name: string
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [blacklist, setBlacklist] = useState<BlacklistedArtist[]>([])
  const [newArtist, setNewArtist] = useState('')
  const [activeTab, setActiveTab] = useState<'queue' | 'blacklist' | 'stats'>('queue')
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type })
    setTimeout(() => setFeedback(null), 3000)
  }

  const { queue, loadQueue } = useQueue()

  const loadBlacklist = useCallback(async () => {
    const res = await fetch('/api/admin/blacklist')
    const data = await res.json()
    if (data.blacklist) setBlacklist(data.blacklist)
  }, [])

  useEffect(() => {
    // Vérifie si déjà authentifié dans cette session
    const auth = sessionStorage.getItem('jukebox_admin_auth')
    if (auth === 'true') setIsAuthenticated(true)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadQueue()
      loadBlacklist()
      const interval = setInterval(loadQueue, 10000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, loadQueue, loadBlacklist])

  // Authentification simple côté client
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      sessionStorage.setItem('jukebox_admin_auth', 'true')
      setIsAuthenticated(true)
    } else {
      setAuthError('Mot de passe incorrect')
    }
  }

  const rejectTrack = async (id: string) => {
    const res = await fetch('/api/admin/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'rejected' }),
    })
    if (res.ok) {
      showFeedback('Chanson rejetée', 'success')
      loadQueue()
    }
  }

  const promoteTrack = async (id: string, currentVotes: number) => {
    const res = await fetch('/api/admin/queue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, votes: currentVotes + 100 }),
    })
    if (res.ok) {
      showFeedback('Chanson remontée en tête', 'success')
      loadQueue()
    }
  }

  const skipTrack = async () => {
    const res = await fetch('/api/admin/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'skip' }),
    })
    if (res.ok) {
      showFeedback('Chanson skippée', 'success')
    } else {
      showFeedback('Erreur lors du skip', 'error')
    }
  }

  const playNext = async () => {
    const res = await fetch('/api/admin/player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'play_next' }),
    })
    const data = await res.json()
    if (data.success) {
      showFeedback(`▶ ${data.track.title} lancée sur Spotify`, 'success')
      loadQueue()
    } else {
      showFeedback(data.error || 'Erreur', 'error')
    }
  }

  const resetQueue = async () => {
    if (!isResetting) {
      setIsResetting(true)
      showFeedback('Appuie encore pour confirmer le reset', 'error')
      setTimeout(() => setIsResetting(false), 3000)
      return
    }
    const res = await fetch('/api/admin/queue', { method: 'DELETE' })
    if (res.ok) {
      showFeedback('File réinitialisée', 'success')
      setIsResetting(false)
      loadQueue()
    }
  }

  const addToBlacklist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newArtist.trim()) return
    const res = await fetch('/api/admin/blacklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist_name: newArtist.trim() }),
    })
    if (res.ok) {
      showFeedback(`${newArtist} ajouté à la blacklist`, 'success')
      setNewArtist('')
      loadBlacklist()
    }
  }

  const removeFromBlacklist = async (id: string) => {
    const res = await fetch('/api/admin/blacklist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      showFeedback('Artiste retiré de la blacklist', 'success')
      loadBlacklist()
    }
  }

  // Page de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-white text-center mb-8">Panel gérant</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              autoFocus
            />
            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-green-500 text-black font-bold py-3 rounded-xl"
            >
              Connexion
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-green-400">Panel gérant</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={playNext}
              style={{ background: '#1a8a7a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
              ▶ Lancer
            </button>
            <button
              onClick={skipTrack}
              style={{ background: '#2e2720', color: '#a09080', border: '1px solid rgba(200,169,110,0.2)', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
              >
              ⏭ Skip
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {(['queue', 'blacklist', 'stats'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab ? 'bg-green-500 text-black' : 'text-gray-400'
              }`}
            >
              {tab === 'queue' ? `File (${queue.length})` : tab === 'blacklist' ? 'Blacklist' : 'Stats'}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mx-4 mt-4 p-3 rounded-lg text-sm text-center font-medium ${
          feedback.type === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
        }`}>
          {feedback.message}
        </div>
      )}

      <div className="px-4 py-4">
        {/* File d'attente */}
        {activeTab === 'queue' && (
          <div className="space-y-3">
            <button
              onClick={resetQueue}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                isResetting ? 'bg-red-600 text-white' : 'bg-gray-800 text-red-400 border border-red-900'
              }`}
            >
              {isResetting ? '⚠️ Confirmer le reset de la file' : 'Reset de la file'}
            </button>

            {queue.length === 0 ? (
              <p className="text-center text-gray-500 mt-8">File vide</p>
            ) : (
              queue.map((entry, index) => (
                <div key={entry.id} className="bg-gray-800 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 text-sm w-5 text-center">{index + 1}</span>
                    {entry.cover_url && (
                      <img src={entry.cover_url} alt="" className="w-12 h-12 rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.title}</p>
                      <p className="text-gray-400 text-sm truncate">{entry.artist}</p>
                      <p className="text-green-400 text-xs mt-1">👍 {entry.votes} vote{entry.votes > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => promoteTrack(entry.id, entry.votes)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition-colors"
                    >
                      ⬆️ Remonter
                    </button>
                    <button
                      onClick={() => rejectTrack(entry.id)}
                      className="flex-1 bg-red-950 hover:bg-red-900 text-red-400 text-sm py-2 rounded-lg transition-colors"
                    >
                      ✕ Rejeter
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Blacklist */}
        {activeTab === 'blacklist' && (
          <div className="space-y-4">
            <form onSubmit={addToBlacklist} className="flex gap-2">
              <input
                type="text"
                value={newArtist}
                onChange={e => setNewArtist(e.target.value)}
                placeholder="Nom de l'artiste..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-sm"
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors"
              >
                Bloquer
              </button>
            </form>

            {blacklist.length === 0 ? (
              <p className="text-center text-gray-500 mt-8">Aucun artiste bloqué</p>
            ) : (
              <div className="space-y-2">
                {blacklist.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                    <span className="text-sm">{item.artist_name}</span>
                    <button
                      onClick={() => removeFromBlacklist(item.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors ml-4"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats — placeholder pour la phase suivante */}
        {activeTab === 'stats' && (
          <div className="text-center mt-12">
            <p className="text-gray-500">Les statistiques arrivent dans la prochaine phase</p>
          </div>
        )}
      </div>
    </div>
  )
}