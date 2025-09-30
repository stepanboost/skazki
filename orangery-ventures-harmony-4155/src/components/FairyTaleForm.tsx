import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FairyTale } from '@/types/fairyTale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X, Upload, Image as ImageIcon, Music, Plus } from 'lucide-react';
import { apiService } from '@/services/api';

interface FairyTaleFormProps {
  fairyTale?: FairyTale;
  onSave: (fairyTale: Omit<FairyTale, 'id' | 'createdAt' | 'updatedAt'>, files?: { audioFile?: File, coverFile?: File }) => void;
  onCancel: () => void;
  className?: string;
}

const FairyTaleForm: React.FC<FairyTaleFormProps> = ({ 
  fairyTale, 
  onSave, 
  onCancel, 
  className 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    content: '',
    coverImage: '',
    audioFile: '',
    audioDuration: 0,
    tags: [] as string[],
    status: 'draft' as 'draft' | 'published',
    order: 1
  });

  const [newTag, setNewTag] = useState('');
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  useEffect(() => {
    if (fairyTale) {
      setFormData({
        title: fairyTale.title,
        author: fairyTale.author || '',
        description: fairyTale.description || '',
        content: fairyTale.content,
        coverImage: fairyTale.coverImage || '',
        audioFile: fairyTale.audioFile || '',
        audioDuration: fairyTale.audioDuration || 0,
        tags: fairyTale.tags || [],
        status: fairyTale.status,
        order: fairyTale.order
      });
      if (fairyTale.coverImage) {
        setCoverImagePreview(fairyTale.coverImage);
      }
    }
  }, [fairyTale]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, выберите изображение');
        return;
      }

      setCoverFile(file);
      
      // Читаем файл для превью
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setCoverImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('Audio file selected:', file);
    
    if (file) {
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      // Проверяем тип файла (поддерживаем только MP3, WAV, OGG)
      const isAudioFile = file.type === 'audio/mpeg' || 
                         file.type === 'audio/wav' || 
                         file.type === 'audio/ogg' ||
                         file.type === 'application/ogg' ||
                         file.name.toLowerCase().match(/\.(mp3|wav|ogg)$/);
      
      if (!isAudioFile) {
        console.error('Invalid file type:', file.type);
        setError('Пожалуйста, выберите аудиофайл');
        return;
      }

      setAudioFile(file);
      console.log('Audio file set in state');

      // Получаем длительность аудио
      const audio = new Audio();
      audio.addEventListener('loadedmetadata', () => {
        console.log('Audio duration loaded:', audio.duration);
        setFormData(prev => ({
          ...prev,
          audioDuration: Math.floor(audio.duration)
        }));
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio loading error:', e);
      });
      
      const url = URL.createObjectURL(file);
      console.log('Created audio URL:', url);
      audio.src = url;
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    console.log('Form submission started');
    console.log('Audio file:', audioFile);
    console.log('Cover file:', coverFile);
    console.log('Form data:', formData);

    try {
      // Подготавливаем данные для onSave
      const taleData = {
        title: formData.title,
        author: formData.author || '',
        description: formData.description || '',
        content: formData.content,
        coverImage: coverImagePreview || '',
        audioFile: audioFile ? URL.createObjectURL(audioFile) : '',
        audioDuration: formData.audioDuration,
        tags: formData.tags,
        status: formData.status,
        order: formData.order
      };

      // Передаем данные и файлы в onSave
      onSave(taleData, { audioFile: audioFile || undefined, coverFile: coverFile || undefined });
    } catch (err) {
      console.error('Ошибка сохранения сказки:', err);
      setError('Ошибка сохранения сказки. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn('w-full max-w-4xl mx-auto', className)}>
      <CardHeader>
        <CardTitle>
          {fairyTale ? 'Редактировать сказку' : 'Добавить новую сказку'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Название *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Введите название сказки"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Автор</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                placeholder="Введите имя автора"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Краткое описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Краткое описание сказки"
              rows={3}
            />
          </div>

          {/* Обложка */}
          <div className="space-y-4">
            <Label>Обложка</Label>
            <div className="flex items-center space-x-4">
              {coverImagePreview && (
                <div className="relative">
                  <img
                    src={coverImagePreview}
                    alt="Предпросмотр обложки"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                    onClick={() => {
                      setCoverImagePreview('');
                      setFormData(prev => ({ ...prev, coverImage: '' }));
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="cover-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {coverImagePreview ? 'Заменить обложку' : 'Загрузить обложку'}
                    </p>
                  </div>
                </Label>
                <input
                  id="cover-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Аудиофайл */}
          <div className="space-y-4">
            <Label>Аудиофайл</Label>
            <div className="flex items-center space-x-4">
              {audioFile && (
                <div className="flex items-center space-x-2">
                  <Music className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">
                    {audioFile.name}
                    {formData.audioDuration > 0 && ` (${Math.floor(formData.audioDuration / 60)}:${(formData.audioDuration % 60).toString().padStart(2, '0')})`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAudioFile(null);
                      setFormData(prev => ({ ...prev, audioFile: '', audioDuration: 0 }));
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="audio-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                    <Music className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {audioFile ? 'Заменить аудиофайл' : 'Загрузить аудиофайл'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Поддерживаются форматы: MP3, OGG, WAV
                    </p>
                  </div>
                </Label>
                <input
                  id="audio-upload"
                  type="file"
                  accept=".mp3,.ogg,.wav"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Теги */}
          <div className="space-y-4">
            <Label>Теги</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-4 h-4 p-0 hover:bg-transparent"
                    onClick={() => removeTag(tag)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Добавить тег"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Текст сказки */}
          <div className="space-y-2">
            <Label htmlFor="content">Текст сказки *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Введите текст сказки"
              rows={15}
              required
            />
          </div>

          {/* Настройки */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="order">Порядок сортировки</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 1)}
                min="1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={formData.status === 'published'}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ 
                    ...prev, 
                    status: checked ? 'published' : 'draft' 
                  }))
                }
              />
              <Label htmlFor="status">
                {formData.status === 'published' ? 'Опубликовано' : 'Черновик'}
              </Label>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : (fairyTale ? 'Сохранить изменения' : 'Создать сказку')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FairyTaleForm;
