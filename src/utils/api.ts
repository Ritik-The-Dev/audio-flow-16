import axios from 'axios';
import { Song } from '../types/music';
import { supabase } from '@/lib/supabase';

const API_BASE = 'https://music-backend-ten.vercel.app/api';

// Cache songs in Supabase after fetching from external API
const cacheSongsInSupabase = async (songs: Song[]) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/songs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ songs }),
    });
  } catch (error) {
    console.error('Error caching songs:', error);
  }
};

// Search in local Supabase first, then external API
export const searchSongs = async (query: string = 'trending', offset: number = 0): Promise<Song[]> => {
  try {
    // First try to get songs from local Supabase cache
    const { data: cachedSongs } = await supabase
      .from('songs')
      .select('*')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%`)
      .range(offset, offset + 19);

    // If we have enough cached songs, return them
    if (cachedSongs && cachedSongs.length >= 10) {
      return cachedSongs.map((song: any) => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        image: song.image,
        album: song.album,
        media_url: song.media_url,
        duration: song.duration,
      }));
    }

    // Otherwise fetch from external API
    const { data } = await axios.get(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
    
    const songs = data.map((e: any) => ({
      id: e.id,
      title: e.song,
      artist: e.primary_artists,
      image: e.image,
      album: e.album,
      media_url: e.media_url,
      duration: e.duration,
    }));

    // Cache the new songs
    await cacheSongsInSupabase(songs);
    
    return songs;
  } catch (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
};

export const getTrendingSongs = (offset: number = 0) => searchSongs('trending', offset);