import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Song } from '@/types/music'
import { useAuth } from './useAuth'

export const useMusic = () => {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Song[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [downloads, setDownloads] = useState<Song[]>([])
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

  // Fetch user's playlists with songs
  const fetchPlaylists = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/playlists?include_songs=true`, {
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
        const newPlaylist = await response.json()
        
        // If songs provided, add them to the playlist one by one to ensure proper insertion
        if (songIds && songIds.length > 0) {
          const songResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/songs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ songIds }),
          })
          
          if (songResponse.ok) {
            const songs = await songResponse.json()
            
            // Add each song to the playlist
            for (const song of songs) {
              await addSongToPlaylist(newPlaylist.id, song)
            }
          }
        }
        
        await fetchPlaylists()
        return newPlaylist
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
      throw error
    }
  }

  // Add song to playlist
  const addSongToPlaylist = async (playlistId: string, song: Song) => {
    if (!user) return

    try {
      console.log('Adding song to playlist:', { playlistId, song })
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/playlist-songs?endpoint=playlist-songs`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId, song }),
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Song added successfully:', result)
        await fetchPlaylists() // Refresh playlists to show updated data
        return result
      } else {
        const errorText = await response.text()
        console.error('Failed to add song (status ' + response.status + '):', errorText)
        throw new Error(`Failed to add song: ${errorText}`)
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error)
      throw error
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

  // Delete playlist
  const deletePlaylist = async (playlistId: string) => {
    if (!user) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/playlists?playlistId=${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      })
      
      if (response.ok) {
        await fetchPlaylists() // Auto-refresh playlists
        return true
      } else {
        throw new Error('Failed to delete playlist')
      }
    } catch (error) {
      console.error('Error deleting playlist:', error)
      throw error
    }
  }

  // Remove song from playlist
  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    if (!user) return

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/playlist-songs?playlistId=${playlistId}&songId=${songId}&endpoint=playlist-songs`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      })
      
      if (response.ok) {
        await fetchPlaylists() // Auto-refresh playlists
        return true
      } else {
        throw new Error('Failed to remove song from playlist')
      }
    } catch (error) {
      console.error('Error removing song from playlist:', error)
      throw error
    }
  }

  // Download management
  const downloadSong = async (song: Song) => {
    try {
      // Attempt device download
      try {
        const response = await fetch(song.media_url)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        const safeName = `${song.title} - ${song.artist}`.replace(/[^\w\s.-]/g, '_')
        // Try to infer extension
        const contentType = response.headers.get('content-type') || ''
        const ext = contentType.includes('audio') ? (contentType.includes('mpeg') ? 'mp3' : contentType.split('/')[1].split(';')[0] || 'mp3') : 'mp3'
        a.href = url
        a.download = `${safeName}.${ext}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      } catch (e) {
        // Fallback: open media URL in a new tab so the user can save it
        window.open(song.media_url, '_blank')
      }

      // Track in local storage for the Downloads section
      const storedDownloads = localStorage.getItem('downloadedSongs')
      const existingDownloads = storedDownloads ? JSON.parse(storedDownloads) : []
      if (!existingDownloads.some((d: Song) => d.id === song.id)) {
        const updatedDownloads = [...existingDownloads, { ...song, downloadedAt: new Date().toISOString() }]
        localStorage.setItem('downloadedSongs', JSON.stringify(updatedDownloads))
        setDownloads(updatedDownloads)
      }
    } catch (error) {
      console.error('Error downloading song:', error)
      throw error
    }
  }

  const downloadPlaylist = async (playlist: any) => {
    try {
      const playlistSongs = playlist.playlist_songs?.map((ps: any) => ps.songs) || []
      for (const song of playlistSongs) {
        await downloadSong(song)
      }
    } catch (error) {
      console.error('Error downloading playlist:', error)
      throw error
    }
  }

  const removeDownload = (songId: string) => {
    try {
      const storedDownloads = localStorage.getItem('downloadedSongs')
      const existingDownloads = storedDownloads ? JSON.parse(storedDownloads) : []
      const updatedDownloads = existingDownloads.filter((d: Song) => d.id !== songId)
      localStorage.setItem('downloadedSongs', JSON.stringify(updatedDownloads))
      setDownloads(updatedDownloads)
    } catch (error) {
      console.error('Error removing download:', error)
    }
  }

  const loadDownloads = () => {
    try {
      const storedDownloads = localStorage.getItem('downloadedSongs')
      if (storedDownloads) {
        setDownloads(JSON.parse(storedDownloads))
      }
    } catch (error) {
      console.error('Error loading downloads:', error)
    }
  }

  // Check if song is favorited
  const isFavorited = (songId: string) => {
    return favorites?.some(fav => fav.id === songId)
  }

  // Check if song is downloaded
  const isDownloaded = (songId: string) => {
    return downloads?.some(d => d.id === songId)
  }

  useEffect(() => {
    if (user) {
      fetchFavorites()
      fetchPlaylists()
      fetchHistory()
    }
    loadDownloads()
  }, [user])

  return {
    favorites,
    playlists,
    history,
    downloads,
    loading,
    addToFavorites,
    removeFromFavorites,
    createPlaylist,
    addSongToPlaylist,
    deletePlaylist,
    removeSongFromPlaylist,
    addToHistory,
    downloadSong,
    downloadPlaylist,
    removeDownload,
    isFavorited,
    isDownloaded,
    fetchFavorites,
    fetchPlaylists,
    fetchHistory,
    loadDownloads,
  }
}