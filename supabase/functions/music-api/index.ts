import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError) {
      throw authError
    }

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const url = new URL(req.url)
    const segments = url.pathname.split('/').filter(Boolean)
    let endpoint = segments[segments.length - 1] || ''
    // Support trailing slashes and base calls with ?endpoint=...
    if (!endpoint || endpoint === 'music-api') {
      endpoint = url.searchParams.get('endpoint') || ''
    }

    switch (endpoint) {
      case "playlists":
        return await handlePlaylists(req, supabaseClient, user.id)
      case "playlist-songs":
        return await handlePlaylistSongs(req, supabaseClient, user.id)
      case "favorites":
        return await handleFavorites(req, supabaseClient, user.id)
      case "history":
        return await handleHistory(req, supabaseClient, user.id)
      case "songs":
        return await handleSongs(req, supabaseClient)
      default:
        return new Response("Not found", {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message ?? "Unexpected error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

/* --- Playlists --- */
async function handlePlaylists(req: Request, supabase: any, userId: string) {
  const url = new URL(req.url)
  const playlistId = url.searchParams.get("id")

  switch (req.method) {
    case "GET":
      if (playlistId) {
        const { data: playlist } = await supabase
          .from("playlists")
          .select(`
            *,
            playlist_songs (
              position,
              songs (*)
            )
          `)
          .eq("id", playlistId)
          .single()

        return new Response(JSON.stringify(playlist), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      } else {
        const includeSongs = url.searchParams.get('include_songs') === 'true'
        
        if (includeSongs) {
          const { data: playlists } = await supabase
            .from("playlists")
            .select(`
              *,
              playlist_songs (
                position,
                songs (*)
              )
            `)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })

          return new Response(JSON.stringify(playlists), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        } else {
          const { data: playlists } = await supabase
            .from("playlists")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })

          return new Response(JSON.stringify(playlists), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
      }

    case "POST":
      const { name, description, songIds = [] } = await req.json()
      const { data: playlist, error } = await supabase
        .from("playlists")
        .insert({
          name,
          description,
          user_id: userId,
        })
        .select()
        .single()

      if (error) throw error

      // Don't add songs here - they should be added via the playlist-songs endpoint
      // This ensures proper song data handling and validation

      return new Response(JSON.stringify(playlist), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })

    case "PUT":
      if (!playlistId) throw new Error("Playlist ID required")
      const updates = await req.json()
      const { data: updatedPlaylist } = await supabase
        .from("playlists")
        .update(updates)
        .eq("id", playlistId)
        .eq("user_id", userId)
        .select()
        .single()

      return new Response(JSON.stringify(updatedPlaylist), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })

    case "DELETE":
      const playlistIdParam = url.searchParams.get("playlistId") || url.searchParams.get("id")
      if (!playlistIdParam) throw new Error("Playlist ID required")
      
      // Delete playlist songs first
      await supabase
        .from("playlist_songs")
        .delete()
        .eq("playlist_id", playlistIdParam)
      
      // Delete playlist
      await supabase
        .from("playlists")
        .delete()
        .eq("id", playlistIdParam)
        .eq("user_id", userId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
  }
}

/* --- Favorites --- */
async function handleFavorites(req: Request, supabase: any, userId: string) {
  const url = new URL(req.url)
  const songId = url.searchParams.get("songId")

  switch (req.method) {
    case "GET":
      const { data: favorites } = await supabase
        .from("favorites")
        .select(`
          *,
          songs (*)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      return new Response(JSON.stringify(favorites), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })

    case "POST":
      const { songData } = await req.json()
      await supabase.from("songs").upsert(songData, { onConflict: "id" })

      const { data: favorite } = await supabase
        .from("favorites")
        .upsert(
          { user_id: userId, song_id: songData.id },
          { onConflict: "user_id,song_id" }
        )
        .select()
        .single()

      return new Response(JSON.stringify(favorite), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })

    case "DELETE":
      if (!songId) throw new Error("Song ID required")
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("song_id", songId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
  }
}

/* --- History --- */
async function handleHistory(req: Request, supabase: any, userId: string) {
  switch (req.method) {
    case "GET":
      const url = new URL(req.url)
      const limit = parseInt(url.searchParams.get("limit") || "50")
      const { data: history } = await supabase
        .from("listening_history")
        .select(`
          *,
          songs (*)
        `)
        .eq("user_id", userId)
        .order("played_at", { ascending: false })
        .limit(limit)

      return new Response(JSON.stringify(history), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })

    case "POST":
      const { songData, playDuration, completed } = await req.json()
      await supabase.from("songs").upsert(songData, { onConflict: "id" })
      const { data: historyEntry } = await supabase
        .from("listening_history")
        .insert({
          user_id: userId,
          song_id: songData.id,
          play_duration: playDuration || 0,
          completed: completed || false,
        })
        .select()
        .single()

      return new Response(JSON.stringify(historyEntry), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
  }
}

/* --- Playlist Songs --- */
async function handlePlaylistSongs(req: Request, supabase: any, userId: string) {
  const url = new URL(req.url)
  
  switch (req.method) {
    case "POST":
      const { playlistId, song } = await req.json()
      
      // Verify playlist ownership
      const { data: playlist } = await supabase
        .from("playlists")
        .select("id")
        .eq("id", playlistId)
        .eq("user_id", userId)
        .single()

      if (!playlist) {
        throw new Error("Playlist not found or access denied")
      }

      // Ensure song exists in songs table
      await supabase.from("songs").upsert(song, { onConflict: "id" })

      // Get next position
      const { count } = await supabase
        .from("playlist_songs")
        .select("*", { count: "exact" })
        .eq("playlist_id", playlistId)

      // Add song to playlist
      const { data: playlistSong, error: insertError } = await supabase
        .from("playlist_songs")
        .insert({
          playlist_id: playlistId,
          song_id: song.id,
          position: (count || 0) + 1
        })
        .select()
        .single()

      if (insertError) {
        // Unique violation means the song is already in the playlist
        if ((insertError as any).code === '23505') {
          return new Response(JSON.stringify({ success: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
        throw insertError
      }

      return new Response(JSON.stringify(playlistSong), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    
    case "DELETE":
      const playlistId = url.searchParams.get('playlistId')
      const songId = url.searchParams.get('songId')
      
      if (!playlistId || !songId) {
        throw new Error("Playlist ID and Song ID required")
      }
      
      // Verify playlist ownership
      const { data: playlistOwnership } = await supabase
        .from("playlists")
        .select("id")
        .eq("id", playlistId)
        .eq("user_id", userId)
        .single()

      if (!playlistOwnership) {
        throw new Error("Playlist not found or access denied")
      }
      
      // Remove song from playlist
      const { error: deleteError } = await supabase
        .from("playlist_songs")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("song_id", songId)

      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
  }
}

/* --- Songs --- */
async function handleSongs(req: Request, supabase: any) {
  switch (req.method) {
    case "POST":
      const body = await req.json()

      // If full song objects are provided, upsert them and return
      if (Array.isArray(body.songs) && body.songs.length > 0) {
        const { data: upsertedSongs, error } = await supabase
          .from("songs")
          .upsert(body.songs, { onConflict: "id" })
          .select()
        if (error) throw error
        return new Response(JSON.stringify(upsertedSongs), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // If only song IDs are provided, fetch them from the DB and return
      if (Array.isArray(body.songIds) && body.songIds.length > 0) {
        const { data: foundSongs, error } = await supabase
          .from("songs")
          .select("*")
          .in("id", body.songIds)
        if (error) throw error
        return new Response(JSON.stringify(foundSongs || []), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Nothing to do
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
  }
}

