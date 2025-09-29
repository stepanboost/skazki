from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from src.utils.password_utils import verify_password, get_password_hash
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database.database import get_db
from src.database.models import Admin
from src.database.operations.admin_operations import AdminOperations
from src.config import settings
from src.redis.client import redis_client
import logging
import bcrypt

if not hasattr(bcrypt, '__about__'):
    bcrypt.__about__ = type('obj', (object,), {'__version__': '4.3.0'})

logger = logging.getLogger(__name__)

security = HTTPBearer()

def create_admin_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=settings.admin_access_token_expire_minutes)
    
    to_encode.update({"exp": expire, "type": "admin_access"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def create_admin_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(days=settings.admin_refresh_token_expire_days)
    
    to_encode.update({"exp": expire, "type": "admin_refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

async def verify_admin_token(token: str) -> Optional[dict]:
    try:
        try:
            if await redis_client.is_token_blocked(token):
                return None
        except Exception as redis_error:
            logger.warning(f"Redis unavailable for token check: {redis_error}")
            
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "admin_access":
            return None
        return payload
    except JWTError:
        return None

async def verify_admin_refresh_token(token: str) -> Optional[dict]:
    try:
        try:
            if await redis_client.is_token_blocked(token):
                return None
        except Exception as redis_error:
            logger.warning(f"Redis unavailable for refresh token check: {redis_error}")
            
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "admin_refresh":
            return None
        return payload
    except JWTError:
        return None

async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Admin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Неверные учетные данные администратора",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = await verify_admin_token(token)
    if payload is None:
        raise credentials_exception
    
    admin_id_str = payload.get("sub")
    if admin_id_str is None:
        raise credentials_exception
    
    try:
        admin_id = int(admin_id_str)
    except (ValueError, TypeError):
        raise credentials_exception
    
    admin = await AdminOperations.get_by_id(db, admin_id)
    if admin is None:
        raise credentials_exception
    
    return admin

async def get_current_active_admin(current_admin: Admin = Depends(get_current_admin)) -> Admin:
    if not current_admin.is_active:
        raise HTTPException(status_code=400, detail="Неактивный администратор")
    return current_admin

async def block_admin_tokens(access_token: str, refresh_token: str = None) -> bool:
    """Блокирует токены администратора при logout"""
    try:
        await redis_client.block_token(access_token, ttl=settings.admin_access_token_expire_minutes * 60)
        
        if refresh_token:
            await redis_client.block_token(refresh_token, ttl=settings.admin_refresh_token_expire_days * 24 * 60 * 60)
        
        return True
    except Exception as e:
        logger.error(f"Error blocking admin tokens: {e}")
        return False