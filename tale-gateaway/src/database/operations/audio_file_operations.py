"""
Операции с таблицей аудиофайлов.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from src.database.models import AudioFile
from typing import List, Optional


class AudioFileOperations:
    """Класс для операций с аудиофайлами."""
    
    @staticmethod
    async def get_by_fairy_tale_id(db: AsyncSession, fairy_tale_id: int) -> List[AudioFile]:
        """Получить все аудиофайлы для сказки."""
        result = await db.execute(
            select(AudioFile).filter(AudioFile.fairy_tale_id == fairy_tale_id)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_first_by_fairy_tale_id(db: AsyncSession, fairy_tale_id: int) -> Optional[AudioFile]:
        """Получить первый аудиофайл для сказки."""
        result = await db.execute(
            select(AudioFile).filter(AudioFile.fairy_tale_id == fairy_tale_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create(
        db: AsyncSession,
        fairy_tale_id: int,
        original_filename: str,
        file_size: Optional[int] = None,
        duration: Optional[int] = None,
        mime_type: Optional[str] = None
    ) -> AudioFile:
        """Создать запись об аудиофайле."""
        audio_file = AudioFile(
            fairy_tale_id=fairy_tale_id,
            original_filename=original_filename,
            file_size=file_size,
            duration=duration,
            mime_type=mime_type
        )
        
        db.add(audio_file)
        await db.commit()
        await db.refresh(audio_file)
        return audio_file
    
    @staticmethod
    async def update_duration(
        db: AsyncSession, 
        fairy_tale_id: int, 
        duration: int
    ) -> Optional[AudioFile]:
        """Обновить длительность аудиофайла."""
        audio_file = await AudioFileOperations.get_first_by_fairy_tale_id(db, fairy_tale_id)
        if not audio_file:
            return None
        
        audio_file.duration = duration
        await db.commit()
        await db.refresh(audio_file)
        return audio_file
    
    @staticmethod
    async def delete_by_fairy_tale_id(db: AsyncSession, fairy_tale_id: int) -> bool:
        """Удалить все аудиофайлы для сказки."""
        audio_files = await AudioFileOperations.get_by_fairy_tale_id(db, fairy_tale_id)
        if not audio_files:
            return False
        
        for audio_file in audio_files:
            await db.delete(audio_file)
        
        await db.commit()
        return True
    
    @staticmethod
    async def delete_by_id(db: AsyncSession, audio_file_id: int) -> bool:
        """Удалить аудиофайл по ID."""
        result = await db.execute(
            select(AudioFile).filter(AudioFile.id == audio_file_id)
        )
        audio_file = result.scalar_one_or_none()
        
        if not audio_file:
            return False
        
        await db.delete(audio_file)
        await db.commit()
        return True
    
    @staticmethod
    async def get_duration_by_fairy_tale_id(db: AsyncSession, fairy_tale_id: int) -> Optional[int]:
        """Получить длительность аудиофайла для сказки."""
        audio_file = await AudioFileOperations.get_first_by_fairy_tale_id(db, fairy_tale_id)
        return audio_file.duration if audio_file else None
