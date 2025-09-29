from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from src.database.database import Base

class FairyTaleStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Связи с сказками
    # fairy_tales = relationship("FairyTale", back_populates="author")

class AnonymousSession(Base):
    __tablename__ = "anonymous_sessions"
    
    session_id = Column(String(255), primary_key=True, index=True)
    user_agent = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    is_active = Column(Boolean, default=True, nullable=False)
    revoked = Column(Boolean, default=False, nullable=False)  # Отзыв сессии
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class FairyTale(Base):
    __tablename__ = "fairy_tales"
    
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), unique=True, index=True, nullable=False)  # UUID для внешнего использования
    title = Column(String(200), nullable=False, index=True)
    author_name = Column(String(100), nullable=True)  # Имя автора для отображения
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)
    audio_external_name = Column(String(500), nullable=True)  # Имя аудиофайла в MinIO
    cover_external_name = Column(String(500), nullable=True)  # Имя обложки в MinIO
    status = Column(SQLEnum(FairyTaleStatus), default=FairyTaleStatus.DRAFT, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    tags = Column(Text, nullable=True)  # JSON строка с тегами
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Внешний ключ на админа-автора (необязательный)
    author_id = Column(Integer, ForeignKey("admins.id"), nullable=True)
    # author = relationship("Admin", back_populates="fairy_tales")
    
    # Связи с аудиофайлами
    audio_files = relationship("AudioFile", back_populates="fairy_tale", cascade="all, delete-orphan")

class AudioFile(Base):
    __tablename__ = "audio_files"
    
    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)  # Размер файла в байтах
    duration = Column(Integer, nullable=True)  # Длительность в секундах
    mime_type = Column(String(100), nullable=True)  # MIME тип файла
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Внешний ключ на сказку
    fairy_tale_id = Column(Integer, ForeignKey("fairy_tales.id"), nullable=False)
    fairy_tale = relationship("FairyTale", back_populates="audio_files")