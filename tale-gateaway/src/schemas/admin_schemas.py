from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    id: int
    username: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class AdminToken(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class AdminRefreshToken(BaseModel):
    refresh_token: str

class AdminTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


