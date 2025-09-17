import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('No user found')
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    
    switch (action) {
      case 'add-song':
        return await addSongToPlaylist(req, supabaseClient, user.id)
      case 'remove-song':
        return await removeSongFromPlaylist(req, supabaseClient, user.id)
      case 'reorder-songs':
        return await reorderPlaylistSongs(req, supabaseClient, user.id)
      default:
        return new Response('Action required', { status: 400, headers: corsHeaders })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function addSongToPlaylist(req: Request, supabase: any, userId: string) {
  const { playlistId, songData, position } = await req.json()
  
  // Verify playlist ownership
  const { data: playlist } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', playlistId)
    .eq('user_id', userId)
    .single()

  if (!playlist) {
    throw new Error('Playlist not found or access denied')
  }

  // Ensure song exists
  await supabase
    .from('songs')
    .upsert(songData, { onConflict: 'id' })

  // Get current max position if no position specified
  let songPosition = position
  if (songPosition === undefined) {
    const { data: maxPos } = await supabase
      .from('playlist_songs')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    songPosition = (maxPos?.position || -1) + 1
  }

  // Add song to playlist
  const { data: playlistSong, error } = await supabase
    .from('playlist_songs')
    .insert({
      playlist_id: playlistId,
      song_id: songData.id,
      position: songPosition
    })
    .select()
    .single()

  if (error && error.code === '23505') { // Unique constraint violation
    throw new Error('Song is already in this playlist')
  }

  return new Response(JSON.stringify(playlistSong), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function removeSongFromPlaylist(req: Request, supabase: any, userId: string) {
  const { playlistId, songId } = await req.json()
  
  // Verify playlist ownership
  const { data: playlist } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', playlistId)
    .eq('user_id', userId)
    .single()

  if (!playlist) {
    throw new Error('Playlist not found or access denied')
  }

  // Remove song from playlist
  await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId)

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function reorderPlaylistSongs(req: Request, supabase: any, userId: string) {
  const { playlistId, songOrders } = await req.json() // songOrders: [{ songId, position }]
  
  // Verify playlist ownership
  const { data: playlist } = await supabase
    .from('playlists')
    .select('id')
    .eq('id', playlistId)
    .eq('user_id', userId)
    .single()

  if (!playlist) {
    throw new Error('Playlist not found or access denied')
  }

  // Update positions
  for (const { songId, position } of songOrders) {
    await supabase
      .from('playlist_songs')
      .update({ position })
      .eq('playlist_id', playlistId)
      .eq('song_id', songId)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}