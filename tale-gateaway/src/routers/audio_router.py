from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database.database import get_db
from src.database.models import FairyTale, AudioFile
from src.schemas.audio_schemas import FileMetaResponse, UploadResponse
from src.utils.admin_auth import get_current_active_admin
from src.utils.minio_client import minio_client
import uuid

def validate_audio_file(audio_file: UploadFile) -> None:
    """Валидирует аудиофайл (только MP3, WAV, OGG)"""
    filename = audio_file.filename or ""
    content_type = audio_file.content_type or ""
    
    if not filename.lower().endswith(('.mp3', '.wav', '.ogg')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неподдерживаемый формат аудиофайла. Разрешены только MP3, WAV, OGG"
        )
    
    if content_type and not content_type.startswith(('audio/mpeg', 'audio/wav', 'audio/ogg', 'application/ogg')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неподдерживаемый MIME тип аудиофайла. Разрешены только MP3, WAV, OGG"
        )

def get_audio_content_type(audio_file: UploadFile) -> str:
    """Определяет правильный content_type для аудиофайла (только MP3, WAV, OGG)"""
    content_type = audio_file.content_type
    if not content_type:
        filename = audio_file.filename or ""
        if filename.lower().endswith('.ogg'):
            content_type = "audio/ogg"
        elif filename.lower().endswith('.wav'):
            content_type = "audio/wav"
        else:
            content_type = "audio/mpeg"
    return content_type

router = APIRouter(prefix="/files", tags=["Файлы"])

@router.post("/upload", response_model=UploadResponse)
async def upload_files(
    audio_file: UploadFile = File(None),
    cover_file: UploadFile = File(None),
    current_admin = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db)
):
    """Загрузка аудиофайла и/или обложки с автоматическим созданием сказки"""
    
    if not audio_file and not cover_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file (audio or cover) must be provided"
        )
    
    fairy_tale_external_id = str(uuid.uuid4())
    
    fairy_tale = FairyTale(
        external_id=fairy_tale_external_id,
        title="Untitled",
        content="",
        author_id=current_admin.id
    )
    
    db.add(fairy_tale)
    await db.commit()
    await db.refresh(fairy_tale)
    
    response = UploadResponse(fairy_tale_external_id=fairy_tale_external_id)
    
    if audio_file:
        validate_audio_file(audio_file)
        
        audio_data = await audio_file.read()
        audio_external_name = minio_client.generate_object_name("audio")
        
        content_type = get_audio_content_type(audio_file)
        
        success = minio_client.upload_file(
            file_data=audio_data,
            object_name=audio_external_name,
            content_type=content_type
        )
        
        if success:
            fairy_tale.audio_external_name = audio_external_name
            
            audio_record = AudioFile(
                original_filename=audio_file.filename,
                file_size=len(audio_data),
                mime_type=audio_file.content_type,
                fairy_tale_id=fairy_tale.id
            )
            db.add(audio_record)
            await db.commit()
            
            presigned_url = minio_client.get_presigned_url(audio_external_name)
            
            response.audio_meta = FileMetaResponse(
                file_type="audio",
                external_name=audio_external_name,
                original_filename=audio_file.filename,
                file_size=len(audio_data),
                mime_type=content_type,
                presigned_url=presigned_url or ""
            )
    
    if cover_file:
        cover_data = await cover_file.read()
        cover_external_name = minio_client.generate_object_name("cover")
        
        success = minio_client.upload_file(
            file_data=cover_data,
            object_name=cover_external_name,
            content_type=cover_file.content_type or "image/jpeg"
        )
        
        if success:
            fairy_tale.cover_external_name = cover_external_name
            await db.commit()
            
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
    db: AsyncSession = Depends(get_db)
):
    """Замена аудиофайла для существующей сказки"""
    result = await db.execute(select(FairyTale).filter(FairyTale.external_id == fairy_tale_external_id))
    fairy_tale = result.scalar_one_or_none()
    
    if not fairy_tale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fairy tale not found"
        )
    
    validate_audio_file(audio_file)
    
    audio_data = await audio_file.read()
    audio_external_name = minio_client.generate_object_name("audio")
    
    content_type = get_audio_content_type(audio_file)
    
    success = minio_client.upload_file(
        file_data=audio_data,
        object_name=audio_external_name,
        content_type=content_type
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload audio file to storage"
        )
    
    if fairy_tale.audio_external_name:
        minio_client.delete_file(fairy_tale.audio_external_name)
    
    fairy_tale.audio_external_name = audio_external_name
    
    existing_audio_result = await db.execute(
        select(AudioFile).filter(AudioFile.fairy_tale_id == fairy_tale.id)
    )
    existing_audio = existing_audio_result.scalar_one_or_none()
    
    if existing_audio:
        existing_audio.original_filename = audio_file.filename
        existing_audio.file_size = len(audio_data)
        existing_audio.mime_type = audio_file.content_type
        await db.commit()
    else:
        audio_record = AudioFile(
            original_filename=audio_file.filename,
            file_size=len(audio_data),
            mime_type=audio_file.content_type,
            fairy_tale_id=fairy_tale.id
        )
        db.add(audio_record)
        await db.commit()
    
    presigned_url = minio_client.get_presigned_url(audio_external_name)
    
    return FileMetaResponse(
        file_type="audio",
        external_name=audio_external_name,
        original_filename=audio_file.filename,
        file_size=len(audio_data),
        mime_type=content_type,
        presigned_url=presigned_url or ""
    )

@router.put("/replace-cover/{fairy_tale_external_id}", response_model=FileMetaResponse)
async def replace_cover_file(
    fairy_tale_external_id: str,
    cover_file: UploadFile = File(...),
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
    
    cover_data = await cover_file.read()
    cover_external_name = minio_client.generate_object_name("cover")
    
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
    
    if fairy_tale.cover_external_name:
        minio_client.delete_file(fairy_tale.cover_external_name)
    
    fairy_tale.cover_external_name = cover_external_name
    await db.commit()
    
    presigned_url = minio_client.get_presigned_url(cover_external_name)
    
    return FileMetaResponse(
        file_type="cover",
        external_name=cover_external_name,
        original_filename=cover_file.filename,
        file_size=len(cover_data),
        mime_type=cover_file.content_type or "image/jpeg",
        presigned_url=presigned_url or ""
    )



