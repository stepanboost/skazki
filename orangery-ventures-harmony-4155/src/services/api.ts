import { SessionResponse, FairyTaleResponse, FileDownloadResponse, AudioFileResponse } from '@/types/api';

// Типы для админской авторизации
interface AdminLoginRequest {
  username: string;
  password: string;
}

interface AdminTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface FileMetaResponse {
  file_type: string;
  external_name: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  presigned_url: string;
}

const API_BASE_URL = '/api';

class ApiService {
  private sessionToken: string | null = null;
  private adminToken: string | null = null;

  constructor() {
    // Загружаем токены из localStorage при инициализации
    this.sessionToken = localStorage.getItem('session_token');
    this.adminToken = localStorage.getItem('admin_token');
  }

  // Метод для обновления токенов в памяти
  updateTokens() {
    this.sessionToken = localStorage.getItem('session_token');
    this.adminToken = localStorage.getItem('admin_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      ...options.headers,
    };

    // Добавляем Content-Type только если это не FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Добавляем токен авторизации если он есть
    if (this.adminToken && (
      endpoint.startsWith('/admin') || 
      endpoint.startsWith('/files') ||
      endpoint === '/fairy-tales/admin' ||
      (endpoint.startsWith('/fairy-tales') && (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE'))
    )) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.adminToken}`;
    } else if (this.sessionToken && !endpoint.startsWith('/admin') && !endpoint.startsWith('/files') && endpoint !== '/fairy-tales/admin') {
      (headers as Record<string, string>).Authorization = `Bearer ${this.sessionToken}`;
    }


    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Если получили 401 и это админский запрос, пытаемся обновить токен
    if (response.status === 401 && this.adminToken && 
        (endpoint.startsWith('/admin') || 
         endpoint.startsWith('/files') || 
         endpoint === '/fairy-tales/admin' ||
         (endpoint.startsWith('/fairy-tales') && ['POST', 'PUT', 'DELETE'].includes(options.method || 'GET')))) {
      
      try {
        await this.adminRefresh();
        
        // Повторяем запрос с новым токеном
        (headers as Record<string, string>).Authorization = `Bearer ${this.adminToken}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } catch (refreshError) {
        console.error('Failed to refresh admin token:', refreshError);
        // Если не удалось обновить токен, очищаем его
        this.adminToken = null;
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
        throw new Error('Admin session expired. Please login again.');
      }
    }


    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, response.statusText, errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Создание анонимной сессии
  async createSession(): Promise<SessionResponse> {
    console.log('Creating session...');
    const response = await this.request<SessionResponse>('/session/create', {
      method: 'POST',
    });

    console.log('Session created:', response);
    // Сохраняем токен в localStorage
    this.sessionToken = response.token;
    localStorage.setItem('session_token', response.token);

    return response;
  }

  // Получение информации о сессии
  async getSessionInfo(): Promise<SessionResponse> {
    return this.request<SessionResponse>('/session/info');
  }

  // Получение опубликованных сказок для пользователей
  async getFairyTales(): Promise<FairyTaleResponse[]> {
    const response = await this.request<{fairy_tales: FairyTaleResponse[]}>('/fairy-tales/');
    return response.fairy_tales;
  }

  // Получение всех сказок для администраторов
  async getFairyTalesAdmin(): Promise<FairyTaleResponse[]> {
    const response = await this.request<{fairy_tales: FairyTaleResponse[]}>('/fairy-tales/admin');
    return response.fairy_tales;
  }

  // Получение сказки по ID
  async getFairyTaleById(externalId: string): Promise<FairyTaleResponse> {
    return this.request<FairyTaleResponse>(`/fairy-tales/${externalId}`);
  }

  // Получение presigned URL для скачивания файла
  async getFileDownloadUrl(externalName: string): Promise<FileDownloadResponse> {
    console.log(`[DEBUG] Getting download URL for: ${externalName}`);
    const response = await this.request<FileDownloadResponse>(`/files/download?external_name=${encodeURIComponent(externalName)}`);
    console.log(`[DEBUG] Download URL response:`, response);
    return response;
  }

  // Загрузка файлов (аудио и/или обложка)
  async uploadFiles(audioFile?: File, coverFile?: File): Promise<{
    fairy_tale_external_id: string;
    audio_meta?: FileMetaResponse;
    cover_meta?: FileMetaResponse;
  }> {
    console.log(`[DEBUG] Uploading files:`, { 
      audioFile: audioFile?.name, 
      coverFile: coverFile?.name,
      audioSize: audioFile?.size,
      coverSize: coverFile?.size
    });
    
    const formData = new FormData();
    if (audioFile) {
      formData.append('audio_file', audioFile);
    }
    if (coverFile) {
      formData.append('cover_file', coverFile);
    }

    const response = await this.request<{
      fairy_tale_external_id: string;
      audio_meta?: FileMetaResponse;
      cover_meta?: FileMetaResponse;
    }>('/files/upload', {
      method: 'POST',
      body: formData,
      headers: {
        // Content-Type будет автоматически установлен fetch для FormData
      },
    });
    
    console.log(`[DEBUG] Upload response:`, response);
    return response;
  }

  // Получение аудиофайлов для сказки
  async getAudioFiles(fairyTaleId: number): Promise<AudioFileResponse[]> {
    return this.request<AudioFileResponse[]>(`/fairy-tales/${fairyTaleId}/audio-files`);
  }

  // Проверка, есть ли активная сессия
  hasActiveSession(): boolean {
    return this.sessionToken !== null;
  }

  // Очистка сессии
  clearSession(): void {
    this.sessionToken = null;
    localStorage.removeItem('session_token');
  }

  // Админские методы
  async adminLogin(credentials: AdminLoginRequest): Promise<AdminTokenResponse> {
    const response = await this.request<AdminTokenResponse>('/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Сохраняем токен
    this.adminToken = response.access_token;
    localStorage.setItem('admin_token', response.access_token);
    localStorage.setItem('admin_refresh_token', response.refresh_token);
    
    
    return response;
  }

  async adminRefresh(): Promise<AdminTokenResponse> {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Используем прямой fetch для обновления токена, чтобы избежать рекурсии
    const response = await fetch(`${API_BASE_URL}/admin/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();
    
    // Обновляем токены
    this.adminToken = data.access_token;
    localStorage.setItem('admin_token', data.access_token);
    localStorage.setItem('admin_refresh_token', data.refresh_token);
    
    
    return data;
  }

  async adminLogout(): Promise<void> {
    try {
      // Вызываем logout на сервере для блокировки токенов
      await this.request('/admin/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Даже если сервер недоступен, очищаем локальные токены
    } finally {
      this.adminToken = null;
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_refresh_token');
    }
  }

  // Проверка админской аутентификации
  isAdminAuthenticated(): boolean {
    return !!this.adminToken;
  }

  // Проверка и обновление токена при необходимости
  private async ensureValidAdminToken(): Promise<void> {
    if (!this.adminToken) {
      throw new Error('No admin token available');
    }

    try {
      // Пытаемся использовать текущий токен
      const response = await fetch(`${API_BASE_URL}/admin/me`, {
        headers: {
          'Authorization': `Bearer ${this.adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        // Токен истек, пытаемся обновить
        console.log('Admin token expired, trying to refresh...');
        await this.adminRefresh();
      }
    } catch (error) {
      console.error('Error checking admin token:', error);
      throw error;
    }
  }

  // CRUD операции со сказками (только для админов)
  async createFairyTale(taleData: {
    title: string;
    author_name?: string;
    description?: string;
    content: string;
    status?: 'draft' | 'published';
    order?: number;
    tags?: string; // JSON строка
  }): Promise<FairyTaleResponse> {
    return this.request<FairyTaleResponse>('/fairy-tales/', {
      method: 'POST',
      body: JSON.stringify(taleData),
    });
  }

  async updateFairyTale(externalId: string, taleData: {
    title?: string;
    author_name?: string;
    description?: string;
    content?: string;
    status?: 'draft' | 'published';
    order?: number;
    tags?: string;
  }): Promise<FairyTaleResponse> {
    return this.request<FairyTaleResponse>(`/fairy-tales/${externalId}`, {
      method: 'PUT',
      body: JSON.stringify(taleData),
    });
  }

  async deleteFairyTale(externalId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/fairy-tales/${externalId}`, {
      method: 'DELETE',
    });
  }

  // Замена файлов для существующих сказок
  async replaceAudioFile(fairyTaleExternalId: string, audioFile: File): Promise<FileMetaResponse> {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    
    return this.request<FileMetaResponse>(`/files/replace-audio/${fairyTaleExternalId}`, {
      method: 'PUT',
      body: formData,
      headers: {
        // Content-Type будет автоматически установлен fetch для FormData
      },
    });
  }

  async replaceCoverFile(fairyTaleExternalId: string, coverFile: File): Promise<FileMetaResponse> {
    const formData = new FormData();
    formData.append('cover_file', coverFile);
    
    return this.request<FileMetaResponse>(`/files/replace-cover/${fairyTaleExternalId}`, {
      method: 'PUT',
      body: formData,
      headers: {
        // Content-Type будет автоматически установлен fetch для FormData
      },
    });
  }
}

export const apiService = new ApiService();
