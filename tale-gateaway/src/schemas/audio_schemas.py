from pydantic import BaseModel
from typing import Optional

class FileMetaResponse(BaseModel):
    file_type: str  # "audio" or "cover"
    external_name: str
    original_filename: str
    file_size: int
    mime_type: str
    presigned_url: str

class FileDownloadResponse(BaseModel):
    external_name: str
    presigned_url: str

class UploadResponse(BaseModel):
    fairy_tale_external_id: str
    audio_meta: Optional[FileMetaResponse] = None
    cover_meta: Optional[FileMetaResponse] = None
