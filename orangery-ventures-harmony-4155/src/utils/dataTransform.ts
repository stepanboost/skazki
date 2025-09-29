import { FairyTaleResponse, FairyTale, AudioFileResponse } from '@/types/api';
import { apiService } from '@/services/api';

// Преобразование данных с бэкенда в формат фронтенда
export const transformFairyTale = async (apiTale: FairyTaleResponse): Promise<FairyTale> => {
  // Используем presigned URL, которые уже пришли с бэкенда
  const coverImage = apiTale.cover_image_url || undefined;
  const audioFile = apiTale.audio_url || undefined;
  const audioDuration = apiTale.audio_duration || undefined;

  // Парсим теги из JSON строки
  let tags: string[] = [];
  if (apiTale.tags) {
    try {
      tags = JSON.parse(apiTale.tags);
    } catch (error) {
      console.error('Ошибка парсинга тегов:', error);
      // Если не удалось распарсить, используем как массив из одного элемента
      tags = [apiTale.tags];
    }
  }

  return {
    id: apiTale.external_id,
    title: apiTale.title,
    author: apiTale.author_name,
    description: apiTale.description,
    content: apiTale.content,
    coverImage,
    audioFile,
    audioDuration,
    tags,
    status: apiTale.status,
    createdAt: apiTale.created_at,
    updatedAt: apiTale.updated_at,
    order: apiTale.order,
  };
};

// Преобразование массива сказок
export const transformFairyTales = async (apiTales: FairyTaleResponse[]): Promise<FairyTale[]> => {
  // Проверяем, что apiTales - это массив
  if (!Array.isArray(apiTales)) {
    console.error('apiTales is not an array:', apiTales);
    return [];
  }
  
  const transformedTales = await Promise.all(
    apiTales.map(transformFairyTale)
  );
  
  // Сортируем по order
  return transformedTales.sort((a, b) => a.order - b.order);
};
