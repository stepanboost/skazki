from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from src.database.database import get_db
from src.database.models import Admin, AnonymousSession
from src.schemas.admin_schemas import AdminLogin, AdminResponse, AdminToken, AdminRefreshToken, AdminTokenResponse
from src.utils.admin_auth import verify_password, get_password_hash, create_admin_token, create_admin_refresh_token, verify_admin_refresh_token, get_current_active_admin, block_admin_tokens
from src.config import settings
from datetime import timedelta

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()

@router.get("/me", response_model=AdminResponse)
async def get_current_admin_info(current_admin: Admin = Depends(get_current_active_admin)):
    """Получение информации о текущем администраторе"""
    return current_admin

@router.post("/login", response_model=AdminToken)
async def admin_login(admin_credentials: AdminLogin, db: AsyncSession = Depends(get_db)):
    """Авторизация администратора"""
    result = await db.execute(select(Admin).filter(Admin.username == admin_credentials.username))
    admin = result.scalar_one_or_none()
    
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
    
    # Преобразуем admin_id в int
    try:
        admin_id = int(admin_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin ID in token"
        )
    
    # Проверяем, что админ все еще существует и активен
    result = await db.execute(select(Admin).filter(Admin.id == admin_id))
    admin = result.scalar_one_or_none()
    
    if not admin or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not found or inactive"
        )
    
    # Создаем новые токены
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
    
    # Блокируем access токен
    try:
        await block_admin_tokens(access_token, None)  # refresh_token не передаем
    except Exception as e:
        pass  # Игнорируем ошибки Redis при выходе
    
    return {"message": "Успешный выход"}

@router.post("/revoke/{session_id}")
async def revoke_session_by_id(
    session_id: str,
    current_admin: Admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Отзыв сессии по ID (для админки)"""
    result = await db.execute(
        update(AnonymousSession)
        .filter(AnonymousSession.session_id == session_id)
        .values(revoked=True)
    )
    await db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    
    return {"message": f"Сессия {session_id} отозвана"}


