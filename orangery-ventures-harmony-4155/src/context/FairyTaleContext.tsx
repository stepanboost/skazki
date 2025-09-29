import React, { createContext, useContext, useState, useEffect } from 'react';
import { FairyTale } from '@/types/fairyTale';
import { apiService } from '@/services/api';
import { transformFairyTales, transformFairyTale } from '@/utils/dataTransform';

interface FairyTaleContextType {
  fairyTales: FairyTale[];
  loading: boolean;
  error: string | null;
  refreshFairyTales: () => Promise<void>;
  getFairyTaleById: (id: string) => Promise<FairyTale | null>;
  addFairyTale: (fairyTale: Omit<FairyTale, 'id' | 'createdAt' | 'updatedAt'>, files?: { audioFile?: File, coverFile?: File }) => Promise<void>;
  updateFairyTale: (id: string, fairyTale: Partial<FairyTale>) => Promise<void>;
  deleteFairyTale: (id: string) => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const FairyTaleContext = createContext<FairyTaleContextType | undefined>(undefined);

export const useFairyTales = () => {
  const context = useContext(FairyTaleContext);
  if (!context) {
    throw new Error('useFairyTales must be used within a FairyTaleProvider');
  }
  return context;
};

interface FairyTaleProviderProps {
  children: React.ReactNode;
}

export const FairyTaleProvider: React.FC<FairyTaleProviderProps> = ({ children }) => {
  const [fairyTales, setFairyTales] = useState<FairyTale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Инициализация сессии и загрузка данных
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Проверяем, есть ли админский токен
      const adminToken = localStorage.getItem('admin_token');
      
      if (!adminToken) {
        // Если нет админского токена, создаем пользовательскую сессию
        await apiService.createSession();
      }

      // Загружаем сказки
      await loadFairyTales();
    } catch (err) {
      console.error('Ошибка инициализации:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const loadFairyTales = async () => {
    try {
      // Обновляем токены в памяти API сервиса
      apiService.updateTokens();
      
      // Проверяем, есть ли админский токен
      const adminToken = localStorage.getItem('admin_token');
      let apiTales;
      
      if (adminToken) {
        // Если есть админский токен, загружаем все сказки
        apiTales = await apiService.getFairyTalesAdmin();
      } else {
        // Если нет админского токена, загружаем только опубликованные
        apiTales = await apiService.getFairyTales();
      }
      
      const transformedTales = await transformFairyTales(apiTales);
      setFairyTales(transformedTales);
    } catch (err) {
      console.error('Ошибка загрузки сказок:', err);
      throw err;
    }
  };

  const refreshFairyTales = async () => {
    try {
      setLoading(true);
      setError(null);
      await loadFairyTales();
    } catch (err) {
      console.error('Ошибка обновления сказок:', err);
      setError('Не удалось обновить данные');
    } finally {
      setLoading(false);
    }
  };

  const forceRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      await loadFairyTales();
    } catch (err) {
      console.error('Ошибка принудительного обновления сказок:', err);
      setError('Не удалось обновить данные');
    } finally {
      setLoading(false);
    }
  };

  const getFairyTaleById = async (id: string): Promise<FairyTale | null> => {
    try {
      const apiTale = await apiService.getFairyTaleById(id);
      const transformedTale = await transformFairyTale(apiTale);
      return transformedTale;
    } catch (err) {
      console.error('Ошибка загрузки сказки:', err);
      return null;
    }
  };

  const addFairyTale = async (fairyTaleData: Omit<FairyTale, 'id' | 'createdAt' | 'updatedAt'>, files?: { audioFile?: File, coverFile?: File }) => {
    try {
      let createdTale;
      
      if (files?.audioFile || files?.coverFile) {
        // Если есть файлы, создаем сказку через uploadFiles
        console.log('Creating fairy tale with files');
        
        const uploadResponse = await apiService.uploadFiles(files.audioFile, files.coverFile);
        
        // Обновляем сказку с данными из формы
        const apiData = {
          title: fairyTaleData.title,
          author_name: fairyTaleData.author || undefined,
          description: fairyTaleData.description || undefined,
          content: fairyTaleData.content,
          status: fairyTaleData.status,
          order: fairyTaleData.order,
          tags: fairyTaleData.tags && fairyTaleData.tags.length > 0 ? JSON.stringify(fairyTaleData.tags) : undefined
        };
        
        createdTale = await apiService.updateFairyTale(uploadResponse.fairy_tale_external_id, apiData);
      } else {
        // Если нет файлов, создаем обычным способом
        console.log('Creating fairy tale without files');
        const apiData = {
          title: fairyTaleData.title,
          author_name: fairyTaleData.author || undefined,
          description: fairyTaleData.description || undefined,
          content: fairyTaleData.content,
          status: fairyTaleData.status,
          order: fairyTaleData.order,
          tags: fairyTaleData.tags && fairyTaleData.tags.length > 0 ? JSON.stringify(fairyTaleData.tags) : undefined
        };
        
        createdTale = await apiService.createFairyTale(apiData);
      }
      
      const transformedTale = await transformFairyTale(createdTale);
      setFairyTales(prev => [...prev, transformedTale]);
    } catch (err) {
      console.error('Ошибка создания сказки:', err);
      throw err;
    }
  };

  const updateFairyTale = async (id: string, fairyTaleData: Partial<FairyTale>) => {
    try {
      // Преобразуем данные для API
      const apiData: any = {};
      if (fairyTaleData.title !== undefined) apiData.title = fairyTaleData.title;
      if (fairyTaleData.author !== undefined) apiData.author_name = fairyTaleData.author;
      if (fairyTaleData.description !== undefined) apiData.description = fairyTaleData.description;
      if (fairyTaleData.content !== undefined) apiData.content = fairyTaleData.content;
      if (fairyTaleData.status !== undefined) apiData.status = fairyTaleData.status;
      if (fairyTaleData.order !== undefined) apiData.order = fairyTaleData.order;
      if (fairyTaleData.tags !== undefined) {
        apiData.tags = fairyTaleData.tags && fairyTaleData.tags.length > 0 ? JSON.stringify(fairyTaleData.tags) : undefined;
      }
      
      const apiTale = await apiService.updateFairyTale(id, apiData);
      const transformedTale = await transformFairyTale(apiTale);
      setFairyTales(prev => prev.map(tale => 
        tale.id === id ? transformedTale : tale
      ));
    } catch (err) {
      console.error('Ошибка обновления сказки:', err);
      throw err;
    }
  };

  const deleteFairyTale = async (id: string) => {
    try {
      await apiService.deleteFairyTale(id);
      setFairyTales(prev => prev.filter(tale => tale.id !== id));
    } catch (err) {
      console.error('Ошибка удаления сказки:', err);
      throw err;
    }
  };

  const value: FairyTaleContextType = {
    fairyTales,
    loading,
    error,
    refreshFairyTales,
    getFairyTaleById,
    addFairyTale,
    updateFairyTale,
    deleteFairyTale,
    forceRefresh
  };

  return (
    <FairyTaleContext.Provider value={value}>
      {children}
    </FairyTaleContext.Provider>
  );
};