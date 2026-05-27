from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db

router = APIRouter()

@router.post("/{video_id}", response_model=schemas.CountEventResponse, status_code=status.HTTP_201_CREATED)
def add_count(video_id: int, count_data: schemas.CountEventCreate, db: Session = Depends(get_db)):
    """Registra um novo veículo contado (Quando o usuário aperta Q, W, E, etc)"""
    
    # 1. Segurança: Garantir que não estamos inserindo dados num vídeo fantasma
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado.")
    
    # 2. Atualiza o progresso (tempo) do vídeo instantaneamente na mesma tacada
    video.current_time = count_data.video_timestamp
    
    # 3. Registra o evento
    new_count = models.CountEvent(
        video_id=video_id,
        vehicle_type=count_data.vehicle_type,
        video_timestamp=count_data.video_timestamp,
        direction=count_data.direction
    )
    db.add(new_count)
    db.commit()
    db.refresh(new_count)
    return new_count

@router.get("/{video_id}", response_model=List[schemas.CountEventResponse])
def get_video_counts(video_id: int, db: Session = Depends(get_db)):
    """
    Busca todo o histórico de contagens de um vídeo.
    Utilizado imediatamente após um recarregamento da página (F5) para remontar a tabela lateral.
    """
    counts = db.query(models.CountEvent).filter(
        models.CountEvent.video_id == video_id
    ).order_by(models.CountEvent.video_timestamp.asc()).all()
    return counts

@router.delete("/{video_id}/last")
def undo_last_count(video_id: int, vehicle_type: str, db: Session = Depends(get_db)):
    """
    Remove a ÚLTIMA contagem feita de um veículo específico.
    Acionado pelo Frontend quando o usuário aperta 'Shift + Tecla'.
    A exclusão aqui é VERDADEIRA (Hard Delete) conforme decidimos na arquitetura!
    """
    
    # Busca a última contagem exata (ordenando pela data/hora real em que foi clicado, de forma decrescente)
    last_count = db.query(models.CountEvent).filter(
        models.CountEvent.video_id == video_id,
        models.CountEvent.vehicle_type == vehicle_type
    ).order_by(models.CountEvent.real_timestamp.desc()).first()

    if not last_count:
        raise HTTPException(status_code=404, detail=f"Nenhum registro de '{vehicle_type}' encontrado para remover.")

    # Remove do banco definitivamente
    db.delete(last_count)
    db.commit()
    return {"message": f"Último registro de '{vehicle_type}' removido com sucesso."}

@router.delete("/record/{count_id}")
def delete_specific_count(count_id: int, db: Session = Depends(get_db)):
    """
    Remove uma contagem específica baseada no ID único dela.
    Acionado pelo Frontend quando o usuário clica no ícone de 'Lixeira' de um registro individual na interface.
    """
    count_record = db.query(models.CountEvent).filter(models.CountEvent.id == count_id).first()
    
    if not count_record:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")

    db.delete(count_record)
    db.commit()
    return {"message": "Registro removido com sucesso."}
