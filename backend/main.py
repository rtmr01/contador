from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import users, projects, postos, videos, counts

# Cria as tabelas no banco de dados (se não existirem)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API do Contador de Veículos")

# Passo 5 embutido: Configuração de CORS para permitir requisições do Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Na produção, substituiríamos "*" pelo domínio da Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrando os "Controllers" (Rotas Modularizadas)
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(postos.router, prefix="/postos", tags=["Postos"])
app.include_router(videos.router, prefix="/videos", tags=["Videos"])
app.include_router(counts.router, prefix="/counts", tags=["Counts"])

@app.get("/")
def root():
    return {"message": "API do Contador de Tráfego funcionando!"}
