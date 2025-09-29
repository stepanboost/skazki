from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from src.database.database import get_db
from src.database.models import Admin, AnonymousSession
from src.database.operations.admin_operations import AdminOperations
from src.schemas.admin_schemas import AdminLogin, AdminResponse, AdminToken, AdminRefreshToken
from src.utils.admin_auth import create_admin_token, create_admin_refresh_token, verify_admin_refresh_token, get_current_active_admin, block_admin_tokens
from src.utils.password_utils import verify_password
from src.config import settings
from datetime import timedelta

router = APIRouter(prefix="/admin", tags=["Администратор"])
security = HTTPBearer()


@router.post("/login", response_model=AdminToken)
async def admin_login(admin_credentials: AdminLogin, db: AsyncSession = Depends(get_db)):
    """Авторизация администратора"""
    admin = await AdminOperations.get_by_username(db, admin_credentials.username)
    
    if not admin or not verify_password(admin_credentials.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive administrator"
        )
    
    access_token_expires = timedelta(minutes=settings.admin_access_token_expire_minutes)
    refresh_token_expires = timedelta(days=settings.admin_refresh_token_expire_days)
    
    access_token = create_admin_token(
        data={"sub": str(admin.id)}, expires_delta=access_token_expires
    )
    
    refresh_token = create_admin_refresh_token(
        data={"sub": str(admin.id)}, expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=AdminToken)
async def refresh_admin_token(refresh_data: AdminRefreshToken, db: AsyncSession = Depends(get_db)):
    """Обновление токенов администратора"""
    payload = await verify_admin_refresh_token(refresh_data.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    admin_id_str = payload.get("sub")
    if not admin_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    try:
        admin_id = int(admin_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin ID in token"
        )
    admin = await AdminOperations.get_by_id(db, admin_id)
    
    if not admin or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not found or inactive"
        )
    
    access_token_expires = timedelta(minutes=settings.admin_access_token_expire_minutes)
    refresh_token_expires = timedelta(days=settings.admin_refresh_token_expire_days)
    
    access_token = create_admin_token(
        data={"sub": str(admin.id)}, expires_delta=access_token_expires
    )
    
    new_refresh_token = create_admin_refresh_token(
        data={"sub": str(admin.id)}, expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def admin_logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_admin: Admin = Depends(get_current_active_admin)
):
    """Выход администратора"""
    access_token = credentials.credentials
    
    try:
        await block_admin_tokens(access_token, None)
    except Exception as e:
        pass  # Игнорируем ошибки Redis при выходе
    
    return {"message": "Успешный выход"}



