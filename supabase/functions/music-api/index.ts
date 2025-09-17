import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('No user found')
    }

    const url = new URL(req.url)
    const endpoint = url.pathname.split('/').pop()
    
    switch (endpoint) {
      case 'playlists':
        return await handlePlaylists(req, supabaseClient, user.id)
      case 'favorites':
        return await handleFavorites(req, supabaseClient, user.id)
      case 'history':
        return await handleHistory(req, supabaseClient, user.id)
      case 'songs':
        return await handleSongs(req, supabaseClient)
      default:
        return new Response('Not found', { status: 404, headers: corsHeaders })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handlePlaylists(req: Request, supabase: any, userId: string) {
  const url = new URL(req.url)
  const playlistId = url.searchParams.get('id')

  switch (req.method) {
    case 'GET':
      if (playlistId) {
        // Get specific playlist with songs
        const { data: playlist } = await supabase
          .from('playlists')
          .select(`
            *,
            playlist_songs (
              position,
              songs (*)
            )
          `)
          .eq('id', playlistId)
          .single()

        return new Response(JSON.stringify(playlist), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        // Get all user playlists
        const { data: playlists } = await supabase
          .from('playlists')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        return new Response(JSON.stringify(playlists), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

    case 'POST':
      const { name, description, songIds = [] } = await req.json()
      
      // Create playlist
      const { data: playlist, error } = await supabase
        .from('playlists')
        .insert({
          name,
          description,
          user_id: userId
        })
        .select()
        .single()

      if (error) throw error

      // Add songs if provided
      if (songIds.length > 0) {
        const playlistSongs = songIds.map((songId: string, index: number) => ({
          playlist_id: playlist.id,
          song_id: songId,
          position: index
        }))

        await supabase
          .from('playlist_songs')
          .insert(playlistSongs)
      }

      return new Response(JSON.stringify(playlist), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    case 'PUT':
      if (!playlistId) throw new Error('Playlist ID required')
      
      const updates = await req.json()
      const { data: updatedPlaylist } = await supabase
        .from('playlists')
        .update(updates)
        .eq('id', playlistId)
        .eq('user_id', userId)
        .select()
        .single()

      return new Response(JSON.stringify(updatedPlaylist), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    case 'DELETE':
      if (!playlistId) throw new Error('Playlist ID required')
      
      await supabase
        .from('playlists')
        .delete()
        .eq('id', playlistId)
        .eq('user_id', userId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
  }
}

async function handleFavorites(req: Request, supabase: any, userId: string) {
  const url = new URL(req.url)
  const songId = url.searchParams.get('songId')

  switch (req.method) {
    case 'GET':
      const { data: favorites } = await supabase
        .from('favorites')
        .select(`
          *,
          songs (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      return new Response(JSON.stringify(favorites), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    case 'POST':
      const { songData } = await req.json()
      
      // First ensure song exists in songs table
      await supabase
        .from('songs')
        .upsert(songData, { onConflict: 'id' })

      // Add to favorites
      const { data: favorite } = await supabase
        .from('favorites')
        .upsert({
          user_id: userId,
          song_id: songData.id
        }, { onConflict: 'user_id,song_id' })
        .select()
        .single()

      return new Response(JSON.stringify(favorite), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    case 'DELETE':
      if (!songId) throw new Error('Song ID required')
      
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('song_id', songId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
  }
}

async function handleHistory(req: Request, supabase: any, userId: string) {
  switch (req.method) {
    case 'GET':
      const url = new URL(req.url)
      const limit = parseInt(url.searchParams.get('limit') || '50')
      
      const { data: history } = await supabase
        .from('listening_history')
        .select(`
          *,
          songs (*)
        `)
        .eq('user_id', userId)
        .order('played_at', { ascending: false })
        .limit(limit)

      return new Response(JSON.stringify(history), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    case 'POST':
      const { songData, playDuration, completed } = await req.json()
      
      // First ensure song exists in songs table
      await supabase
        .from('songs')
        .upsert(songData, { onConflict: 'id' })

      // Add to history
      const { data: historyEntry } = await supabase
        .from('listening_history')
        .insert({
          user_id: userId,
          song_id: songData.id,
          play_duration: playDuration || 0,
          completed: completed || false
        })
        .select()
        .single()

      return new Response(JSON.stringify(historyEntry), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
  }
}

async function handleSongs(req: Request, supabase: any) {
  switch (req.method) {
    case 'POST':
      const { songs } = await req.json()
      
      // Bulk upsert songs
      const { data: upsertedSongs } = await supabase
        .from('songs')
        .upsert(songs, { onConflict: 'id' })
        .select()

      return new Response(JSON.stringify(upsertedSongs), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
  }
}