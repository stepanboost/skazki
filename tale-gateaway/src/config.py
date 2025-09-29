import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/skazki_db")
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    algorithm: str = "HS256"
    admin_username: str = os.getenv("ADMIN_USER", "Владимир Журавлёв")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "admin123")
    # Времена истечения токенов (в минутах)
    admin_access_token_expire_minutes: int = 15  # 15 минут
    admin_refresh_token_expire_days: int = 3     # 3 дня
    
    # MinIO настройки
    minio_endpoint: str = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    minio_access_key: str = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    minio_secret_key: str = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    minio_bucket_name: str = os.getenv("MINIO_BUCKET_NAME", "skazki-audio")
    minio_secure: bool = os.getenv("MINIO_SECURE", "false").lower() == "true"
    
    # Redis настройки
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", "6379"))
    redis_db: int = int(os.getenv("REDIS_DB", "0"))
    redis_password: str = os.getenv("REDIS_PASSWORD", "")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()