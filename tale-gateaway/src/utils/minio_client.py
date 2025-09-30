from minio import Minio
from minio.error import S3Error
from typing import Optional
import uuid
from datetime import timedelta
from src.config import settings

class MinIOClient:
    def __init__(self):
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure
        )
        self.bucket_name = settings.minio_bucket_name
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Создает bucket если он не существует"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as e:
            print(f"Error creating bucket: {e}")
    
    def generate_object_name(self, file_type: str = "audio") -> str:
        """Генерирует уникальное имя файла для MinIO с префиксом"""
        unique_id = str(uuid.uuid4())
        return f"{file_type}_{unique_id}"
    
    def upload_file(self, file_data: bytes, object_name: str, content_type: str) -> bool:
        """Загружает файл в MinIO"""
        try:
            from io import BytesIO
            file_stream = BytesIO(file_data)
            
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=file_stream,
                length=len(file_data),
                content_type=content_type
            )
            return True
        except S3Error as e:
            print(f"Error uploading file: {e}")
            return False
    
    def get_presigned_url(self, object_name: str, expires_seconds: int = 3600) -> Optional[str]:
        """Получает presigned URL для доступа к файлу"""
        try:
            # Создаем клиент для генерации URL с публичным endpoint
            url_client = Minio(
                settings.minio_public_endpoint,  # Используем localhost:9000 для подписи
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure,
                region=settings.minio_region
            )
            
            url = url_client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=timedelta(seconds=expires_seconds)
            )
            
            return url
        except S3Error as e:
            print(f"Error generating presigned URL: {e}")
            return None
        except Exception as e:
            print(f"Unexpected error in get_presigned_url: {e}")
            return None
    
    def delete_file(self, object_name: str) -> bool:
        """Удаляет файл из MinIO"""
        try:
            self.client.remove_object(self.bucket_name, object_name)
            return True
        except S3Error as e:
            print(f"Error deleting file: {e}")
            return False
    

# Глобальный экземпляр клиента
minio_client = MinIOClient()
