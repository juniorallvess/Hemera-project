import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent  # raiz do repositório hemera/
DB_PATH = BASE_DIR / "db" / "hemera.db"
API_PORT = 8000
MOTOR_INTERVAL_SECONDS = 5

_seed_env = os.environ.get("HEMERA_SEED")
SEED: int | None = int(_seed_env) if _seed_env is not None else None

# --- Detecção de desvios (motor) ---
SIGMA_THRESHOLD: float = 2.0        # limiar, em "sigmas", para registrar um desvio
JANELA_DETECCAO_MINUTOS: int = 60   # janela de leituras analisada antes do instante de referência
PROB_CANCELAMENTO: float = 0.15     # fração de intervenções canceladas pelo morador (simulado)
AVALIACAO_TIMEOUT_REAL: int = 8     # segundos reais para avaliar a reação quando o tempo simulado congela

# --- Baseline comportamental ---
# Janela (em dias) para cálculo do baseline. Deve terminar ANTES do onset de
# qualquer cenário anômalo (insônia começa no dia 11) para não contaminar o baseline.
BASELINE_JANELA_DIAS: int = 10
