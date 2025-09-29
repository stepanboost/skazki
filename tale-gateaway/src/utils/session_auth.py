import uuid
import logging
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database.database import get_db
from src.database.models import AnonymousSession
from src.database.operations.session_operations import SessionOperations
from src.config import settings

logger = logging.getLogger(__name__)


def create_session_token(session_id: str) -> str:
    """Создание JWT токена для анонимной сессии (без истечения)"""
    to_encode = {
        "sub": session_id,
        "type": "anonymous_session"
    }
    
    # Убеждаемся, что algorithm - это строка
    algorithm = settings.algorithm
    if isinstance(algorithm, list):
        algorithm = algorithm[0]
    
    logger.info(f"Algorithm type: {type(algorithm)}, value: {algorithm}")
    return jwt.encode(to_encode, settings.secret_key, algorithm=algorithm)

def verify_session_token(token: str) -> Optional[str]:
    """Проверка JWT токена анонимной сессии"""
    try:
        logger.info(f"Verifying token: {token[:20]}...")
        
        # Убеждаемся, что algorithm - это строка
        algorithm = settings.algorithm
        if isinstance(algorithm, list):
            algorithm = algorithm[0]
            
        payload = jwt.decode(token, settings.secret_key, algorithms=[algorithm])
        logger.info(f"JWT Payload: {payload}")
        if payload.get("type") != "anonymous_session":
            logger.info("Token type is not anonymous_session")
            return None
        session_id = payload.get("sub")
        logger.info(f"Extracted session_id: {session_id}")
        return session_id
    except JWTError as e:
        logger.error(f"JWT Error: {e}")
        return None

async def get_session_by_token(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[AnonymousSession]:
    """Получение сессии по токену (обязательно для API)"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется токен авторизации"
        )
    
    token = auth_header.split(" ")[1]
    session_id = verify_session_token(token)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный токен"
        )
    
    session = await SessionOperations.get_by_session_id(db, session_id)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Сессия не найдена или отозвана"
        )
    
    return session

async def create_new_session(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> AnonymousSession:
    """Создание новой анонимной сессии"""
    return await SessionOperations.create_session(
        db,
        user_agent=request.headers.get("User-Agent", ""),
        ip_address=request.client.host if request.client else None
    )

