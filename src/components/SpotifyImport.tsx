import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Music } from 'lucide-react';
import { toast } from 'sonner';
import { Song } from '@/types/music';
import { useMusic } from '@/hooks/useMusic';

interface SpotifyImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (songs: Song[]) => void;
}

export const SpotifyImport: React.FC<SpotifyImportProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const { createPlaylist } = useMusic();

  const extractPlaylistId = (url: string) => {
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const searchSongInAPI = async (track: string, artist: string): Promise<Song | null> => {
    try {
      const query = `${track} ${artist}`;
      const response = await fetch(`https://music-backend-ten.vercel.app/api/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const song = data[0];
        return {
          id: song.id,
          title: song.song,
          artist: song.primary_artists,
          image: song.image,
          album: song.album,
          media_url: song.media_url,
          duration: song.duration,
        };
      }
      return null;
    } catch (error) {
      console.error('Error searching song:', error);
      return null;
    }
  };

  const handleImport = async () => {
    if (!playlistUrl.trim()) {
      toast.error('Please enter a Spotify playlist URL');
      return;
    }

    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      toast.error('Invalid Spotify playlist URL');
      return;
    }

    setIsImporting(true);

    try {
      // Mock Spotify API call - In real implementation, you'd use Spotify Web API
      // For demo purposes, we'll create some sample songs and search for them
      const mockSpotifyTracks = [
        { name: 'Shape of You', artists: [{ name: 'Ed Sheeran' }] },
        { name: 'Blinding Lights', artists: [{ name: 'The Weeknd' }] },
        { name: 'Dance The Night', artists: [{ name: 'Dua Lipa' }] },
        { name: 'Anti-Hero', artists: [{ name: 'Taylor Swift' }] },
        { name: 'Flowers', artists: [{ name: 'Miley Cyrus' }] },
      ];

      const importedSongs: Song[] = [];
      
      for (const track of mockSpotifyTracks) {
        const song = await searchSongInAPI(track.name, track.artists[0].name);
        if (song) {
          importedSongs.push(song);
        }
      }

      if (importedSongs.length > 0) {
        // Create playlist with imported songs
        const playlistName = `Imported from Spotify - ${new Date().toLocaleDateString()}`;
        await createPlaylist(playlistName, 'Imported from Spotify playlist', importedSongs.map(s => s.id));
        
        onImportComplete(importedSongs);
        toast.success(`Successfully imported ${importedSongs.length} songs`);
        onClose();
        setPlaylistUrl('');
      } else {
        toast.error('No matching songs found');
      }
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Failed to import playlist');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Import Spotify Playlist
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="playlist-url">Spotify Playlist URL</Label>
            <Input
              id="playlist-url"
              type="url"
              placeholder="https://open.spotify.com/playlist/..."
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>• Go to Spotify and copy the playlist URL</p>
            <p>• We'll search for matching songs in our database</p>
            <p>• Songs will be added to a new playlist in your account</p>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import Playlist'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};