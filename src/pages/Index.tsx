import React, { useState, useEffect } from 'react';
import { SearchBar } from '../components/SearchBar';
import { TrackList } from '../components/TrackList';
import { MusicPlayer } from '../components/MusicPlayer';
import { ThemeToggle } from '../components/ThemeToggle';
import { AuthModal } from '../components/AuthModal';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useAuth } from '../hooks/useAuth';
import { useMusic } from '../hooks/useMusic';
import { searchSongs, getTrendingSongs } from '../utils/api';
import { Song } from '../types/music';
import { Button } from '@/components/ui/button';
import { Music, Loader2, User, Heart, ListMusic, History, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from "@/lib/supabase"  // your client instance

export const saveSongsToSupabase = async (songs: Song[]) => {
  try {
    // get JWT from current logged-in user
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) throw new Error("No auth token found");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-api/songs`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ songs }),
      }
    );

    if (!res.ok) throw new Error(`Failed to save songs: ${res.status}`);

    return await res.json(); // inserted/updated rows
  } catch (err) {
    console.error("Error saving songs:", err);
    return [];
  }
};

const Index = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'favorites' | 'playlists' | 'history'>('home');
  
  const { user, loading: authLoading, signOut } = useAuth();
  const { 
    favorites, 
    playlists, 
    history, 
    addToFavorites, 
    removeFromFavorites, 
    isFavorited,
    addToHistory 
  } = useMusic();

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
      
      if (trendingSongs?.length > 0) {
        toast.success(`Found ${trendingSongs?.length} trending songs`);
      }
    } catch (error) {
      toast.error('Error loading music. Please check your internet connection.');
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
      saveSongsToSupabase(searchResults)
      setSongs(searchResults);
      
      if (searchResults?.length === 0) {
        toast.error(`No results found for "${query}"`);
      } else {
        toast.success(`Found ${searchResults?.length} songs`);
      }
    } catch (error) {
      toast.error('Search failed. Please check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSongPlay = async (song: Song, songsList: Song[]) => {
    playSong(song, songsList);
    
    // Add to history if user is logged in
    if (user) {
      await addToHistory(song);
    }
  };

  const handleToggleFavorite = async (song: Song) => {
    if (!user) {
      toast.error('Please sign in to add favorites');
      setShowAuthModal(true);
      return;
    }

    try {
      if (isFavorited(song.id)) {
        await removeFromFavorites(song.id);
        toast.success('Removed from favorites');
      } else {
        console.log('Fvoruite')
        await addToFavorites(song);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.log('Errror ',error)
      toast.error('Failed to update favorites');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const getCurrentSongs = () => {
    switch (currentView) {
      case 'favorites':
        return favorites;
      case 'history':
        return history?.map(h => h.songs);
      default:
        return songs;
    }
  };

  const getCurrentTitle = () => {
    switch (currentView) {
      case 'favorites':
        return 'Your Favorites';
      case 'playlists':
        return 'Your Playlists';
      case 'history':
        return 'Recently Played';
      default:
        return searchQuery ? `Results for "${searchQuery}"` : 'Trending Now';
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
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user ? (
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setShowAuthModal(true)}>
                  <User className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Navigation */}
          {user && (
            <div className="flex gap-2 mb-4">
              <Button 
                variant={currentView === 'home' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentView('home')}
              >
                Home
              </Button>
              <Button 
                variant={currentView === 'favorites' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentView('favorites')}
              >
                <Heart className="w-3 h-3 mr-1" />
                Favorites
              </Button>
              <Button 
                variant={currentView === 'playlists' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentView('playlists')}
              >
                <ListMusic className="w-3 h-3 mr-1" />
                Playlists
              </Button>
              <Button 
                variant={currentView === 'history' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentView('history')}
              >
                <History className="w-3 h-3 mr-1" />
                History
              </Button>
            </div>
          )}
          
          {currentView === 'home' && (
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-1">
            {getCurrentTitle()}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentView === 'home' 
              ? (searchQuery 
                ? `${songs?.length} songs found` 
                : 'Discover what\'s popular today')
              : currentView === 'favorites'
              ? `${favorites?.length} favorite songs`
              : currentView === 'history'
              ? `${history?.length} recently played`
              : `${playlists?.length} playlists`
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
          <>
            {currentView === 'playlists' ? (
              <div className="space-y-4">
                {playlists?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No playlists yet</p>
                    <p className="text-sm">Create your first playlist!</p>
                  </div>
                ) : (
                  playlists?.map((playlist) => (
                    <div key={playlist.id} className="p-4 bg-card rounded-lg">
                      <h3 className="font-semibold">{playlist.name}</h3>
                      {playlist.description && (
                        <p className="text-sm text-muted-foreground">{playlist.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <TrackList
                songs={getCurrentSongs()}
                currentSong={playerState.currentSong}
                isPlaying={playerState.isPlaying}
                onPlaySong={handleSongPlay}
                onTogglePlay={togglePlay}
                onToggleFavorite={handleToggleFavorite}
                favorites={user ? favorites?.map(f => f.id) : []}
              />
            )}
          </>
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
        handleToggleFavorite={handleToggleFavorite}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default Index;
