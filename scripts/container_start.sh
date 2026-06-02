#!/usr/bin/env bash
set -euo pipefail
cd /app
CENARIO="${CENARIO:-luto}"
DIAS="${DIAS:-16}"
SEED="${SEED:-42}"
REPLAY_PASSO="${REPLAY_PASSO:-60}"
echo "[hemera] init_db..."
python scripts/init_db.py
echo "[hemera] populando (cenario=$CENARIO dias=$DIAS seed=$SEED)..."
python -m simulador.simulador --cenario "$CENARIO" --dias "$DIAS" \
    --velocidade 0 --passo 15 --seed "$SEED"
echo "[hemera] replay (passo=$REPLAY_PASSO seed=$SEED)..."
python -m hemera.motor "$REPLAY_PASSO" "$SEED"
echo "[hemera] servindo em 0.0.0.0:8000"
exec uvicorn hemera.main:app --host 0.0.0.0 --port 8000
