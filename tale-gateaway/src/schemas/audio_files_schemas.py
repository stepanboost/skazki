from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AudioFileBase(BaseModel):
    original_filename: str
    file_size: Optional[int] = None
    duration: Optional[int] = None
    mime_type: Optional[str] = None

class AudioFileCreate(AudioFileBase):
    external_name: str
    fairy_tale_id: int

class AudioFileResponse(AudioFileBase):
    id: int
    external_name: str
    fairy_tale_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
