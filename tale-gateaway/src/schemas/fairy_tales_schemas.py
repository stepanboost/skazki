from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from src.database.models import FairyTaleStatus

class FairyTaleBase(BaseModel):
    title: str
    author_name: Optional[str] = None
    description: Optional[str] = None
    content: str
    status: FairyTaleStatus = FairyTaleStatus.DRAFT
    order: int = 0
    tags: Optional[str] = None  # JSON строка
    
    class Config:
        from_attributes = True

class FairyTaleCreate(FairyTaleBase):
    class Config:
        from_attributes = True

class FairyTaleUpdate(BaseModel):
    title: Optional[str] = None
    author_name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    status: Optional[FairyTaleStatus] = None
    order: Optional[int] = None
    tags: Optional[str] = None
    
    class Config:
        from_attributes = True

class FairyTaleResponse(BaseModel):
    id: int
    external_id: str
    title: str
    author_name: Optional[str] = None
    description: Optional[str] = None
    content: str
    audio_external_name: Optional[str] = None
    cover_external_name: Optional[str] = None
    status: FairyTaleStatus
    order: int
    tags: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    author_id: Optional[int] = None
    
    # Дополнительные поля для фронта
    audio_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    audio_duration: Optional[int] = None  # Длительность в секундах
    
    class Config:
        from_attributes = True

class FairyTaleListResponse(BaseModel):
    fairy_tales: List[FairyTaleResponse]