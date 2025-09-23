import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { FairyTale } from '@/types/fairyTale';
import SimpleFairyTaleCard from './SimpleFairyTaleCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface FairyTaleCatalogProps {
  fairyTales: FairyTale[];
  className?: string;
}

const FairyTaleCatalog: React.FC<FairyTaleCatalogProps> = ({ fairyTales, className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'author' | 'createdAt'>('createdAt');

  // Получаем все уникальные теги
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    fairyTales.forEach(tale => {
      if (tale.tags) {
        tale.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [fairyTales]);

  // Фильтрация и сортировка сказок
  const filteredAndSortedTales = useMemo(() => {
    let filtered = fairyTales.filter(tale => {
      const matchesSearch = searchQuery === '' || 
        tale.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tale.author && tale.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tale.description && tale.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTags = selectedTags.length === 0 || 
        (tale.tags && selectedTags.every(tag => tale.tags!.includes(tag)));

      return matchesSearch && matchesTags && tale.status === 'published';
    });

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return (a.author || '').localeCompare(b.author || '');
        case 'createdAt':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [fairyTales, searchQuery, selectedTags, sortBy]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  return (
    <section className={cn('py-16 md:py-24', className)}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Заголовок */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-medium mb-4">
              Каталог Сказок
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Откройте для себя удивительный мир сказок. Читайте, слушайте и скачивайте любимые истории.
            </p>
          </div>

          {/* Поиск и фильтры */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Поиск */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Поиск по названию, автору или описанию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Сортировка */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto">
                    <Filter className="w-4 h-4 mr-2" />
                    Сортировка
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('createdAt')}>
                    По дате добавления
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('title')}>
                    По названию
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('author')}>
                    По автору
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Теги */}
            {allTags.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-blue-100"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                {(searchQuery || selectedTags.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-gray-500"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Очистить фильтры
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Результаты */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Найдено сказок: {filteredAndSortedTales.length}
            </p>
          </div>

          {/* Сетка сказок */}
          {filteredAndSortedTales.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedTales.map((fairyTale) => (
                <SimpleFairyTaleCard
                  key={fairyTale.id}
                  fairyTale={fairyTale}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Сказки не найдены</h3>
              <p className="text-gray-600 mb-4">
                Попробуйте изменить поисковый запрос или фильтры
              </p>
              <Button onClick={clearFilters}>
                Очистить фильтры
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FairyTaleCatalog;
