export interface Song {
  id: string;
  title: string;
  artist: string;
  image: string;
  album: string;
  media_url: string;
  duration: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: string;
}

export interface PlayerState {
  isPlaying: boolean;
  currentSong: Song | null;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  isRepeated: boolean;
  queue: Song[];
  currentIndex: number;
}