"""Simulador de telemetria Hemera — entrypoint CLI."""
import argparse
import logging
import os
import random
import sqlite3
import time
from datetime import datetime, timedelta
from pathlib import Path

from simulador.cenarios import CENARIOS, CenarioBase
from simulador.config import BATCH_SIZE, PASSO_PADRAO, SENSOR_IGNORADOS
from simulador.moradores import PerfilMorador, criar_moradores
from simulador.sensores import SENSOR_CLASSES

log = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent
DB_PATH  = BASE_DIR / "db" / "hemera.db"


def carregar_sensores(conn: sqlite3.Connection) -> list[dict]:
    """Retorna sensores ativos, excluindo SENSOR_IGNORADOS (sensores sem leituras para Q04)."""
    rows = conn.execute("""
        SELECT s.id, s.comodo_id, c.nome AS comodo, ts.codigo AS tipo
        FROM sensores s
        JOIN comodos c ON s.comodo_id = c.id
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        WHERE s.ativo = 1
        ORDER BY s.id
    """).fetchall()
    sensores = [{"id": r[0], "comodo_id": r[1], "comodo": r[2], "tipo": r[3]} for r in rows]
    if SENSOR_IGNORADOS:
        sensores = [s for s in sensores if s["id"] not in SENSOR_IGNORADOS]
    return sensores


def popular_padroes_comportamentais(conn: sqlite3.Connection,
                                    moradores: list[PerfilMorador]) -> int:
    """Popula padroes_comportamentais com a probabilidade de presença de cada
    morador por cômodo e hora (fonte da atribuição per-morador do baseline).
    Idempotente: limpa a tabela antes de repovoar. Retorna nº de linhas inseridas.
    """
    comodo_id = {
        nome: cid
        for cid, nome in conn.execute("SELECT id, nome FROM comodos").fetchall()
    }
    conn.execute("DELETE FROM padroes_comportamentais")
    linhas = 0
    for m in moradores:
        for comodo_nome, tabela in m.presenca.items():
            cid = comodo_id.get(comodo_nome)
            if cid is None:
                continue
            for hora, prob in enumerate(tabela):
                conn.execute("""
                    INSERT INTO padroes_comportamentais
                        (morador_id, janela_inicio, janela_fim, comodo_id, metrica, valor)
                    VALUES (?, ?, ?, ?, 'presenca', ?)
                """, (m.morador_id, f"{hora:02d}:00", f"{hora:02d}:59", cid, prob))
                linhas += 1
    conn.commit()
    log.info("padroes_comportamentais populados: %d linhas", linhas)
    return linhas


def simular(dias: int, velocidade: int, cenario_nome: str, passo: int = PASSO_PADRAO, seed: int | None = None) -> None:
    """Loop principal de simulação.

    passo: intervalo em minutos entre leituras (default=15 → ~63k leituras por 30 dias/22 sensores).
    velocidade: minutos simulados consumidos por segundo real; <=0 desativa o throttle (instantâneo).
    """
    if seed is not None:
        random.seed(seed)
        log.info("RNG semeado com seed=%d", seed)
    cenario: CenarioBase = CENARIOS[cenario_nome]()
    moradores: list[PerfilMorador] = criar_moradores()

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")

    sensores = carregar_sensores(conn)
    instancias = {s["tipo"]: SENSOR_CLASSES[s["tipo"]]() for s in sensores
                  if s["tipo"] in SENSOR_CLASSES}
    # Cômodos distintos em ordem fixa → resolução de presença determinística.
    comodos_distintos = sorted({s["comodo"] for s in sensores})

    popular_padroes_comportamentais(conn, moradores)

    inicio = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    total_minutos = dias * 24 * 60
    leituras_buf: list[tuple] = []
    total_inseridas = 0
    ticks = total_minutos // passo

    log.info("Iniciando simulação: cenário=%s dias=%d velocidade=%dx passo=%dmin ticks=%d sensores=%d",
             cenario_nome, dias, velocidade, passo, ticks, len(sensores))

    for minuto in range(0, total_minutos, passo):
        momento = inicio + timedelta(minutes=minuto)
        dia_simulado = minuto // (24 * 60) + 1

        # Resolve a presença UMA vez por cômodo neste tick (coerência entre sensores),
        # aplicando o modificador de cenário de CADA morador à sua própria probabilidade.
        presentes_por_comodo: dict[str, int] = {}
        for comodo_nome in comodos_distintos:
            presentes_por_comodo[comodo_nome] = sum(
                1 for m in moradores
                if random.random() < (
                    m.presenca_em(comodo_nome, momento)
                    * cenario.modificador_presenca(m.morador_id, comodo_nome, momento, dia_simulado)
                )
            )

        for sensor in sensores:
            tipo = sensor["tipo"]
            if tipo not in instancias:
                continue
            comodo_nome = sensor["comodo"]
            presentes = presentes_por_comodo[comodo_nome]

            if tipo == "decibel":
                modificador = sum(
                    cenario.modificador_decibel(m.morador_id, comodo_nome, momento, dia_simulado)
                    for m in moradores
                ) / len(moradores)
            elif tipo == "fluxo_agua":
                modificador = sum(
                    cenario.modificador_fluxo(m.morador_id, comodo_nome, momento, dia_simulado)
                    for m in moradores
                ) / len(moradores)
            else:
                modificador = 1.0

            valor = instancias[tipo].gerar(
                sensor["id"], comodo_nome, momento, presentes, modificador
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

        if velocidade > 0:
            time.sleep(passo / velocidade)

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
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Simulador Hemera")
    parser.add_argument("--cenario",    choices=list(CENARIOS.keys()), default="normal")
    parser.add_argument("--dias",       type=int,  default=30)
    parser.add_argument("--velocidade", type=int,  default=1440,
                        help="Minutos simulados por segundo real (1440≈1 dia simulado/seg; 0=instantâneo, sem throttle)")
    parser.add_argument("--passo",      type=int,  default=PASSO_PADRAO,
                        help="Intervalo em minutos entre leituras (default=15 → ~63k leituras)")
    parser.add_argument("--seed",       type=int,  default=None,
                        help="Semente do RNG para reprodutibilidade (default: env HEMERA_SEED)")
    args = parser.parse_args()
    seed = args.seed if args.seed is not None else (int(os.environ["HEMERA_SEED"]) if os.environ.get("HEMERA_SEED") else None)
    simular(args.dias, args.velocidade, args.cenario, args.passo, seed=seed)


if __name__ == "__main__":
    main()
