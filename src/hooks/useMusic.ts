import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Song } from '@/types/music'
import { useAuth } from './useAuth'

export const useMusic = () => {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Song[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch user's favorites
  const fetchFavorites = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/favorites`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setFavorites(data?.map((fav: any) => fav.songs).filter(Boolean))
      }
    } catch (error) {
      console.error('Error fetching favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch user's playlists
  const fetchPlaylists = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/playlists`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data)
      }
    } catch (error) {
      console.error('Error fetching playlists:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch listening history
  const fetchHistory = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/history`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  // Add song to favorites
  const addToFavorites = async (song: Song) => {
    if (!user) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/favorites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ songData: song }),
      })
      
      if (response.ok) {
        const data = await fetchFavorites()
        console.log('Favoruite Data ,',data)
      }
    } catch (error) {
      console.error('Error adding to favorites:', error)
    }
  }

  // Remove song from favorites
  const removeFromFavorites = async (songId: string) => {
    if (!user) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/favorites?songId=${songId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      })
      
      if (response.ok) {
        await fetchFavorites()
      }
    } catch (error) {
      console.error('Error removing from favorites:', error)
    }
  }

  // Create playlist
  const createPlaylist = async (name: string, description?: string, songIds?: string[]) => {
    if (!user) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/playlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, songIds }),
      })
      
      if (response.ok) {
        await fetchPlaylists()
        return await response.json()
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
    }
  }

  // Add song to history
  const addToHistory = async (song: Song, playDuration?: number, completed?: boolean) => {
    if (!user) return

    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ songData: song, playDuration, completed }),
      })
    } catch (error) {
      console.error('Error adding to history:', error)
    }
  }

  // Check if song is favorited
  const isFavorited = (songId: string) => {
    return favorites?.some(fav => fav.id === songId)
  }

  useEffect(() => {
    if (user) {
      fetchFavorites()
      fetchPlaylists()
      fetchHistory()
    }
  }, [user])

  return {
    favorites,
    playlists,
    history,
    loading,
    addToFavorites,
    removeFromFavorites,
    createPlaylist,
    addToHistory,
    isFavorited,
    fetchFavorites,
    fetchPlaylists,
    fetchHistory,
  }
}