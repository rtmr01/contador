from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models, schemas
from database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Cria um novo usuário no banco de dados"""
    # 1. Verifica se o username já existe para não criar duplicado
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Usuário já cadastrado.")
    
    # 2. Salva no banco
    new_user = models.User(username=user.username, password=user.password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user) # Atualiza a variável para pegarmos o "ID" que o banco gerou
    return new_user

@router.get("/", response_model=List[schemas.UserResponse])
def get_users(db: Session = Depends(get_db)):
    """Lista todos os usuários cadastrados"""
    users = db.query(models.User).all()
    return users

@router.post("/login")
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Valida o usuário e senha (substitui o login estático do React)"""
    db_user = db.query(models.User).filter(
        models.User.username == user.username,
        models.User.password == user.password
    ).first()
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")
    
    # Retornamos o ID do usuário, pois precisaremos dele para criar os Projetos depois!
    return {"message": "Login aprovado", "user_id": db_user.id, "username": db_user.username}
