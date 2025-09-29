from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database.database import get_db
from src.database.models import FairyTale, AudioFile
from src.schemas.audio_schemas import FileMetaResponse, FileDownloadResponse, UploadResponse
from src.utils.admin_auth import get_current_active_admin
from src.utils.minio_client import minio_client
import uuid

router = APIRouter(prefix="/files", tags=["files"])

@router.post("/upload", response_model=UploadResponse)
async def upload_files(
    audio_file: UploadFile = File(None),
    cover_file: UploadFile = File(None),
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Загрузка аудиофайла и/или обложки с автоматическим созданием сказки"""
    
    # Проверяем, что загружен хотя бы один файл
    if not audio_file and not cover_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file (audio or cover) must be provided"
        )
    
    # Генерируем внешний ID для сказки
    fairy_tale_external_id = str(uuid.uuid4())
    
    # Создаем новую сказку
    fairy_tale = FairyTale(
        external_id=fairy_tale_external_id,
        title="Untitled",  # Заголовок по умолчанию
        content="",  # Пустое содержимое по умолчанию
        author_id=current_admin.id
    )
    
    db.add(fairy_tale)
    await db.commit()
    await db.refresh(fairy_tale)
    
    response = UploadResponse(fairy_tale_external_id=fairy_tale_external_id)
    
    # Обрабатываем аудиофайл
    if audio_file:
        audio_data = await audio_file.read()
        audio_external_name = minio_client.generate_object_name("audio")
        
        # Загружаем в MinIO
        success = minio_client.upload_file(
            file_data=audio_data,
            object_name=audio_external_name,
            content_type=audio_file.content_type or "audio/mpeg"
        )
        
        if success:
            # Сохраняем external_name в сказке
            fairy_tale.audio_external_name = audio_external_name
            
            # Сохраняем метаинформацию в БД
            audio_record = AudioFile(
                original_filename=audio_file.filename,
                file_size=len(audio_data),
                mime_type=audio_file.content_type,
                fairy_tale_id=fairy_tale.id
            )
            db.add(audio_record)
            await db.commit()
            
            # Генерируем presigned URL
            presigned_url = minio_client.get_presigned_url(audio_external_name)
            
            response.audio_meta = FileMetaResponse(
                file_type="audio",
                external_name=audio_external_name,
                original_filename=audio_file.filename,
                file_size=len(audio_data),
                mime_type=audio_file.content_type or "audio/mpeg",
                presigned_url=presigned_url or ""
            )
    
    # Обрабатываем обложку
    if cover_file:
        cover_data = await cover_file.read()
        cover_external_name = minio_client.generate_object_name("cover")
        
        # Загружаем в MinIO
        success = minio_client.upload_file(
            file_data=cover_data,
            object_name=cover_external_name,
            content_type=cover_file.content_type or "image/jpeg"
        )
        
        if success:
            # Сохраняем external_name в сказке
            fairy_tale.cover_external_name = cover_external_name
            await db.commit()
            
            # Генерируем presigned URL
            presigned_url = minio_client.get_presigned_url(cover_external_name)
            
            response.cover_meta = FileMetaResponse(
                file_type="cover",
                external_name=cover_external_name,
                original_filename=cover_file.filename,
                file_size=len(cover_data),
                mime_type=cover_file.content_type or "image/jpeg",
                presigned_url=presigned_url or ""
            )
    
    return response

@router.put("/replace-audio/{fairy_tale_external_id}", response_model=FileMetaResponse)
async def replace_audio_file(
    fairy_tale_external_id: str,
    audio_file: UploadFile = File(...),
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Замена аудиофайла для существующей сказки"""
    # Находим сказку по external_id
    result = await db.execute(select(FairyTale).filter(FairyTale.external_id == fairy_tale_external_id))
    fairy_tale = result.scalar_one_or_none()
    
    if not fairy_tale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fairy tale not found"
        )
    
    # Читаем новый аудиофайл
    audio_data = await audio_file.read()
    audio_external_name = minio_client.generate_object_name("audio")
    
    # Загружаем в MinIO
    success = minio_client.upload_file(
        file_data=audio_data,
        object_name=audio_external_name,
        content_type=audio_file.content_type or "audio/mpeg"
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload audio file to storage"
        )
    
    # Удаляем старый файл из MinIO, если он существует
    if fairy_tale.audio_external_name:
        minio_client.delete_file(fairy_tale.audio_external_name)
    
    # Обновляем external_name в сказке
    fairy_tale.audio_external_name = audio_external_name
    
    # Находим существующую запись аудиофайла
    existing_audio_result = await db.execute(
        select(AudioFile).filter(AudioFile.fairy_tale_id == fairy_tale.id)
    )
    existing_audio = existing_audio_result.scalar_one_or_none()
    
    if existing_audio:
        # Обновляем метаинформацию
        existing_audio.original_filename = audio_file.filename
        existing_audio.file_size = len(audio_data)
        existing_audio.mime_type = audio_file.content_type
        await db.commit()
    else:
        # Создаем новую запись
        audio_record = AudioFile(
            original_filename=audio_file.filename,
            file_size=len(audio_data),
            mime_type=audio_file.content_type,
            fairy_tale_id=fairy_tale.id
        )
        db.add(audio_record)
        await db.commit()
    
    # Генерируем presigned URL
    presigned_url = minio_client.get_presigned_url(audio_external_name)
    
    return FileMetaResponse(
        file_type="audio",
        external_name=audio_external_name,
        original_filename=audio_file.filename,
        file_size=len(audio_data),
        mime_type=audio_file.content_type or "audio/mpeg",
        presigned_url=presigned_url or ""
    )

@router.put("/replace-cover/{fairy_tale_external_id}", response_model=FileMetaResponse)
async def replace_cover_file(
    fairy_tale_external_id: str,
    cover_file: UploadFile = File(...),
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Замена обложки для существующей сказки"""
    # Находим сказку по external_id
    result = await db.execute(select(FairyTale).filter(FairyTale.external_id == fairy_tale_external_id))
    fairy_tale = result.scalar_one_or_none()
    
    if not fairy_tale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fairy tale not found"
        )
    
    # Читаем новый файл обложки
    cover_data = await cover_file.read()
    cover_external_name = minio_client.generate_object_name("cover")
    
    # Загружаем в MinIO
    success = minio_client.upload_file(
        file_data=cover_data,
        object_name=cover_external_name,
        content_type=cover_file.content_type or "image/jpeg"
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload cover file to storage"
        )
    
    # Удаляем старую обложку из MinIO, если она существует
    if fairy_tale.cover_external_name:
        minio_client.delete_file(fairy_tale.cover_external_name)
    
    # Обновляем external_name обложки в сказке
    fairy_tale.cover_external_name = cover_external_name
    await db.commit()
    
    # Генерируем presigned URL
    presigned_url = minio_client.get_presigned_url(cover_external_name)
    
    return FileMetaResponse(
        file_type="cover",
        external_name=cover_external_name,
        original_filename=cover_file.filename,
        file_size=len(cover_data),
        mime_type=cover_file.content_type or "image/jpeg",
        presigned_url=presigned_url or ""
    )

@router.get("/download", response_model=FileDownloadResponse)
async def get_file_download_url(
    external_name: str = Query(..., description="External name of the file (e.g., audio_xxx or cover_xxx)")
):
    """Получение presigned URL для скачивания файла по external_name"""
    # Генерируем presigned URL
    presigned_url = minio_client.get_presigned_url(external_name)
    
    if not presigned_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate presigned URL"
        )
    
    return FileDownloadResponse(
        external_name=external_name,
        presigned_url=presigned_url
    )

@router.delete("/audio/{fairy_tale_external_id}")
async def delete_audio_file(
    fairy_tale_external_id: str,
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Удаление аудиофайла"""
    # Находим сказку по external_id
    result = await db.execute(select(FairyTale).filter(FairyTale.external_id == fairy_tale_external_id))
    fairy_tale = result.scalar_one_or_none()
    
    if not fairy_tale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fairy tale not found"
        )
    
    if not fairy_tale.audio_external_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio file not found"
        )
    
    # Удаляем из MinIO
    minio_client.delete_file(fairy_tale.audio_external_name)
    
    # Очищаем external_name в сказке
    fairy_tale.audio_external_name = None
    
    # Удаляем метаинформацию из БД
    audio_result = await db.execute(select(AudioFile).filter(AudioFile.fairy_tale_id == fairy_tale.id))
    audio_file = audio_result.scalar_one_or_none()
    if audio_file:
        await db.delete(audio_file)
    
    await db.commit()
    
    return {"message": "Audio file deleted successfully"}

@router.delete("/cover/{fairy_tale_external_id}")
async def delete_cover_image(
    fairy_tale_external_id: str,
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Удаление обложки сказки"""
    result = await db.execute(select(FairyTale).filter(FairyTale.external_id == fairy_tale_external_id))
    fairy_tale = result.scalar_one_or_none()
    
    if not fairy_tale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fairy tale not found"
        )
    
    if not fairy_tale.cover_external_name:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cover image not found"
        )
    
    # Удаляем из MinIO
    minio_client.delete_file(fairy_tale.cover_external_name)
    
    # Очищаем external_name обложки в сказке
    fairy_tale.cover_external_name = None
    await db.commit()
    
    return {"message": "Cover image deleted successfully"}
