import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, MoreVertical, Heart, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Song } from '../types/music';
import { useMusic } from '@/hooks/useMusic';
import { toast } from 'sonner';

interface TrackListProps {
  songs: Song[];
  currentSong?: Song | null;
  isPlaying?: boolean;
  onPlaySong: (song: Song, songs: Song[]) => void;
  onTogglePlay: () => void;
  onToggleFavorite?: (song: Song) => void;
  favorites?: string[];
}

const formatDuration = (duration: string): string => {
  // Handle different duration formats
  if (duration.includes(':')) return duration;
  
  const seconds = parseInt(duration);
  if (isNaN(seconds)) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const TrackList: React.FC<TrackListProps> = ({
  songs,
  currentSong,
  isPlaying = false,
  onPlaySong,
  onTogglePlay,
  onToggleFavorite,
  favorites = []
}) => {
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const { playlists, addSongToPlaylist } = useMusic();

  const handleAddToPlaylist = (song: Song) => {
    setSelectedSong(song);
    setShowAddToPlaylist(true);
  };

  const handlePlaylistSelect = async (playlistId: string) => {
    if (selectedSong) {
      try {
        await addSongToPlaylist(playlistId, selectedSong);
        toast.success('Song added to playlist');
        setShowAddToPlaylist(false);
        setSelectedSong(null);
      } catch (error) {
        toast.error('Failed to add song to playlist');
      }
    }
  };

  if (songs?.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <p className="text-lg mb-2">No songs found</p>
          <p className="text-sm">Try searching for something else</p>
        </div>
      </div>
    );
  }

  const handleSongClick = (song: Song) => {
    if (currentSong?.id === song.id) {
      onTogglePlay();
    } else {
      onPlaySong(song, songs);
    }
  };

  return (
    <div className="space-y-1">
      {songs?.map((song, index) => {
        const isCurrentSong = currentSong?.id === song.id;
        const isCurrentlyPlaying = isCurrentSong && isPlaying;

        return (
          <div
            key={song.id}
            className={`track-item rounded-lg p-3 cursor-pointer group ${
              isCurrentSong ? 'bg-primary/10 border border-primary/20' : ''
            }`}
            onClick={() => handleSongClick(song)}
          >
            <div className="flex items-center gap-3">
              {/* Play/Pause Button */}
              <div className="relative flex-shrink-0">
                <img 
                  src={song.image} 
                  alt={song.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-white hover:bg-white/20">
                    {isCurrentlyPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Song Info */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-medium text-sm truncate ${
                  isCurrentSong ? 'text-primary' : 'text-foreground'
                }`}>
                  {song.title}
                </h3>
                <p className="text-muted-foreground text-xs truncate">
                  {song.artist}
                </p>
                {song.album && (
                  <p className="text-muted-foreground text-xs truncate">
                    {song.album}
                  </p>
                )}
              </div>

              {/* Duration & More */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs font-mono">
                  {formatDuration(song.duration)}
                </span>
                {onToggleFavorite && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity ${
                      favorites.includes(song.id) ? 'text-red-500 opacity-100' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(song);
                    }}
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(song.id) ? 'fill-current' : ''}`} />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToPlaylist(song);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Playlist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Playing indicator */}
            {isCurrentlyPlaying && (
              <div className="flex items-center gap-1 mt-2 ml-15">
                <div className="flex gap-1">
                  <div className="w-1 bg-primary rounded-full animate-pulse-gentle" style={{ height: '12px' }}></div>
                  <div className="w-1 bg-primary rounded-full animate-pulse-gentle" style={{ height: '8px', animationDelay: '0.1s' }}></div>
                  <div className="w-1 bg-primary rounded-full animate-pulse-gentle" style={{ height: '16px', animationDelay: '0.2s' }}></div>
                  <div className="w-1 bg-primary rounded-full animate-pulse-gentle" style={{ height: '10px', animationDelay: '0.3s' }}></div>
                </div>
                <span className="text-xs text-primary font-medium ml-2">Now playing</span>
              </div>
            )}
          </div>
        );
      })}

      {/* Add to Playlist Dialog */}
      <Dialog open={showAddToPlaylist} onOpenChange={setShowAddToPlaylist}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {playlists.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No playlists found. Create a playlist first.
              </p>
            ) : (
              playlists.map((playlist: any) => (
                <Button
                  key={playlist.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handlePlaylistSelect(playlist.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {playlist.name}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};