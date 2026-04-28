# Fase 8 - Contagem Interativa Manual

Esta fase foi criada para contornar problemas de detecção noturna com IAs e fornecer uma interface moderna e premium para contagem de veículos manual de forma ágil, utilizando atalhos do teclado. O resultado final é a mesma planilha que o YOLO gerava. 

O sistema conta com uma interface desenvolvida em React + Vite e um backend em FastAPI.

## Funcionalidades
- **Upload Local de Vídeos**: Reproduza vídeos na interface sem necessitar de envio demorado para o backend.
- **Teclas de Atalho Customizadas**: Adicione veículos apenas apertando teclas predefinidas (ex: `Q` para Carro, `W` para Moto).
- **Remoção de Contagem com Shift**: Pressione `Shift + Tecla` para remover a última contagem adicionada daquele veículo, ou clique na lixeira no histórico.
- **Timeline Interativa**: Avançe 5 segundos (`Seta para Direita`), volte 5 segundos (`Seta para Esquerda`) ou pause com `Espaço`.
- **Controle de Velocidade**: Assista o vídeo acelerado (2x, 4x) para terminar a contagem mais rápido.
- **Integração Sonora (Moondream Fake)**: O sistema avisa em voz alta quando o vídeo finaliza e quando o relatório é salvo, simulando a IA falando.
- **Exportação Igual à Fase 6**: Gera a matriz pivotada num arquivo CSV a cada 15 minutos, baseada na data real de início configurada.

## Como Executar

Você precisará abrir dois terminais, um para o Frontend e outro para o Backend.

### 1. Iniciar o Backend (Python)
No primeiro terminal, entre na pasta do backend e instale os pacotes necessários:
```bash
cd fase8/backend
pip install -r requirements.txt
python main.py
```
O servidor rodará na porta 8000.

### 2. Iniciar o Frontend (React)
No segundo terminal, instale as dependências e rode o Vite:
```bash
cd fase8/frontend
npm install
npm run dev
```
O frontend irá abrir no navegador com a interface interativa. Acesse `http://localhost:5173`.

## Uso dos Atalhos

| Veículo | Tecla | Veículo | Tecla |
| --- | --- | --- | --- |
| Carro | **Q** | 3C | **A** |
| moto | **W** | 2S1 | **S** |
| 2CB | **E** | 4C | **D** |
| 3CB | **R** | 2S2 | **F** |
| 4CB | **T** | 3S1 | **G** |
| Onibus 5 eixos | **Y** | 2S3 | **H** |
| Onibus 6 eixos | **U** | 3S2 | **J** |
| Onibus 7 eixos | **I** | 3S3 | **K** |
| Onibus 8 eixos | **O** | 3T4 | **L** |
| 2C | **P** | Caminhao 8 eixos | **Z** |

> Dica: Pressione `Shift` junto da tecla para **subtrair** um veículo.
