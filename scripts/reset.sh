#!/usr/bin/env bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

echo "[hemera] Encerrando processos..."
pkill -f "uvicorn hemera.main:app" 2>/dev/null || true
pkill -f "simulador.simulador"      2>/dev/null || true

echo "[hemera] Removendo banco..."
rm -f "$ROOT/db/hemera.db"

echo "[hemera] Estado limpo."
