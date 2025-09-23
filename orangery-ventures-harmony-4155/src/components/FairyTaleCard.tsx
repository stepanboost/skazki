import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FairyTale } from '@/types/fairyTale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Download, BookOpen, Clock, User } from 'lucide-react';
import { useAudio } from '@/context/AudioContext';
import { getFileByUrl, createBlobUrl, extractFileId, getImageFile } from '@/utils/fileStorage';

interface FairyTaleCardProps {
  fairyTale: FairyTale;
  className?: string;
}

const FairyTaleCard: React.FC<FairyTaleCardProps> = ({ fairyTale, className }) => {
  const { audioState, playAudio, pauseAudio } = useAudio();
  const isCurrentTrack = audioState.currentFairyTaleId === fairyTale.id;
  const isPlaying = isCurrentTrack && audioState.isPlaying;

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!fairyTale.audioFile) return;

    if (isCurrentTrack) {
      // Если это текущий трек, просто переключаем воспроизведение
      if (isPlaying) {
        pauseAudio();
      } else {
        const audioSrc = getFileByUrl(fairyTale.audioFile) || fairyTale.audioFile;
        playAudio(fairyTale.id, audioSrc);
      }
    } else {
      // Если это другой трек, запускаем его
      const audioSrc = getFileByUrl(fairyTale.audioFile) || fairyTale.audioFile;
      playAudio(fairyTale.id, audioSrc);
    }
  };

  const handleDownload = async () => {
    if (!fairyTale.audioFile) {
      console.warn('Аудиофайл не найден');
      return;
    }

    try {
      console.log('Начинаем скачивание:', fairyTale.audioFile);
      
      // Получаем файл из localStorage или используем обычный URL
      const audioData = getFileByUrl(fairyTale.audioFile);
      const isStoredFile = audioData !== fairyTale.audioFile;
      
      let downloadUrl: string;
      let fileName: string;
      
      if (isStoredFile && audioData) {
        // Файл из localStorage
        downloadUrl = createBlobUrl(audioData);
        const fileId = extractFileId(fairyTale.audioFile);
        fileName = fileId ? `${fileId}.mp3` : `${fairyTale.title.replace(/[^a-zA-Z0-9а-яА-Я\s]/g, '')}.mp3`;
      } else {
        // Обычный файл
        downloadUrl = fairyTale.audioFile;
        
        // Извлекаем оригинальное имя файла из URL или создаем безопасное имя
        const getOriginalFileName = (url: string, fallbackTitle: string) => {
          try {
            const urlPath = new URL(url, window.location.origin).pathname;
            const originalName = urlPath.split('/').pop();
            if (originalName && originalName.includes('.')) {
              return originalName;
            }
          } catch (e) {
            // Если URL невалидный, используем fallback
          }
          return `${fallbackTitle.replace(/[^a-zA-Z0-9а-яА-Я\s]/g, '')}.mp3`;
        };
        
        fileName = getOriginalFileName(fairyTale.audioFile, fairyTale.title);
      }
      
      // Создаем ссылку для скачивания
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = 'none';
      
      // Добавляем в DOM, кликаем и удаляем
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      // Освобождаем память для blob URL
      if (isStoredFile) {
        URL.revokeObjectURL(downloadUrl);
      }
      
      console.log('Скачивание успешно завершено');
      
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      
      // Fallback: пробуем простой способ
      try {
        const link = document.createElement('a');
        link.href = fairyTale.audioFile;
        link.download = `${fairyTale.title.replace(/[^a-zA-Z0-9а-яА-Я\s]/g, '')}.mp3`;
        link.target = '_blank';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (fallbackError) {
        console.error('Fallback скачивание тоже не сработало:', fallbackError);
        // Последний fallback - открываем в новой вкладке
        window.open(fairyTale.audioFile, '_blank');
      }
    }
  };

  return (
    <Card className={cn('group hover:shadow-lg transition-all duration-300', className)}>
      <div className="relative overflow-hidden">
        {fairyTale.coverImage ? (
          <img
            src={getImageFile(extractFileId(fairyTale.coverImage) || '') || fairyTale.coverImage}
            alt={fairyTale.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-gray-400" />
          </div>
        )}
        
        {fairyTale.audioFile && (
          <div className="absolute top-2 right-2">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full w-10 h-10 p-0 bg-white/90 hover:bg-white"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
            {fairyTale.title}
          </h3>
          
          {fairyTale.author && (
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-1" />
              {fairyTale.author}
            </div>
          )}

          {fairyTale.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {fairyTale.description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm text-gray-500">
            {fairyTale.audioDuration && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {formatDuration(fairyTale.audioDuration)}
              </div>
            )}
            
            {fairyTale.tags && fairyTale.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {fairyTale.tags.slice(0, 2).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {fairyTale.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{fairyTale.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex gap-2">
        <Button asChild className="flex-1">
          <Link to={`/fairy-tale/${fairyTale.id}`}>
            <BookOpen className="w-4 h-4 mr-2" />
            Читать
          </Link>
        </Button>
        
        {fairyTale.audioFile && (
          <Button
            variant="outline"
            onClick={handlePlayPause}
            className="px-3"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
        )}

        <Button
          variant="outline"
          onClick={handleDownload}
          className="px-3"
          disabled={!fairyTale.audioFile}
        >
          <Download className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FairyTaleCard;
