from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Caminho para o banco SQLite na pasta atual do backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "contador.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# Configuração do engine para SQLite
# check_same_thread=False é necessário no SQLite com FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Fábrica de sessões do banco de dados
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe base para os nossos modelos
Base = declarative_base()

# Dependência para injetar a sessão do banco de dados nas rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
