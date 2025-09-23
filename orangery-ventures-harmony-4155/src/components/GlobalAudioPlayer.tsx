import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, VolumeX, X } from 'lucide-react';
import { useFairyTales } from '@/context/FairyTaleContext';
import { useAudio } from '@/context/AudioContext';

interface GlobalAudioPlayerProps {
  className?: string;
}

const GlobalAudioPlayer: React.FC<GlobalAudioPlayerProps> = ({ className }) => {
  const { fairyTales } = useFairyTales();
  const { audioState, togglePlayPause, stopAudio, seekTo, setVolume, toggleMute } = useAudio();

  // Находим текущую сказку
  const currentFairyTale = audioState.currentFairyTaleId 
    ? fairyTales.find(tale => tale.id === audioState.currentFairyTaleId)
    : null;

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!currentFairyTale || !audioState.currentFairyTaleId) return null;

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50',
      'transform transition-transform duration-300 ease-in-out',
      className
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Информация о треке */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {currentFairyTale.coverImage && (
              <img
                src={currentFairyTale.coverImage}
                alt={currentFairyTale.title}
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate">
                {currentFairyTale.title}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {currentFairyTale.author || 'Неизвестный автор'}
              </p>
            </div>
          </div>

          {/* Элементы управления */}
          <div className="flex items-center space-x-4 flex-1 max-w-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlayPause}
              className="w-10 h-10 p-0"
            >
              {audioState.isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>

            {/* Прогресс-бар */}
            <div className="flex-1 min-w-0">
              <Slider
                value={[audioState.currentTime]}
                max={audioState.duration || 100}
                step={1}
                onValueChange={handleSeek}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatTime(audioState.currentTime)}</span>
                <span>{formatTime(audioState.duration)}</span>
              </div>
            </div>

            {/* Громкость */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="w-8 h-8 p-0"
              >
                {audioState.isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              
              <div className="w-16">
                <Slider
                  value={[audioState.isMuted ? 0 : audioState.volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
              </div>
            </div>

            {/* Кнопка остановки */}
            <Button
              variant="ghost"
              size="sm"
              onClick={stopAudio}
              className="w-8 h-8 p-0 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalAudioPlayer;
