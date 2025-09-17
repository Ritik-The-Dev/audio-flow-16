import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Shuffle,
  Repeat,
  Heart
} from 'lucide-react';
import { PlayerState } from '../types/music';

interface MusicPlayerProps {
  playerState: PlayerState;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  handleToggleFavorite: (data) => void;
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  playerState,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  handleToggleFavorite
}) => {
  const { currentSong, isPlaying, currentTime, duration, volume, isShuffled, isRepeated } = playerState;

  if (!currentSong) {
    return null;
  }

  return (
    <div className="player-container fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-sm mx-auto bg-card rounded-lg p-4 animate-slide-up">
        {/* Song Info */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={currentSong.image}
            alt={currentSong.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{currentSong.title}</h3>
            <p className="text-muted-foreground text-xs truncate">{currentSong.artist}</p>
          </div>
          <Button onClick={() => handleToggleFavorite(currentSong)} variant="ghost" size="icon" className="text-muted-foreground">
            <Heart className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={(value) => onSeek(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleShuffle}
            className={isShuffled ? 'text-primary' : 'text-muted-foreground'}
          >
            <Shuffle className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onPrevious}>
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              variant="default"
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={onTogglePlay}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={onNext}>
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleRepeat}
            className={isRepeated ? 'text-primary' : 'text-muted-foreground'}
          >
            <Repeat className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={(value) => onVolumeChange(value[0] / 100)}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
};