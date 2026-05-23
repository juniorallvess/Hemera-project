# Hemera Dashboard (React + Tailwind)

## Desenvolvimento

Terminal 1 — backend (na raiz do repo, com venv ativo):

```bash
source .venv/bin/activate
pip install -r requirements.txt   # inclui uvicorn[standard] + websockets
uvicorn hemera.main:app --port 8000
```

Se o painel ficar **DESCONECTADO** e o log mostrar `GET /ws 404` ou `No supported WebSocket library`, rode `pip install 'uvicorn[standard]' websockets` e reinicie o Uvicorn.

Terminal 2 — frontend (proxy para API/WS/static):

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173

### Planta e simulação

- **Configurações** (ícone engrenagem): importar planta `.svg`, modo edição para arrastar sensores, iniciar **Demo ao vivo** ou **Batch 30 dias**.
- Com WebSocket conectado, a planta mostra pulsos nos sensores e marcadores dos moradores em movimento.

## Produção

```bash
cd frontend
npm run build
```

Gera `index.html` e `assets/` em `hemera/static/`. Sirva com:

```bash
uvicorn hemera.main:app --port 8000
```

Abra http://localhost:8000
