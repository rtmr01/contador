from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import quote
from datetime import datetime

import models, schemas
from database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.VideoResponse, status_code=status.HTTP_201_CREATED)
def create_video(video: schemas.VideoCreate, db: Session = Depends(get_db)):
    """Inicia a referência de um novo vídeo para um posto"""
    db_posto = db.query(models.Posto).filter(models.Posto.id == video.posto_id).first()
    if not db_posto:
        raise HTTPException(status_code=404, detail="Posto não encontrado.")

    new_video = models.Video(
        filename=video.filename,
        posto_id=video.posto_id,
        start_datetime=video.start_datetime
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)
    return new_video

@router.get("/posto/{posto_id}", response_model=List[schemas.VideoResponse])
def get_videos_by_posto(posto_id: int, db: Session = Depends(get_db)):
    """Lista os vídeos vinculados a um posto específico"""
    videos = db.query(models.Video).filter(models.Video.posto_id == posto_id).all()
    return videos

@router.get("/{video_id}", response_model=schemas.VideoResponse)
def get_video_state(video_id: int, db: Session = Depends(get_db)):
    """
    O CORAÇÃO DO FALLBACK (F5): 
    Quando o usuário atualizar a página (F5) ou upar o vídeo no novo PC, 
    o Frontend chamará esta rota para saber exatamente qual é o 'current_time' (segundo exato).
    """
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado.")
    return video

@router.patch("/{video_id}/time", response_model=schemas.VideoResponse)
def update_video_time(video_id: int, time_update: schemas.VideoStateUpdate, db: Session = Depends(get_db)):
    """
    O HEARTBEAT DE PROGRESSO:
    Para que o usuário não reinicie do zero no F5, o Frontend chamará esta rota 
    (em background e de forma silenciosa) a cada 5 segundos que o vídeo toca, 
    apenas atualizando o relógio do banco de dados em tempo real.
    """
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado.")
    
    video.current_time = time_update.current_time
    db.commit()
    db.refresh(video)
    return video


