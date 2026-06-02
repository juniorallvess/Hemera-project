#!/usr/bin/env bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
VENV="$ROOT/.venv/bin"
REPLAY_PASSO="${REPLAY_PASSO:-60}"

cd "$ROOT"

echo "[hemera] Inicializando banco..."
"$VENV/python" scripts/init_db.py

echo "[hemera] Iniciando servidor FastAPI em background (porta 8000)..."
"$VENV/python" -m uvicorn hemera.main:app --port 8000 &
SERVER_PID=$!
echo "[hemera] Servidor PID=$SERVER_PID"

# Aguarda servidor estar pronto
for i in $(seq 1 10); do
    if curl -sf http://localhost:8000/api/moradores > /dev/null 2>&1; then
        echo "[hemera] Servidor pronto → http://localhost:8000"
        break
    fi
    sleep 1
done

echo "[hemera] Iniciando simulador (cenário=luto, 30 dias, 1440x)..."
"$VENV/python" -m simulador.simulador --cenario luto --dias 30 --velocidade 1440

echo "[demo] Gerando histórico reativo (replay cronológico, passo=${REPLAY_PASSO}min)..."
"$VENV/python" -m hemera.motor "${REPLAY_PASSO}"

echo "[hemera] Simulação concluída."
echo "[hemera] Painel disponível em http://localhost:8000"
echo "[hemera] Pressione Ctrl+C para encerrar o servidor."

wait $SERVER_PID
