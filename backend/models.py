from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False) # Em um app real seria hash, aqui podemos guardar simples ou hash

    projects = relationship("Project", back_populates="user")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="projects")
    postos = relationship("Posto", back_populates="project", cascade="all, delete-orphan")

class Posto(Base):
    __tablename__ = "postos"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    rodovia = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="postos")
    videos = relationship("Video", back_populates="posto", cascade="all, delete-orphan")

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    posto_id = Column(Integer, ForeignKey("postos.id"), nullable=False)
    filename = Column(String, nullable=False)
    start_datetime = Column(DateTime, nullable=True) # Data real que a gravação do vídeo começou
    current_time = Column(Float, default=0.0) # Estado atual do vídeo (resumo)
    status = Column(String, default="Pendente") # Pendente, Em Andamento, Concluído
    created_at = Column(DateTime, default=datetime.utcnow)

    posto = relationship("Posto", back_populates="videos")
    count_events = relationship("CountEvent", back_populates="video", cascade="all, delete-orphan")

class CountEvent(Base):
    __tablename__ = "count_events"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    vehicle_type = Column(String, nullable=False)
    video_timestamp = Column(Float, nullable=False) # Momento (em segundos) do vídeo em que ocorreu
    direction = Column(String, nullable=False) # Direção do veículo (ex: "->", "<-", "Norte", "Sul")
    real_timestamp = Column(DateTime, default=datetime.utcnow) # Data e hora real de quando o usuário clicou

    video = relationship("Video", back_populates="count_events")
