// Утилиты для работы с файлами в localStorage

/**
 * Получает аудиофайл из localStorage по ID
 */
export const getAudioFile = (fileId: string): string | null => {
  try {
    return localStorage.getItem(`audio_${fileId}`);
  } catch (error) {
    console.error('Ошибка получения аудиофайла:', error);
    return null;
  }
};

/**
 * Получает изображение из localStorage по ID
 */
export const getImageFile = (fileId: string): string | null => {
  try {
    return localStorage.getItem(`image_${fileId}`);
  } catch (error) {
    console.error('Ошибка получения изображения:', error);
    return null;
  }
};

/**
 * Извлекает ID файла из URL
 */
export const extractFileId = (url: string): string | null => {
  try {
    const match = url.match(/\/(audio|image)\/(.+)$/);
    return match ? match[2] : null;
  } catch (error) {
    console.error('Ошибка извлечения ID файла:', error);
    return null;
  }
};

/**
 * Проверяет, является ли URL ссылкой на файл в localStorage
 */
export const isStoredFile = (url: string): boolean => {
  return url.startsWith('/api/audio/') || url.startsWith('/api/image/');
};

/**
 * Получает файл по URL (работает как с обычными URL, так и с файлами из localStorage)
 */
export const getFileByUrl = (url: string): string | null => {
  if (isStoredFile(url)) {
    const fileId = extractFileId(url);
    if (fileId) {
      if (url.includes('/api/audio/')) {
        return getAudioFile(fileId);
      } else if (url.includes('/api/image/')) {
        return getImageFile(fileId);
      }
    }
  }
  return url; // Возвращаем исходный URL для обычных файлов
};

/**
 * Создает blob URL для файла из localStorage
 */
export const createBlobUrl = (base64Data: string): string => {
  try {
    // Убираем data URL префикс
    const base64 = base64Data.split(',')[1];
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray]);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Ошибка создания blob URL:', error);
    return base64Data; // Возвращаем исходные данные в случае ошибки
  }
};

/**
 * Удаляет файл из localStorage
 */
export const removeFile = (fileId: string, type: 'audio' | 'image'): void => {
  try {
    localStorage.removeItem(`${type}_${fileId}`);
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
  }
};

/**
 * Получает список всех загруженных файлов
 */
export const getAllStoredFiles = (): { audio: string[], images: string[] } => {
  const audio: string[] = [];
  const images: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith('audio_')) {
          audio.push(key.replace('audio_', ''));
        } else if (key.startsWith('image_')) {
          images.push(key.replace('image_', ''));
        }
      }
    }
  } catch (error) {
    console.error('Ошибка получения списка файлов:', error);
  }
  
  return { audio, images };
};
