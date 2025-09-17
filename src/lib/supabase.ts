import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          cover_image: string | null
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          cover_image?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          cover_image?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      songs: {
        Row: {
          id: string
          title: string
          artist: string
          album: string | null
          image: string | null
          media_url: string
          duration: string | null
          created_at: string
        }
        Insert: {
          id: string
          title: string
          artist: string
          album?: string | null
          image?: string | null
          media_url: string
          duration?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string
          album?: string | null
          image?: string | null
          media_url?: string
          duration?: string | null
          created_at?: string
        }
      }
      playlist_songs: {
        Row: {
          id: string
          playlist_id: string
          song_id: string
          position: number
          added_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          song_id: string
          position: number
          added_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          song_id?: string
          position?: number
          added_at?: string
        }
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          song_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          song_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          created_at?: string
        }
      }
      listening_history: {
        Row: {
          id: string
          user_id: string
          song_id: string
          played_at: string
          play_duration: number
          completed: boolean
        }
        Insert: {
          id?: string
          user_id: string
          song_id: string
          played_at?: string
          play_duration?: number
          completed?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          played_at?: string
          play_duration?: number
          completed?: boolean
        }
      }
    }
  }
}