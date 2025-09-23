import React, { createContext, useContext, useState, useEffect } from 'react';
import { FairyTale } from '@/types/fairyTale';
import { mockFairyTales } from '@/data/mockFairyTales';

interface FairyTaleContextType {
  fairyTales: FairyTale[];
  setFairyTales: (tales: FairyTale[]) => void;
  addFairyTale: (tale: Omit<FairyTale, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFairyTale: (id: string, tale: Omit<FairyTale, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteFairyTale: (id: string) => void;
  restoreFromBackup: () => void;
  clearAllData: () => void;
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

  // Загружаем данные из localStorage или используем моковые данные
  useEffect(() => {
    const savedTales = localStorage.getItem('fairyTales');
    if (savedTales) {
      try {
        const parsedTales = JSON.parse(savedTales);
        // Проверяем, что данные валидны
        if (Array.isArray(parsedTales) && parsedTales.length > 0) {
          setFairyTales(parsedTales);
        } else {
          setFairyTales(mockFairyTales);
        }
      } catch (error) {
        console.error('Ошибка загрузки сказок из localStorage:', error);
        setFairyTales(mockFairyTales);
      }
    } else {
      // Если нет сохраненных данных, используем моковые и сохраняем их
      setFairyTales(mockFairyTales);
    }
  }, []);

  // Сохраняем данные в localStorage при изменении
  useEffect(() => {
    if (fairyTales.length > 0) {
      try {
        localStorage.setItem('fairyTales', JSON.stringify(fairyTales));
        // Также сохраняем резервную копию
        localStorage.setItem('fairyTales_backup', JSON.stringify(fairyTales));
      } catch (error) {
        console.error('Ошибка сохранения сказок в localStorage:', error);
      }
    }
  }, [fairyTales]);

  const addFairyTale = (taleData: Omit<FairyTale, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTale: FairyTale = {
      ...taleData,
      id: Date.now().toString(),
      createdAt: now,
      updatedAt: now
    };
    setFairyTales(prev => [...prev, newTale]);
  };

  const updateFairyTale = (id: string, taleData: Omit<FairyTale, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    setFairyTales(prev => prev.map(tale => 
      tale.id === id 
        ? {
            ...tale,
            ...taleData,
            updatedAt: now
          }
        : tale
    ));
  };

  const deleteFairyTale = (id: string) => {
    setFairyTales(prev => prev.filter(tale => tale.id !== id));
  };

  const restoreFromBackup = () => {
    try {
      const backupData = localStorage.getItem('fairyTales_backup');
      if (backupData) {
        const parsedBackup = JSON.parse(backupData);
        if (Array.isArray(parsedBackup)) {
          setFairyTales(parsedBackup);
          localStorage.setItem('fairyTales', backupData);
        }
      }
    } catch (error) {
      console.error('Ошибка восстановления из резервной копии:', error);
    }
  };

  const clearAllData = () => {
    localStorage.removeItem('fairyTales');
    localStorage.removeItem('fairyTales_backup');
    setFairyTales(mockFairyTales);
  };

  const value: FairyTaleContextType = {
    fairyTales,
    setFairyTales,
    addFairyTale,
    updateFairyTale,
    deleteFairyTale,
    restoreFromBackup,
    clearAllData
  };

  return (
    <FairyTaleContext.Provider value={value}>
      {children}
    </FairyTaleContext.Provider>
  );
};
