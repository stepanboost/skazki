import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useFairyTales } from '@/context/FairyTaleContext';
import { useAuth } from '@/hooks/useAuth';
import { FairyTale } from '@/types/fairyTale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Edit, Trash2, Eye, Search, LogOut } from 'lucide-react';
import FairyTaleForm from '@/components/FairyTaleForm';
import AdminLogin from '@/components/AdminLogin';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const AdminPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { fairyTales, addFairyTale, updateFairyTale, deleteFairyTale, refreshFairyTales } = useFairyTales();
  const { isAuthenticated, isLoading, error, login, logout } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingTale, setEditingTale] = useState<FairyTale | undefined>(undefined);

  // Показываем загрузку пока проверяем аутентификацию
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  // Показываем форму входа если не аутентифицирован
  if (!isAuthenticated) {
    return <AdminLogin onLogin={login} error={error} isLoading={isLoading} />;
  }

  const filteredTales = fairyTales.filter(tale =>
    tale.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tale.author && tale.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleAddNew = () => {
    setEditingTale(undefined);
    setShowForm(true);
  };

  const handleEdit = (id: string) => {
    const tale = fairyTales.find(t => t.id === id);
    if (tale) {
      setEditingTale(tale);
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить сказку "${title}"?`)) {
      try {
        await deleteFairyTale(id);
      } catch (error) {
        console.error('Ошибка удаления сказки:', error);
        alert('Ошибка удаления сказки. Попробуйте снова.');
      }
    }
  };

  const handleView = (id: string) => {
    window.open(`/fairy-tale/${id}`, '_blank');
  };

  const handleSave = async (taleData: Omit<FairyTale, 'id' | 'createdAt' | 'updatedAt'>, files?: { audioFile?: File, coverFile?: File }) => {
    // Сразу закрываем форму для лучшего UX
    setShowForm(false);
    setEditingTale(undefined);
    
    // Показываем уведомление о начале загрузки
    const isEditing = !!editingTale;
    const loadingMessage = isEditing ? 'Обновление сказки...' : 'Создание сказки...';
    
    toast({
      title: loadingMessage,
      description: "Сказка загружается...",
    });
    
    // Выполняем загрузку асинхронно
    (async () => {
      try {
        if (isEditing) {
          // Редактирование существующей сказки
          await updateFairyTale(editingTale!.id, taleData);
          
          // Если есть файлы, заменяем их
          if (files?.audioFile) {
            await apiService.replaceAudioFile(editingTale!.id, files.audioFile);
          }
          if (files?.coverFile) {
            await apiService.replaceCoverFile(editingTale!.id, files.coverFile);
          }
        } else {
          // Создание новой сказки
          await addFairyTale(taleData, files);
        }
        
        // Обновляем список сказок после сохранения
        await refreshFairyTales();
        
        toast({
          title: "Успешно!",
          description: isEditing ? "Сказка обновлена" : "Сказка создана",
        });
      } catch (error) {
        console.error('Ошибка сохранения сказки:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось сохранить сказку. Попробуйте снова.",
          variant: "destructive",
        });
      }
    })();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTale(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Навигация */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад к сайту
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Админ-панель</h1>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">{fairyTales.length}</div>
                <p className="text-sm text-gray-600">Всего сказок</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {fairyTales.filter(tale => tale.status === 'published').length}
                </div>
                <p className="text-sm text-gray-600">Опубликовано</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {fairyTales.filter(tale => tale.status === 'draft').length}
                </div>
                <p className="text-sm text-gray-600">Черновики</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">
                  {fairyTales.filter(tale => tale.audioFile).length}
                </div>
                <p className="text-sm text-gray-600">С аудио</p>
              </CardContent>
            </Card>
          </div>

          {/* Управление */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Управление сказками</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить сказку
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Поиск */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Поиск по названию или автору..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Таблица */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Обложка</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Автор</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTales.map((tale) => (
                      <TableRow key={tale.id}>
                        <TableCell>
                          {tale.coverImage ? (
                            <img
                              src={tale.coverImage}
                              alt={tale.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-xs text-gray-500">Нет</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{tale.title}</div>
                          {tale.tags && tale.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tale.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {tale.tags.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{tale.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{tale.author || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={tale.status === 'published' ? 'default' : 'secondary'}>
                            {tale.status === 'published' ? 'Опубликовано' : 'Черновик'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(tale.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(tale.id)}
                              title="Просмотр"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(tale.id)}
                              title="Редактировать"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(tale.id, tale.title)}
                              title="Удалить"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredTales.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Сказки не найдены
                </div>
              )}
            </CardContent>
          </Card>

          {/* Форма добавления/редактирования */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <FairyTaleForm
                  fairyTale={editingTale}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
