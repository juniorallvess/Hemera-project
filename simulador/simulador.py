"""Simulador de telemetria Hemera — entrypoint CLI."""
import argparse
import logging
import sqlite3
import time
from datetime import datetime, timedelta
from pathlib import Path

from simulador.cenarios import CENARIOS, CenarioBase
from simulador.moradores import PerfilMorador, criar_moradores
from simulador.relogio import RelogioSimulado
from simulador.sensores import SENSOR_CLASSES

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent
DB_PATH  = BASE_DIR / "db" / "hemera.db"

BATCH_SIZE = 500


def carregar_sensores(conn: sqlite3.Connection) -> list[dict]:
    """Retorna sensores ativos, excluindo SENSOR_IGNORADOS (sensores sem leituras para Q04)."""
    try:
        from hemera.config import SENSOR_IGNORADOS
    except ImportError:
        SENSOR_IGNORADOS = []

    rows = conn.execute("""
        SELECT s.id, s.comodo_id, c.nome AS comodo, ts.codigo AS tipo
        FROM sensores s
        JOIN comodos c ON s.comodo_id = c.id
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        WHERE s.ativo = 1
    """).fetchall()
    sensores = [{"id": r[0], "comodo_id": r[1], "comodo": r[2], "tipo": r[3]} for r in rows]
    if SENSOR_IGNORADOS:
        sensores = [s for s in sensores if s["id"] not in SENSOR_IGNORADOS]
    return sensores


def simular(dias: int, velocidade: int, cenario_nome: str, passo: int = 15) -> None:
    """Loop principal de simulação.

    passo: intervalo em minutos entre leituras (default=15 → ~63k leituras por 30 dias/22 sensores).
    """
    cenario: CenarioBase = CENARIOS[cenario_nome]()
    moradores: list[PerfilMorador] = criar_moradores()

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")

    sensores = carregar_sensores(conn)
    instancias = {s["tipo"]: SENSOR_CLASSES[s["tipo"]]() for s in sensores
                  if s["tipo"] in SENSOR_CLASSES}

    inicio = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    relogio = RelogioSimulado(inicio, velocidade)

    total_minutos = dias * 24 * 60
    leituras_buf: list[tuple] = []
    total_inseridas = 0
    ticks = total_minutos // passo

    log.info("Iniciando simulação: cenário=%s dias=%d velocidade=%dx passo=%dmin ticks=%d sensores=%d",
             cenario_nome, dias, velocidade, passo, ticks, len(sensores))

    for minuto in range(0, total_minutos, passo):
        momento = inicio + timedelta(minutes=minuto)
        relogio.data_atual = momento
        dia_simulado = minuto // (24 * 60) + 1

        for sensor in sensores:
            tipo = sensor["tipo"]
            if tipo not in instancias:
                continue

            modificadores = [
                cenario.modificador_presenca(m.morador_id, sensor["comodo"], momento, dia_simulado)
                for m in moradores
            ]
            mod = sum(modificadores) / len(modificadores)

            if tipo == "decibel":
                mod = sum(
                    cenario.modificador_decibel(m.morador_id, sensor["comodo"], momento, dia_simulado)
                    for m in moradores
                ) / len(moradores)
            elif tipo in ("fluxo_agua",):
                mod = sum(
                    cenario.modificador_fluxo(m.morador_id, sensor["comodo"], momento, dia_simulado)
                    for m in moradores
                ) / len(moradores)

            valor = instancias[tipo].gerar(
                sensor["id"], sensor["comodo"], momento, moradores, mod
            )
            leituras_buf.append((sensor["id"], valor, momento.strftime("%Y-%m-%d %H:%M:%S")))

        if len(leituras_buf) >= BATCH_SIZE:
            conn.executemany(
                "INSERT INTO leituras (sensor_id, valor, registrado_em) VALUES (?,?,?)",
                leituras_buf
            )
            conn.commit()
            total_inseridas += len(leituras_buf)
            leituras_buf.clear()

        if velocidade <= 10:
            time.sleep(relogio.tick_real_segundos * passo)

    if leituras_buf:
        conn.executemany(
            "INSERT INTO leituras (sensor_id, valor, registrado_em) VALUES (?,?,?)",
            leituras_buf
        )
        conn.commit()
        total_inseridas += len(leituras_buf)

    conn.close()
    log.info("Simulação concluída: %d leituras inseridas.", total_inseridas)


def main() -> None:
    parser = argparse.ArgumentParser(description="Simulador Hemera")
    parser.add_argument("--cenario",    choices=list(CENARIOS.keys()), default="normal")
    parser.add_argument("--dias",       type=int,  default=30)
    parser.add_argument("--velocidade", type=int,  default=1440,
                        help="Fator de aceleração (1=tempo real, 1440=1dia/min)")
    parser.add_argument("--passo",      type=int,  default=15,
                        help="Intervalo em minutos entre leituras (default=15 → ~63k leituras)")
    args = parser.parse_args()
    simular(args.dias, args.velocidade, args.cenario, args.passo)


if __name__ == "__main__":
    main()
