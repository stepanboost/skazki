import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFairyTales } from '@/context/FairyTaleContext';
import AudioPlayer from '@/components/AudioPlayer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Download, BookOpen, Clock, User, Calendar } from 'lucide-react';
import { getFileByUrl, createBlobUrl, extractFileId, getImageFile } from '@/utils/fileStorage';

const FairyTalePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { fairyTales } = useFairyTales();
  const fairyTale = fairyTales.find(tale => tale.id === id);

  if (!fairyTale) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Сказка не найдена</h1>
          <p className="text-gray-600 mb-6">К сожалению, запрашиваемая сказка не существует.</p>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться к каталогу
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Навигация */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к каталогу
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Заголовок и метаданные */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-medium mb-4">
              {fairyTale.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              {fairyTale.author && (
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {fairyTale.author}
                </div>
              )}
              
              {fairyTale.audioDuration && (
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatDuration(fairyTale.audioDuration)}
                </div>
              )}
              
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(fairyTale.createdAt)}
              </div>
            </div>

            {fairyTale.tags && fairyTale.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {fairyTale.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleDownload} disabled={!fairyTale.audioFile}>
                <Download className="w-4 h-4 mr-2" />
                Скачать MP3
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Основной контент */}
            <div className="lg:col-span-2">
              {/* Обложка */}
              {fairyTale.coverImage && (
                <div className="mb-6">
                  <img
                    src={getImageFile(extractFileId(fairyTale.coverImage) || '') || fairyTale.coverImage}
                    alt={fairyTale.title}
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                  />
                </div>
              )}

              {/* Описание */}
              {fairyTale.description && (
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-3">О сказке</h2>
                    <p className="text-gray-700 leading-relaxed">
                      {fairyTale.description}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Текст сказки */}
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Текст сказки
                  </h2>
                  <div 
                    className="prose prose-lg max-w-none text-gray-800 leading-relaxed"
                    style={{ 
                      fontFamily: 'Georgia, serif',
                      lineHeight: '1.8',
                      fontSize: '18px'
                    }}
                  >
                    {fairyTale.content.split('\n\n').map((paragraph, index) => (
                      <p key={index} className="mb-4">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Боковая панель */}
            <div className="space-y-6">
              {/* Аудио-плеер */}
              {fairyTale.audioFile && (
                <AudioPlayer
                  src={fairyTale.audioFile}
                  title="Аудиоверсия"
                  fairyTaleId={fairyTale.id}
                />
              )}

              {/* Информация о сказке */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Информация</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Название:</span>
                      <p className="text-gray-800">{fairyTale.title}</p>
                    </div>
                    
                    {fairyTale.author && (
                      <div>
                        <span className="font-medium text-gray-600">Автор:</span>
                        <p className="text-gray-800">{fairyTale.author}</p>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-gray-600">Дата добавления:</span>
                      <p className="text-gray-800">{formatDate(fairyTale.createdAt)}</p>
                    </div>
                    
                    {fairyTale.audioDuration && (
                      <div>
                        <span className="font-medium text-gray-600">Длительность аудио:</span>
                        <p className="text-gray-800">{formatDuration(fairyTale.audioDuration)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Быстрые действия */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Быстрые действия</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleDownload}
                      disabled={!fairyTale.audioFile}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Скачать MP3
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FairyTalePage;
