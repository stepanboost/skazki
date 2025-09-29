from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AnonymousSession(BaseModel):
    session_id: str
    created_at: datetime
    last_activity: datetime
    is_active: bool = True
    revoked: bool = False

class SessionCreate(BaseModel):
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None

class SessionResponse(BaseModel):
    session_id: str
    access_token: str
    token_type: str = "bearer"

