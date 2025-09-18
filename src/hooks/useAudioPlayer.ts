import { useState, useRef, useEffect, useCallback } from "react";
import { Song, PlayerState } from "../types/music";

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentSong: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isShuffled: true, // Auto-shuffle by default
    isRepeated: false,
    queue: [],
    currentIndex: -1,
  });

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  // Forward declaration for playNext
  const playNext = useCallback(() => {
    if (playerState.queue.length === 0) return;

    let nextIndex = playerState.currentIndex + 1;
    if (nextIndex >= playerState.queue.length) {
      // If we've reached the end, stop playing instead of looping
      pause();
      setPlayerState((prev) => ({
        ...prev,
        isPlaying: false,
      }));
      return;
    }

    const nextSong = playerState.queue[nextIndex];
    setPlayerState((prev) => ({
      ...prev,
      currentIndex: nextIndex,
      currentSong: nextSong,
      currentTime: 0,
    }));
  }, [
    playerState.queue,
    playerState.currentIndex,
    pause,
  ]);

  const handleEnded = useCallback(() => {
    if (playerState.isRepeated) {
      // Restart the same song
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
    } else {
      // Play next song automatically
      playNext();
    }
  }, [playerState.isRepeated, playNext]);

  // Media Session API for background playback
  useEffect(() => {
    if ("mediaSession" in navigator && playerState.currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: playerState.currentSong.title,
        artist: playerState.currentSong.artist,
        album: playerState.currentSong.album,
        artwork: [
          {
            src: playerState.currentSong.image,
            sizes: "300x300",
            type: "image/jpeg",
          },
        ],
      });

      navigator.mediaSession.setActionHandler("play", play);
      navigator.mediaSession.setActionHandler("pause", pause);
      navigator.mediaSession.setActionHandler("previoustrack", playPrevious);
      navigator.mediaSession.setActionHandler("nexttrack", playNext);
    }
  }, [playerState.currentSong]);

  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadQueue = useCallback(
    (songs: Song[], startIndex: number = 0) => {
      if (!songs.length) return;

      const queue = playerState.isShuffled ? shuffleArray(songs) : songs;
      const currentIndex = playerState.isShuffled
        ? queue.findIndex((song) => song.id === songs[startIndex]?.id)
        : startIndex;

      setPlayerState((prev) => ({
        ...prev,
        queue,
        currentIndex: currentIndex >= 0 ? currentIndex : 0,
        currentSong: queue[currentIndex >= 0 ? currentIndex : 0] || null,
      }));
    },
    [playerState.isShuffled]
  );

  const play = useCallback(async () => {
    if (!audioRef.current || !playerState.currentSong) return;

    try {
      if (audioRef.current.src !== playerState.currentSong.media_url) {
        audioRef.current.src = playerState.currentSong.media_url;
      }
      await audioRef.current.play();
      setPlayerState((prev) => ({ ...prev, isPlaying: true }));
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  }, [playerState.currentSong]);

  const togglePlay = useCallback(() => {
    if (playerState.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [playerState.isPlaying, play, pause]);

  const playPrevious = useCallback(() => {
    if (playerState.queue.length === 0) return;

    let prevIndex = playerState.currentIndex - 1;
    if (prevIndex < 0) {
      if (playerState.isRepeated) {
        prevIndex = playerState.queue.length - 1;
      } else {
        return;
      }
    }

    const prevSong = playerState.queue[prevIndex];
    setPlayerState((prev) => ({
      ...prev,
      currentIndex: prevIndex,
      currentSong: prevSong,
      currentTime: 0,
    }));
  }, [playerState.queue, playerState.currentIndex, playerState.isRepeated]);

  const playSong = useCallback(
    (song: Song, songs: Song[] = []) => {
      const songList = songs.length > 0 ? songs : [song];
      const index = songList.findIndex((s) => s.id === song.id);
      loadQueue(songList, index);
    },
    [loadQueue]
  );

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = time;
    setPlayerState((prev) => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (!audioRef.current) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));
    audioRef.current.volume = clampedVolume;
    setPlayerState((prev) => ({ ...prev, volume: clampedVolume }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setPlayerState((prev) => {
      const newShuffled = !prev.isShuffled;
      // Re-shuffle or un-shuffle the queue
      if (prev.queue.length > 0 && prev.currentSong) {
        const currentSong = prev.currentSong;
        const newQueue = newShuffled
          ? shuffleArray(prev.queue)
          : [...prev.queue].sort((a, b) => a.title.localeCompare(b.title));
        const newIndex = newQueue.findIndex(
          (song) => song.id === currentSong.id
        );

        return {
          ...prev,
          isShuffled: newShuffled,
          queue: newQueue,
          currentIndex: newIndex >= 0 ? newIndex : 0,
        };
      }
      return { ...prev, isShuffled: newShuffled };
    });
  }, []);

  const toggleRepeat = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isRepeated: !prev.isRepeated }));
  }, []);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata";
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setPlayerState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    };

    const handleLoadedMetadata = () => {
      setPlayerState((prev) => ({
        ...prev,
        duration: audio.duration,
      }));
    };

    const handleError = (e: Event) => {
      console.error("Audio playback error:", e);
    };

    // Add event listeners
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [handleEnded]);

  // Auto-play when current song changes
  useEffect(() => {
    if (playerState.currentSong && audioRef.current) {
      play();
    }
  }, [playerState.currentSong, play]);

  return {
    playerState,
    play,
    pause,
    togglePlay,
    playNext,
    playPrevious,
    playSong,
    loadQueue,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
  };
};
