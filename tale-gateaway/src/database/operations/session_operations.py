"""
Операции с таблицей анонимных сессий.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.sql import func
from src.database.models import AnonymousSession
from typing import Optional
import uuid
import logging

logger = logging.getLogger(__name__)


class SessionOperations:
    """Класс для операций с анонимными сессиями."""
    
    @staticmethod
    async def get_by_session_id(db: AsyncSession, session_id: str) -> Optional[AnonymousSession]:
        """Получить сессию по ID."""
        result = await db.execute(
            select(AnonymousSession).filter(AnonymousSession.session_id == session_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_session(
        db: AsyncSession, 
        user_agent: Optional[str] = None, 
        ip_address: Optional[str] = None
    ) -> AnonymousSession:
        """Создать новую анонимную сессию."""
        session_id = str(uuid.uuid4())
        
        session = AnonymousSession(
            session_id=session_id,
            user_agent=user_agent,
            ip_address=ip_address,
            is_active=True,
            revoked=False
        )
        
        db.add(session)
        await db.commit()
        await db.refresh(session)
        
        logger.info(f"Created new anonymous session: {session_id}")
        return session
    
    @staticmethod
    async def revoke_session(db: AsyncSession, session_id: str) -> bool:
        """Отозвать сессию (пометить как revoked)."""
        result = await db.execute(
            update(AnonymousSession)
            .filter(AnonymousSession.session_id == session_id)
            .values(revoked=True)
        )
        await db.commit()
        
        if result.rowcount == 0:
            logger.warning(f"Session not found for revocation: {session_id}")
            return False
        
        logger.info(f"Session revoked: {session_id}")
        return True
    
    @staticmethod
    async def is_session_valid(db: AsyncSession, session_id: str) -> bool:
        """Проверить, валидна ли сессия (активна и не отозвана)."""
        session = await SessionOperations.get_by_session_id(db, session_id)
        if not session:
            return False
        
        return session.is_active and not session.revoked
    
    @staticmethod
    async def update_last_activity(db: AsyncSession, session_id: str) -> bool:
        """Обновить время последней активности сессии."""
        result = await db.execute(
            update(AnonymousSession)
            .filter(AnonymousSession.session_id == session_id)
            .values(last_activity=func.now())
        )
        await db.commit()
        return result.rowcount > 0
