"""
Операции с таблицей админов.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database.models import Admin
from src.utils.password_utils import get_password_hash
from src.config import settings
from typing import Optional


class AdminOperations:
    """Класс для операций с админами."""
    
    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> Optional[Admin]:
        """Получить админа по имени пользователя."""
        result = await db.execute(select(Admin).filter(Admin.username == username))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_id(db: AsyncSession, admin_id: int) -> Optional[Admin]:
        """Получить админа по ID."""
        result = await db.execute(select(Admin).filter(Admin.id == admin_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_default_admin(db: AsyncSession) -> Admin:
        """Создать админа по умолчанию, если он не существует."""
        # Проверяем, существует ли уже админ
        existing_admin = await AdminOperations.get_by_username(db, settings.admin_username)
        if existing_admin:
            return existing_admin
        
        # Создаем нового админа
        admin = Admin(
            username=settings.admin_username,
            hashed_password=get_password_hash(settings.admin_password),
            is_active=True
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
        return admin
    
    @staticmethod
    async def verify_admin_exists(db: AsyncSession, username: str) -> bool:
        """Проверить, существует ли админ с данным именем пользователя."""
        admin = await AdminOperations.get_by_username(db, username)
        return admin is not None
