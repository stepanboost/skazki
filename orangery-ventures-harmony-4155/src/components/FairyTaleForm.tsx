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

interface FairyTaleFormProps {
  fairyTale?: FairyTale;
  onSave: (fairyTale: Omit<FairyTale, 'id' | 'createdAt' | 'updatedAt'>) => void;
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
        alert('Пожалуйста, выберите изображение');
        return;
      }

      // Создаем уникальный ID для файла
      const fileId = `image_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      // Читаем файл как base64 для сохранения в localStorage
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        
        // Сохраняем файл в localStorage
        localStorage.setItem(`image_${fileId}`, base64);
        
        // Создаем постоянную ссылку на файл
        const imageUrl = `/api/image/${fileId}`;
        
        setCoverImagePreview(base64); // Показываем превью
        setFormData(prev => ({
          ...prev,
          coverImage: imageUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('audio/')) {
        alert('Пожалуйста, выберите аудиофайл');
        return;
      }

      // Создаем уникальный ID для файла
      const fileId = `audio_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      // Читаем файл как base64 для сохранения в localStorage
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        
        // Сохраняем файл в localStorage
        localStorage.setItem(`audio_${fileId}`, base64);
        
        // Создаем постоянную ссылку на файл
        const audioUrl = `/api/audio/${fileId}`;
        
        setFormData(prev => ({
          ...prev,
          audioFile: audioUrl
        }));

        // Получаем длительность аудио
        const audio = new Audio(base64);
        audio.addEventListener('loadedmetadata', () => {
          setFormData(prev => ({
            ...prev,
            audioDuration: Math.floor(audio.duration)
          }));
        });
      };
      
      reader.readAsDataURL(file);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card className={cn('w-full max-w-4xl mx-auto', className)}>
      <CardHeader>
        <CardTitle>
          {fairyTale ? 'Редактировать сказку' : 'Добавить новую сказку'}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              {formData.audioFile && (
                <div className="flex items-center space-x-2">
                  <Music className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">
                    Аудиофайл загружен
                    {formData.audioDuration > 0 && ` (${Math.floor(formData.audioDuration / 60)}:${(formData.audioDuration % 60).toString().padStart(2, '0')})`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, audioFile: '', audioDuration: 0 }))}
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
                      {formData.audioFile ? 'Заменить аудиофайл' : 'Загрузить аудиофайл'}
                    </p>
                  </div>
                </Label>
                <input
                  id="audio-upload"
                  type="file"
                  accept="audio/*"
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
            <Button type="submit">
              {fairyTale ? 'Сохранить изменения' : 'Создать сказку'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FairyTaleForm;
