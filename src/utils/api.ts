import axios from 'axios';
import { Song } from '../types/music';

const API_BASE = 'https://music-backend-ten.vercel.app/api';

export const searchSongs = async (query: string = 'trending'): Promise<Song[]> => {
  try {
    const { data } = await axios.get(`${API_BASE}/search?query=${encodeURIComponent(query)}`);
    
    return data.map((e: any) => ({
      id: e.id,
      title: e.song,
      artist: e.primary_artists,
      image: e.image,
      album: e.album,
      media_url: e.media_url,
      duration: e.duration,
    }));
  } catch (error) {
    console.error('Error fetching songs:', error);
    return [];
  }
};

export const getTrendingSongs = () => searchSongs('trending');