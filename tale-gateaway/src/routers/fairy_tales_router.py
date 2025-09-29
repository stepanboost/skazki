from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from src.database.database import get_db
from src.database.models import FairyTale, AudioFile
from src.schemas.fairy_tales_schemas import (
    FairyTaleResponse, 
    FairyTaleListResponse, 
    FairyTaleCreate, 
    FairyTaleUpdate
)
from src.utils.session_auth import get_session_by_token
from src.utils.admin_auth import get_current_active_admin
from typing import List
from src.utils.minio_client import minio_client
import uuid

router = APIRouter(prefix="/fairy-tales", tags=["fairy-tales"])

@router.options("/")
async def options_fairy_tales(request: Request):
    """Обработка OPTIONS запросов для CORS"""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Credentials": "true",
        }
    )

@router.get("/", response_model=FairyTaleListResponse)
async def get_fairy_tales(
    db: AsyncSession = Depends(get_db)
):
    """Получение опубликованных сказок для пользователей"""
    from src.database.models import FairyTaleStatus
    
    # Загружаем только опубликованные сказки
    result = await db.execute(
        select(FairyTale)
        .filter(FairyTale.status == FairyTaleStatus.PUBLISHED)
        .order_by(FairyTale.order, FairyTale.created_at)
    )
    fairy_tales = result.scalars().all()
    
    # Формируем ответ с presigned URL для файлов
    response_tales = []
    for tale in fairy_tales:
        # Генерируем presigned URL для аудио и обложки если они есть
        audio_url = None
        if tale.audio_external_name:
            audio_url = minio_client.get_presigned_url(tale.audio_external_name)
        
        cover_image_url = None
        if tale.cover_external_name:
            cover_image_url = minio_client.get_presigned_url(tale.cover_external_name)
        
        # Получаем длительность аудио
        audio_duration = None
        if tale.audio_external_name:
            # Загружаем связанные аудиофайлы
            audio_result = await db.execute(
                select(AudioFile).filter(AudioFile.fairy_tale_id == tale.id)
            )
            audio_files = audio_result.scalars().all()
            if audio_files:
                audio_duration = audio_files[0].duration
        
        response_tales.append(FairyTaleResponse(
            id=tale.id,
            external_id=tale.external_id,
            title=tale.title,
            author_name=tale.author_name,
            description=tale.description,
            content=tale.content,
            audio_external_name=tale.audio_external_name,
            cover_external_name=tale.cover_external_name,
            status=tale.status,
            order=tale.order,
            tags=tale.tags,
            created_at=tale.created_at,
            updated_at=tale.updated_at,
            author_id=tale.author_id,
            audio_url=audio_url,
            cover_image_url=cover_image_url,
            audio_duration=audio_duration
        ))
    
    return FairyTaleListResponse(fairy_tales=response_tales)

@router.get("/admin", response_model=FairyTaleListResponse)
async def get_fairy_tales_admin(
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Получение всех сказок для администраторов"""
    # Загружаем все сказки
    result = await db.execute(
        select(FairyTale)
        .order_by(FairyTale.order, FairyTale.created_at)
    )
    fairy_tales = result.scalars().all()
    
    # Формируем ответ с presigned URL для файлов
    response_tales = []
    for tale in fairy_tales:
        # Генерируем presigned URL для аудио и обложки если они есть
        audio_url = None
        if tale.audio_external_name:
            audio_url = minio_client.get_presigned_url(tale.audio_external_name)
        
        cover_image_url = None
        if tale.cover_external_name:
            cover_image_url = minio_client.get_presigned_url(tale.cover_external_name)
        
        # Получаем длительность аудио
        audio_duration = None
        if tale.audio_external_name:
            # Загружаем связанные аудиофайлы
            audio_result = await db.execute(
                select(AudioFile).filter(AudioFile.fairy_tale_id == tale.id)
            )
            audio_files = audio_result.scalars().all()
            if audio_files:
                audio_duration = audio_files[0].duration
        
        response_tales.append(FairyTaleResponse(
            id=tale.id,
            external_id=tale.external_id,
            title=tale.title,
            author_name=tale.author_name,
            description=tale.description,
            content=tale.content,
            audio_external_name=tale.audio_external_name,
            cover_external_name=tale.cover_external_name,
            status=tale.status,
            order=tale.order,
            tags=tale.tags,
            created_at=tale.created_at,
            updated_at=tale.updated_at,
            author_id=tale.author_id,
            audio_url=audio_url,
            cover_image_url=cover_image_url,
            audio_duration=audio_duration
        ))
    
    return FairyTaleListResponse(fairy_tales=response_tales)


@router.get("/{external_id}", response_model=FairyTaleResponse)
async def get_fairy_tale_by_id(
    external_id: str,
    session = Depends(get_session_by_token),
    db: AsyncSession = Depends(get_db)
):
    """Получение сказки по external_id"""
    result = await db.execute(
        select(FairyTale).filter(FairyTale.external_id == external_id)
    )
    fairy_tale = result.scalar_one_or_none()
    
    if not fairy_tale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fairy tale not found"
        )
    
    return FairyTaleResponse(
        id=fairy_tale.id,
        external_id=fairy_tale.external_id,
        title=fairy_tale.title,
        author_name=fairy_tale.author_name,
        description=fairy_tale.description,
        content=fairy_tale.content,
        audio_external_name=fairy_tale.audio_external_name,
        cover_external_name=fairy_tale.cover_external_name,
        status=fairy_tale.status,
        order=fairy_tale.order,
        tags=fairy_tale.tags,
        created_at=fairy_tale.created_at,
        updated_at=fairy_tale.updated_at,
        author_id=fairy_tale.author_id,
    )

@router.get("/{fairy_tale_id}/audio-files")
async def get_audio_files(
    fairy_tale_id: int,
    session = Depends(get_session_by_token),
    db: AsyncSession = Depends(get_db)
):
    """Получение аудиофайлов для сказки"""
    result = await db.execute(
        select(AudioFile).filter(AudioFile.fairy_tale_id == fairy_tale_id)
    )
    audio_files = result.scalars().all()
    
    return [
        {
            "id": file.id,
            "original_filename": file.original_filename,
            "file_size": file.file_size,
            "duration": file.duration,
            "mime_type": file.mime_type,
            "created_at": file.created_at,
            "fairy_tale_id": file.fairy_tale_id
        }
        for file in audio_files
    ]

# Админские эндпоинты для CRUD операций

@router.post("/", response_model=FairyTaleResponse)
async def create_fairy_tale(
    fairy_tale_data: FairyTaleCreate,
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Создание новой сказки (только для админов)"""
    # Генерируем внешний ID
    external_id = str(uuid.uuid4())
    
    # Создаем новую сказку
    fairy_tale = FairyTale(
        external_id=external_id,
        title=fairy_tale_data.title,
        author_name=fairy_tale_data.author_name,
        description=fairy_tale_data.description,
        content=fairy_tale_data.content,
        status=fairy_tale_data.status,
        order=fairy_tale_data.order,
        tags=fairy_tale_data.tags,
        author_id=current_admin.id
    )
    
    db.add(fairy_tale)
    await db.commit()
    await db.refresh(fairy_tale)
    
    # Генерируем presigned URL для аудио и обложки если они есть
    audio_url = None
    if fairy_tale.audio_external_name:
        audio_url = minio_client.get_presigned_url(fairy_tale.audio_external_name)
    
    cover_image_url = None
    if fairy_tale.cover_external_name:
        cover_image_url = minio_client.get_presigned_url(fairy_tale.cover_external_name)
    
    # Получаем длительность аудио
    audio_duration = None
    if fairy_tale.audio_external_name:
        # Загружаем связанные аудиофайлы
        audio_result = await db.execute(
            select(AudioFile).filter(AudioFile.fairy_tale_id == fairy_tale.id)
        )
        audio_files = audio_result.scalars().all()
        if audio_files:
            audio_duration = audio_files[0].duration
    
    return FairyTaleResponse(
        id=fairy_tale.id,
        external_id=fairy_tale.external_id,
        title=fairy_tale.title,
        author_name=fairy_tale.author_name,
        description=fairy_tale.description,
        content=fairy_tale.content,
        audio_external_name=fairy_tale.audio_external_name,
        cover_external_name=fairy_tale.cover_external_name,
        status=fairy_tale.status,
        order=fairy_tale.order,
        tags=fairy_tale.tags,
        created_at=fairy_tale.created_at,
        updated_at=fairy_tale.updated_at,
        author_id=fairy_tale.author_id,
        audio_url=audio_url,
        cover_image_url=cover_image_url,
        audio_duration=audio_duration
    )

@router.put("/{external_id}", response_model=FairyTaleResponse)
async def update_fairy_tale(
    external_id: str,
    fairy_tale_data: FairyTaleUpdate,
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Обновление сказки (только для админов)"""
    # Находим сказку по external_id
    result = await db.execute(
        select(FairyTale).filter(FairyTale.external_id == external_id)
    )
    fairy_tale = result.scalar_one_or_none()
    
    if not fairy_tale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fairy tale not found"
        )
    
    # Обновляем только переданные поля
    update_data = fairy_tale_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(fairy_tale, field, value)
    
    await db.commit()
    await db.refresh(fairy_tale)
    
    # Генерируем presigned URL для аудио и обложки если они есть
    audio_url = None
    if fairy_tale.audio_external_name:
        audio_url = minio_client.get_presigned_url(fairy_tale.audio_external_name)
    
    cover_image_url = None
    if fairy_tale.cover_external_name:
        cover_image_url = minio_client.get_presigned_url(fairy_tale.cover_external_name)
    
    # Получаем длительность аудио
    audio_duration = None
    if fairy_tale.audio_external_name:
        # Загружаем связанные аудиофайлы
        audio_result = await db.execute(
            select(AudioFile).filter(AudioFile.fairy_tale_id == fairy_tale.id)
        )
        audio_files = audio_result.scalars().all()
        if audio_files:
            audio_duration = audio_files[0].duration
    
    return FairyTaleResponse(
        id=fairy_tale.id,
        external_id=fairy_tale.external_id,
        title=fairy_tale.title,
        author_name=fairy_tale.author_name,
        description=fairy_tale.description,
        content=fairy_tale.content,
        audio_external_name=fairy_tale.audio_external_name,
        cover_external_name=fairy_tale.cover_external_name,
        status=fairy_tale.status,
        order=fairy_tale.order,
        tags=fairy_tale.tags,
        created_at=fairy_tale.created_at,
        updated_at=fairy_tale.updated_at,
        author_id=fairy_tale.author_id,
        audio_url=audio_url,
        cover_image_url=cover_image_url,
        audio_duration=audio_duration
    )

@router.delete("/{external_id}")
async def delete_fairy_tale(
    external_id: str,
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Удаление сказки (только для админов)"""
    # Находим сказку по external_id
    result = await db.execute(
        select(FairyTale).filter(FairyTale.external_id == external_id)
    )
    fairy_tale = result.scalar_one_or_none()
    
    if not fairy_tale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fairy tale not found"
        )
    
    # Удаляем файлы из MinIO если они есть
    if fairy_tale.audio_external_name:
        minio_client.delete_file(fairy_tale.audio_external_name)
    
    if fairy_tale.cover_external_name:
        minio_client.delete_file(fairy_tale.cover_external_name)
    
    # Удаляем сказку из БД (каскадное удаление удалит связанные аудиофайлы)
    await db.delete(fairy_tale)
    await db.commit()
    
    return {"message": "Fairy tale deleted successfully"}
