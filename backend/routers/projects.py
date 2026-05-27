from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import quote
from datetime import datetime
import zipfile
import io

import models, schemas
from database import get_db
from services.planilha_service import generate_excel_from_counts

router = APIRouter()

@router.post("/", response_model=schemas.ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    """Cria uma nova rodovia/projeto vinculada a um usuário específico"""
    
    # 1. Segurança: Verifica se o usuário que está tentando criar o projeto realmente existe no banco
    user = db.query(models.User).filter(models.User.id == project.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado. Impossível criar projeto.")

    # 2. Salva o projeto vinculando-o ao ID do usuário
    new_project = models.Project(
        name=project.name, 
        description=project.description,
        user_id=project.user_id
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/user/{user_id}", response_model=List[schemas.ProjectResponse])
def get_projects_by_user(user_id: int, db: Session = Depends(get_db)):
    """Lista apenas as rodovias/projetos que pertencem ao usuário logado"""
    projects = db.query(models.Project).filter(models.Project.user_id == user_id).all()
    return projects

@router.get("/{project_id}/export")
def export_project_spreadsheets(project_id: int, db: Session = Depends(get_db)):
    """
    Exporta todas as planilhas do projeto de uma só vez.
    Gera um arquivo .zip contendo uma planilha .xlsx por Posto.
    """
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
        
    postos = db.query(models.Posto).filter(models.Posto.project_id == project_id).all()
    if not postos:
        raise HTTPException(status_code=400, detail="Este projeto não possui nenhum posto cadastrado.")
        
    # Prepara o buffer para o ZIP em memória
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for posto in postos:
            videos = db.query(models.Video).filter(models.Video.posto_id == posto.id).all()
            
            video_data_list = []
            for video in videos:
                counts = db.query(models.CountEvent).filter(models.CountEvent.video_id == video.id).all()
                video_data_list.append({
                    "start_time": video.start_datetime or datetime.now(),
                    "counts": counts
                })
                
            # Chama o serviço passando a lista de vídeos daquele posto
            excel_buffer = generate_excel_from_counts(
                posto_name=posto.name,
                rodovia=posto.rodovia,
                video_data_list=video_data_list
            )
            
            # Adiciona o arquivo Excel dentro do ZIP
            filename = f"planilha_{posto.name.replace(' ', '_')}.xlsx"
            zip_file.writestr(filename, excel_buffer.getvalue())
            
    zip_buffer.seek(0)
    zip_filename = f"exportacao_{project.name.replace(' ', '_')}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(zip_filename)}"}
    )
