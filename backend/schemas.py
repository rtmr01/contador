from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- Usuários ---
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# --- Projetos ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    user_id: int

class ProjectResponse(ProjectBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Postos ---
class PostoBase(BaseModel):
    name: str
    rodovia: str

class PostoCreate(PostoBase):
    project_id: int

class PostoResponse(PostoBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Vídeos ---
class VideoBase(BaseModel):
    filename: str
    status: str = "Pendente"

class VideoCreate(VideoBase):
    posto_id: int
    start_datetime: Optional[datetime] = None

class VideoStateUpdate(BaseModel):
    current_time: float

class VideoResponse(VideoBase):
    id: int
    posto_id: int
    current_time: float
    start_datetime: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Eventos de Contagem ---
class CountEventCreate(BaseModel):
    vehicle_type: str
    video_timestamp: float
    direction: str

class CountEventResponse(CountEventCreate):
    id: int
    video_id: int
    real_timestamp: datetime

    class Config:
        from_attributes = True
