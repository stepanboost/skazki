import logging
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from src.database.database import get_db
from src.database.models import AnonymousSession
from src.schemas.session_schemas import SessionResponse
from src.utils.session_auth import create_new_session, create_session_token, get_session_by_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/session", tags=["session"])


@router.get("/info")
async def get_session_info(
    session: AnonymousSession = Depends(get_session_by_token)
):
    """Получение информации о текущей сессии"""
    return {
        "session_id": session.session_id,
        "created_at": session.created_at,
        "last_activity": session.last_activity,
        "is_active": session.is_active,
        "revoked": session.revoked
    }

@router.post("/create")
async def create_anonymous_session(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Создание новой анонимной сессии или возврат существующей"""
    logger.info(f"Creating session for origin: {request.headers.get('Origin')}")
    auth_header = request.headers.get("Authorization")
    logger.info(f"Auth header: {auth_header}")
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[-1]
        from src.utils.session_auth import verify_session_token
        session_id = verify_session_token(token)
        if session_id:
            result = await db.execute(
                select(AnonymousSession).where(
                    AnonymousSession.session_id == session_id,
                    AnonymousSession.is_active == True,
                    AnonymousSession.revoked == False
                )
            )
            existing_session = result.scalar_one_or_none()
            if existing_session:
                logger.info("Returning existing session")
                return {
                    "session_id": existing_session.session_id,
                    "token": token,
                    "token_type": "bearer",
                }
            else:
                logger.info("No existing session found, will create new one")
    
    logger.info("Creating new session...")
    session = await create_new_session(request, db)
    
    try:
        access_token = create_session_token(session.session_id)
        logger.info(f"New session created: {session.session_id}")
        
        return {
            "session_id": session.session_id,
            "token": access_token,
            "token_type": "bearer",
        }
    except Exception as e:
        logger.error(f"Error creating session token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ошибка создания токена сессии"
        )


@router.post("/logout")
async def revoke_session(
    session: AnonymousSession = Depends(get_session_by_token),
    db: AsyncSession = Depends(get_db)
):
    """Отзыв текущей сессии"""
    await db.execute(
        update(AnonymousSession)
        .filter(AnonymousSession.session_id == session.session_id)
        .values(revoked=True)
    )
    await db.commit()
    
    return {"message": "Сессия отозвана"}


