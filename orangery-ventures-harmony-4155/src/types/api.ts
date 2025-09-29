// API типы для работы с бэкендом

export interface SessionResponse {
  session_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
  last_activity: string;
}

export interface FairyTaleResponse {
  id: number;
  external_id: string;
  title: string;
  author_name?: string;
  description?: string;
  content: string;
  audio_external_name?: string;
  cover_external_name?: string;
  status: 'draft' | 'published';
  order: number;
  tags?: string;
  created_at: string;
  updated_at: string;
  author_id?: number;
  audio_url?: string;
  cover_image_url?: string;
  audio_duration?: number;
}

export interface FileMetaResponse {
  file_type: 'audio' | 'cover';
  external_name: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  presigned_url: string;
}

export interface FileDownloadResponse {
  external_name: string;
  presigned_url: string;
}

export interface AudioFileResponse {
  id: number;
  original_filename: string;
  file_size?: number;
  duration?: number;
  mime_type?: string;
  created_at: string;
  fairy_tale_id: number;
}

// Преобразованный тип для фронтенда
export interface FairyTale {
  id: string; // external_id
  title: string;
  author?: string; // author_name
  description?: string;
  content: string;
  coverImage?: string; // presigned URL для cover
  audioFile?: string; // presigned URL для audio
  audioDuration?: number; // из audio_files
  tags?: string[];
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  order: number;
}



