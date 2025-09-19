import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Music, Play, Heart, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { useMusic } from '@/hooks/useMusic';
import { Song } from '@/types/music';

interface PlaylistManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSongs?: Song[];
}

interface PlaylistDetailsProps {
  playlist: any;
  onPlay: (song: Song, songs: Song[]) => void;
  onToggleFavorite: (song: Song) => void;
  favorites: string[];
}

export const CreatePlaylistDialog: React.FC<PlaylistManagerProps> = ({
  isOpen,
  onClose,
  selectedSongs = [],
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createPlaylist, fetchPlaylists } = useMusic();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    setIsCreating(true);
    try {
      await createPlaylist(
        name.trim(),
        description.trim(),
        selectedSongs.map(s => s.id)
      );
      await fetchPlaylists(); // Refresh playlists immediately
      toast.success('Playlist created successfully');
      onClose();
      setName('');
      setDescription('');
    } catch (error) {
      toast.error('Failed to create playlist');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Playlist
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="playlist-name">Playlist Name</Label>
            <Input
              id="playlist-name"
              placeholder="My Amazing Playlist"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="playlist-description">Description (Optional)</Label>
            <Textarea
              id="playlist-description"
              placeholder="Describe your playlist..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          {selectedSongs.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedSongs.length} song(s) will be added to this playlist
            </div>
          )}
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Playlist'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const PlaylistDetails: React.FC<PlaylistDetailsProps> = ({
  playlist,
  onPlay,
  onToggleFavorite,
  favorites,
}) => {
  const [isLooping, setIsLooping] = useState(false);
  const playlistSongs = playlist.playlist_songs?.map((ps: any) => ps.songs) || [];

  const handlePlayAll = () => {
    if (playlistSongs.length > 0) {
      onPlay(playlistSongs[0], playlistSongs);
    }
  };

  const handleToggleLoop = () => {
    setIsLooping(!isLooping);
    toast.success(`Playlist loop ${!isLooping ? 'enabled' : 'disabled'}`);
  };

  const formatDuration = (duration: string): string => {
    if (duration.includes(':')) return duration;
    const seconds = parseInt(duration);
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Playlist Header */}
      <div className="flex items-start gap-4 p-4 bg-card rounded-lg">
        <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
          <Music className="w-8 h-8 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-lg">{playlist.name}</h2>
          {playlist.description && (
            <p className="text-muted-foreground text-sm">{playlist.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {playlistSongs.length} song(s)
          </p>
        </div>
        {playlistSongs.length > 0 && (
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={handlePlayAll}>
              <Play className="w-4 h-4 mr-2" />
              Play All
            </Button>
            <Button 
              variant={isLooping ? "default" : "outline"}
              onClick={handleToggleLoop}
              size="icon"
            >
              <Repeat className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Songs List */}
      {playlistSongs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No songs in this playlist yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {playlistSongs.map((song: Song, index: number) => (
            <div
              key={song.id}
              className="flex items-center gap-3 p-3 hover:bg-accent rounded-lg cursor-pointer"
              onClick={() => onPlay(song, playlistSongs)}
            >
              <img
                src={song.image}
                alt={song.title}
                className="w-10 h-10 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{song.title}</h4>
                <p className="text-muted-foreground text-xs truncate">{song.artist}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {formatDuration(song.duration)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(song);
                  }}
                >
                  <Heart className={`w-4 h-4 ${
                    favorites.includes(song.id) ? 'fill-red-500 text-red-500' : ''
                  }`} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};