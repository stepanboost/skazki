export interface FairyTale {
  id: string;
  title: string;
  author?: string;
  description?: string;
  content: string;
  coverImage?: string;
  audioFile?: string;
  audioDuration?: number; // в секундах
  tags?: string[];
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface AudioTrack {
  id: string;
  title: string;
  url: string;
  duration: number;
}

export interface DownloadFormat {
  type: 'mp3' | 'pdf' | 'txt' | 'epub';
  url: string;
  filename: string;
}
