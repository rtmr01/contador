from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.PostoResponse, status_code=status.HTTP_201_CREATED)
def create_posto(posto: schemas.PostoCreate, db: Session = Depends(get_db)):
    """
    Cria um novo Posto associado a um Projeto.
    """
    db_project = db.query(models.Project).filter(models.Project.id == posto.project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
        
    db_posto = models.Posto(**posto.model_dump())
    db.add(db_posto)
    db.commit()
    db.refresh(db_posto)
    return db_posto

@router.get("/project/{project_id}", response_model=List[schemas.PostoResponse])
def get_postos_by_project(project_id: int, db: Session = Depends(get_db)):
    """
    Lista todos os Postos de um Projeto específico.
    """
    postos = db.query(models.Posto).filter(models.Posto.project_id == project_id).all()
    return postos
