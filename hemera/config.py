from pathlib import Path

BASE_DIR = Path(__file__).parent.parent  # raiz do repositório hemera/
DB_PATH = BASE_DIR / "db" / "hemera.db"
API_PORT = 8000
MOTOR_INTERVAL_SECONDS = 5

# Sensor ids que o simulador ignora — ativo=1 mas sem leituras (valida Q04)
# id=24 inserido por fix_demo_data.sql (umidade extra no escritório)
SENSOR_IGNORADOS: list[int] = [24]
