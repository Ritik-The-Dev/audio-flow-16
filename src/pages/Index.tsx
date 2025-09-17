import React, { useState, useEffect } from 'react';
import { SearchBar } from '../components/SearchBar';
import { TrackList } from '../components/TrackList';
import { MusicPlayer } from '../components/MusicPlayer';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { searchSongs, getTrendingSongs } from '../utils/api';
import { Song } from '../types/music';
import { useToast } from '../hooks/use-toast';
import { Music, Loader2 } from 'lucide-react';

const Index = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const {
    playerState,
    togglePlay,
    playNext,
    playPrevious,
    playSong,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  } = useAudioPlayer();

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    try {
      setIsLoading(true);
      const trendingSongs = await getTrendingSongs();
      setSongs(trendingSongs);
      setSearchQuery('');
      
      if (trendingSongs.length > 0) {
        toast({
          title: "Music loaded!",
          description: `Found ${trendingSongs.length} trending songs`,
        });
      }
    } catch (error) {
      toast({
        title: "Error loading music",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (query === 'trending') {
      await loadTrending();
      return;
    }

    try {
      setIsLoading(true);
      setSearchQuery(query);
      const searchResults = await searchSongs(query);
      setSongs(searchResults);
      
      if (searchResults.length === 0) {
        toast({
          title: "No results found",
          description: `Try searching for something else instead of "${query}"`,
        });
      } else {
        toast({
          title: "Search complete",
          description: `Found ${searchResults.length} songs`,
        });
      }
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glassmorphism border-b">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Music className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold gradient-text">VibeStream</h1>
            </div>
            <ThemeToggle />
          </div>
          
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-1">
            {searchQuery ? `Results for "${searchQuery}"` : 'Trending Now'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {searchQuery 
              ? `${songs.length} songs found` 
              : 'Discover what\'s popular today'
            }
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Searching...' : 'Loading trending music...'}
            </p>
          </div>
        )}

        {/* Track List */}
        {!isLoading && (
          <TrackList
            songs={songs}
            currentSong={playerState.currentSong}
            isPlaying={playerState.isPlaying}
            onPlaySong={playSong}
            onTogglePlay={togglePlay}
          />
        )}

        {/* Bottom padding for fixed player */}
        {playerState.currentSong && <div className="h-32" />}
      </main>

      {/* Fixed Music Player */}
      <MusicPlayer
        playerState={playerState}
        onTogglePlay={togglePlay}
        onNext={playNext}
        onPrevious={playPrevious}
        onSeek={seek}
        onVolumeChange={setVolume}
        onToggleShuffle={toggleShuffle}
        onToggleRepeat={toggleRepeat}
      />
    </div>
  );
};

export default Index;
