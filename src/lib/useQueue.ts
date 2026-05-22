import { useEffect, useState, useCallback } from 'react'

export interface QueueEntry {
  id: string
  spotify_track_id: string
  title: string
  artist: string
  cover_url: string
  votes: number
  proposed_at: string
  status: string
}

export function useQueue() {
  const [queue, setQueue] = useState<QueueEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadQueue = useCallback(async () => {
    const res = await fetch('/api/queue')
    const data = await res.json()
    if (data.queue) {
      setQueue(data.queue)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQueue()
    // Polling toutes les 3 secondes — suffisant pour un jukebox
    const interval = setInterval(loadQueue, 3000)
    return () => clearInterval(interval)
  }, [loadQueue])

  return { queue, isLoading, loadQueue }
}