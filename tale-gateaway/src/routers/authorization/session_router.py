import logging
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from src.database.database import get_db
from src.database.operations.session_operations import SessionOperations
from src.utils.session_auth import create_session_token, get_session_by_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/session", tags=["Анонимные сессии"])



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
            existing_session = await SessionOperations.get_by_session_id(db, session_id)
            if existing_session and existing_session.is_active and not existing_session.revoked:
                logger.info("Returning existing session")
                return {
                    "session_id": existing_session.session_id,
                    "token": token,
                    "token_type": "bearer",
                }
            else:
                logger.info("No existing session found, will create new one")
    
    logger.info("Creating new session...")
    session = await SessionOperations.create_session(
        db,
        user_agent=request.headers.get("User-Agent"),
        ip_address=request.client.host if request.client else None
    )
    
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




