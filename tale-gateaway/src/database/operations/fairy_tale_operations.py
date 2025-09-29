"""
Операции с таблицей сказок.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from src.database.models import FairyTale, FairyTaleStatus
from typing import List, Optional
import uuid


class FairyTaleOperations:
    """Класс для операций со сказками."""
    
    @staticmethod
    async def get_all_published(db: AsyncSession) -> List[FairyTale]:
        """Получить все опубликованные сказки."""
        result = await db.execute(
            select(FairyTale)
            .filter(FairyTale.status == FairyTaleStatus.PUBLISHED)
            .order_by(FairyTale.order, FairyTale.created_at)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_all_for_admin(db: AsyncSession) -> List[FairyTale]:
        """Получить все сказки для админа (включая черновики)."""
        result = await db.execute(
            select(FairyTale)
            .order_by(FairyTale.order, FairyTale.created_at)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_by_external_id(db: AsyncSession, external_id: str) -> Optional[FairyTale]:
        """Получить сказку по внешнему ID."""
        result = await db.execute(
            select(FairyTale).filter(FairyTale.external_id == external_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_id(db: AsyncSession, tale_id: int) -> Optional[FairyTale]:
        """Получить сказку по внутреннему ID."""
        result = await db.execute(
            select(FairyTale).filter(FairyTale.id == tale_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create(
        db: AsyncSession,
        title: str,
        content: str,
        author_name: Optional[str] = None,
        description: Optional[str] = None,
        status: FairyTaleStatus = FairyTaleStatus.DRAFT,
        order: int = 0,
        tags: Optional[str] = None,
        author_id: Optional[int] = None
    ) -> FairyTale:
        """Создать новую сказку."""
        external_id = str(uuid.uuid4())
        
        fairy_tale = FairyTale(
            external_id=external_id,
            title=title,
            content=content,
            author_name=author_name,
            description=description,
            status=status,
            order=order,
            tags=tags,
            author_id=author_id
        )
        
        db.add(fairy_tale)
        await db.commit()
        await db.refresh(fairy_tale)
        return fairy_tale
    
    @staticmethod
    async def update(
        db: AsyncSession,
        external_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        author_name: Optional[str] = None,
        description: Optional[str] = None,
        status: Optional[FairyTaleStatus] = None,
        order: Optional[int] = None,
        tags: Optional[str] = None,
        audio_external_name: Optional[str] = None,
        cover_external_name: Optional[str] = None
    ) -> Optional[FairyTale]:
        """Обновить сказку."""
        fairy_tale = await FairyTaleOperations.get_by_external_id(db, external_id)
        if not fairy_tale:
            return None
        
        # Обновляем только переданные поля
        if title is not None:
            fairy_tale.title = title
        if content is not None:
            fairy_tale.content = content
        if author_name is not None:
            fairy_tale.author_name = author_name
        if description is not None:
            fairy_tale.description = description
        if status is not None:
            fairy_tale.status = status
        if order is not None:
            fairy_tale.order = order
        if tags is not None:
            fairy_tale.tags = tags
        if audio_external_name is not None:
            fairy_tale.audio_external_name = audio_external_name
        if cover_external_name is not None:
            fairy_tale.cover_external_name = cover_external_name
        
        await db.commit()
        await db.refresh(fairy_tale)
        return fairy_tale
    
    @staticmethod
    async def delete(db: AsyncSession, external_id: str) -> bool:
        """Удалить сказку."""
        fairy_tale = await FairyTaleOperations.get_by_external_id(db, external_id)
        if not fairy_tale:
            return False
        
        await db.delete(fairy_tale)
        await db.commit()
        return True
    
    @staticmethod
    async def update_audio_file(
        db: AsyncSession, 
        external_id: str, 
        audio_external_name: str
    ) -> Optional[FairyTale]:
        """Обновить аудиофайл сказки."""
        return await FairyTaleOperations.update(
            db, external_id, audio_external_name=audio_external_name
        )
    
    @staticmethod
    async def update_cover_image(
        db: AsyncSession, 
        external_id: str, 
        cover_external_name: str
    ) -> Optional[FairyTale]:
        """Обновить обложку сказки."""
        return await FairyTaleOperations.update(
            db, external_id, cover_external_name=cover_external_name
        )
    
    @staticmethod
    async def clear_audio_file(db: AsyncSession, external_id: str) -> Optional[FairyTale]:
        """Очистить аудиофайл сказки."""
        return await FairyTaleOperations.update(
            db, external_id, audio_external_name=None
        )
    
    @staticmethod
    async def clear_cover_image(db: AsyncSession, external_id: str) -> Optional[FairyTale]:
        """Очистить обложку сказки."""
        return await FairyTaleOperations.update(
            db, external_id, cover_external_name=None
        )
