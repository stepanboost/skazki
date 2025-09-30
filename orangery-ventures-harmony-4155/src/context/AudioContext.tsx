import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  currentFairyTaleId: string | null;
  audioElement: HTMLAudioElement | null;
}

interface AudioContextType {
  audioState: AudioState;
  playAudio: (fairyTaleId: string, audioSrc: string) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  togglePlayPause: () => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seekTo: (time: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: React.ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  // Загружаем сохраненное состояние из localStorage
  const loadSavedState = (): Partial<AudioState> => {
    try {
      const saved = localStorage.getItem('audioState');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          currentTime: parsed.currentTime || 0,
          volume: parsed.volume || 1,
          isMuted: parsed.isMuted || false,
          currentFairyTaleId: parsed.currentFairyTaleId || null,
        };
      }
    } catch (error) {
      console.error('Ошибка загрузки состояния аудио:', error);
    }
    return {};
  };

  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    currentFairyTaleId: null,
    audioElement: null,
    ...loadSavedState(),
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    const stateToSave = {
      currentTime: audioState.currentTime,
      volume: audioState.volume,
      isMuted: audioState.isMuted,
      currentFairyTaleId: audioState.currentFairyTaleId,
    };
    localStorage.setItem('audioState', JSON.stringify(stateToSave));
  }, [audioState.currentTime, audioState.volume, audioState.isMuted, audioState.currentFairyTaleId]);

  // Функция для восстановления аудио после загрузки страницы
  const restoreAudioAfterReload = () => {
    const savedAudioSrc = localStorage.getItem('audioSrc');
    const savedFairyTaleId = audioState.currentFairyTaleId;
    
    if (savedAudioSrc && savedFairyTaleId && audioRef.current) {
      const audio = audioRef.current;
      
      // Проверяем, что это действительно восстановление (аудио еще не загружено)
      if (audio.src !== savedAudioSrc) {
        audio.src = savedAudioSrc;
        audio.currentTime = audioState.currentTime;
        audio.volume = audioState.isMuted ? 0 : audioState.volume;
        
        const wasPlaying = localStorage.getItem('audioWasPlaying') === 'true';
        if (wasPlaying && audioState.currentTime > 0) {
          // Ждем загрузки метаданных перед воспроизведением
          const handleLoadedMetadata = () => {
            audio.play().catch(error => {
              console.error('Не удалось восстановить воспроизведение:', error);
            });
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            localStorage.removeItem('audioWasPlaying');
          };
          audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        }
      }
    }
  };

  // Создаем глобальный аудио элемент
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.setAttribute('data-global-track', 'true');
      audio.preload = 'metadata';
      audio.style.display = 'none';
      document.body.appendChild(audio);
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setAudioState(prev => ({
        ...prev,
        currentTime: audio.currentTime
      }));
    };

    const handleLoadedMetadata = () => {
      setAudioState(prev => ({
        ...prev,
        duration: audio.duration
      }));
    };

    const handlePlay = () => {
      setAudioState(prev => ({
        ...prev,
        isPlaying: true
      }));
      // Сохраняем флаг о том, что аудио играет
      localStorage.setItem('audioWasPlaying', 'true');
    };

    const handlePause = () => {
      setAudioState(prev => ({
        ...prev,
        isPlaying: false
      }));
      // Убираем флаг о том, что аудио играет
      localStorage.setItem('audioWasPlaying', 'false');
    };

    const handleEnded = () => {
      setAudioState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        currentFairyTaleId: null,
        audioElement: null
      }));
      // Очищаем все сохраненные данные при окончании трека
      localStorage.removeItem('audioSrc');
      localStorage.removeItem('audioWasPlaying');
    };

    const handleError = (e: Event) => {
      console.error('Ошибка воспроизведения аудио:', e);
      setAudioState(prev => ({
        ...prev,
        isPlaying: false,
        currentFairyTaleId: null,
        audioElement: null
      }));
      // Очищаем все сохраненные данные при ошибке
      localStorage.removeItem('audioSrc');
      localStorage.removeItem('audioWasPlaying');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Восстанавливаем воспроизведение при загрузке страницы (только один раз)
  useEffect(() => {
    if (audioState.currentFairyTaleId && audioRef.current) {
      // Проверяем, что это действительно восстановление после перезагрузки
      const savedAudioSrc = localStorage.getItem('audioSrc');
      if (savedAudioSrc) {
        // Небольшая задержка для полной инициализации
        const timer = setTimeout(() => {
          restoreAudioAfterReload();
        }, 100); // Уменьшаем задержку

        return () => clearTimeout(timer);
      }
    }
  }, []); // Убираем зависимость от audioState.currentFairyTaleId

  const playAudio = (fairyTaleId: string, audioSrc: string) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    // Очищаем предыдущие обработчики
    audio.removeEventListener('loadedmetadata', () => {});
    
    // Останавливаем предыдущее воспроизведение
    if (audioState.isPlaying) {
      audio.pause();
    }

    // Если это тот же трек, просто возобновляем воспроизведение
    if (audioState.currentFairyTaleId === fairyTaleId && audio.src === audioSrc) {
      audio.play().catch(error => {
        console.error('Не удалось воспроизвести аудио:', error);
      });
      return;
    }

    // Устанавливаем новый источник
    audio.src = audioSrc;
    audio.setAttribute('data-fairy-tale-id', fairyTaleId);
    
    // Сохраняем источник для восстановления после перезагрузки
    localStorage.setItem('audioSrc', audioSrc);
    
    // Если это тот же трек, восстанавливаем время
    const shouldRestoreTime = audioState.currentFairyTaleId === fairyTaleId;
    
    setAudioState(prev => ({
      ...prev,
      currentFairyTaleId: fairyTaleId,
      audioElement: audio,
      currentTime: shouldRestoreTime ? prev.currentTime : 0
    }));

    // Устанавливаем сохраненное время после загрузки метаданных
    const handleLoadedMetadata = () => {
      if (shouldRestoreTime && audioState.currentTime > 0) {
        audio.currentTime = audioState.currentTime;
      }
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Воспроизводим
    audio.play().catch(error => {
      console.error('Не удалось воспроизвести аудио:', error);
    });
  };

  const pauseAudio = () => {
    if (audioRef.current && audioState.isPlaying) {
      audioRef.current.pause();
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        currentFairyTaleId: null,
        audioElement: null
      }));
      // Очищаем сохраненные данные
      localStorage.removeItem('audioSrc');
      localStorage.removeItem('audioWasPlaying');
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    const audio = audioRef.current;
    
    if (audioState.isPlaying) {
      pauseAudio();
    } else {
      // Проверяем, что аудио готово к воспроизведению
      if (audio.readyState >= 2) { // HAVE_CURRENT_DATA или выше
        audio.play().catch(error => {
          console.error('Не удалось воспроизвести аудио:', error);
        });
      } else {
        // Если аудио еще не загружено, ждем события canplay
        const handleCanPlay = () => {
          audio.play().catch(error => {
            console.error('Не удалось воспроизвести аудио:', error);
          });
          audio.removeEventListener('canplay', handleCanPlay);
        };
        audio.addEventListener('canplay', handleCanPlay);
      }
    }
  };

  const setCurrentTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setAudioState(prev => ({
        ...prev,
        currentTime: time
      }));
    }
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      setAudioState(prev => ({
        ...prev,
        volume,
        isMuted: volume === 0
      }));
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (audioState.isMuted) {
        audioRef.current.volume = audioState.volume;
        setAudioState(prev => ({
          ...prev,
          isMuted: false
        }));
      } else {
        audioRef.current.volume = 0;
        setAudioState(prev => ({
          ...prev,
          isMuted: true
        }));
      }
    }
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
  };

  const value: AudioContextType = {
    audioState,
    playAudio,
    pauseAudio,
    stopAudio,
    togglePlayPause,
    setCurrentTime,
    setVolume,
    toggleMute,
    seekTo,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};
