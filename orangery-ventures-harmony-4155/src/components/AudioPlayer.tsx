import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';

interface AudioPlayerProps {
  src: string;
  title?: string;
  fairyTaleId?: string;
  className?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, title, fairyTaleId, className }) => {
  const { audioState, playAudio, pauseAudio, togglePlayPause, seekTo, setVolume, toggleMute } = useAudio();
  const isCurrentTrack = audioState.currentFairyTaleId === fairyTaleId;
  const isPlaying = isCurrentTrack && audioState.isPlaying;

  const handlePlayPause = () => {
    if (!fairyTaleId) return;

    if (isCurrentTrack) {
      // Если это текущий трек, просто переключаем воспроизведение
      togglePlayPause();
    } else {
      // Если это другой трек, запускаем его
      playAudio(fairyTaleId, src);
    }
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const restart = () => {
    seekTo(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('bg-white rounded-lg shadow-lg p-4', className)}>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      )}

      {/* Прогресс-бар */}
      <div className="mb-4">
        <Slider
          value={[isCurrentTrack ? audioState.currentTime : 0]}
          max={isCurrentTrack ? audioState.duration : 100}
          step={1}
          onValueChange={handleSeek}
          className="w-full"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>{formatTime(isCurrentTrack ? audioState.currentTime : 0)}</span>
          <span>{formatTime(isCurrentTrack ? audioState.duration : 0)}</span>
        </div>
      </div>

      {/* Элементы управления */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={restart}
            disabled={!isCurrentTrack || !audioState.duration}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={handlePlayPause}
            disabled={!src}
            className="w-12 h-12 rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
          >
            {audioState.isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          
          <div className="w-20">
            <Slider
              value={[audioState.isMuted ? 0 : audioState.volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
