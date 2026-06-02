#!/usr/bin/env python3
"""Suíte de regressão: trava invariantes do Hemera e mede o tempo de geração.

Reconstrói o banco, roda o simulador (determinístico) duas vezes para checar
reprodutibilidade, executa o replay cronológico e valida um conjunto de
invariantes. Sai com código 0 se todas passarem, 1 caso contrário.
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from hemera.database import fetchone, fetchall  # noqa: E402
from hemera.motor import replay       # noqa: E402

# Máximo de desvios fisicamente possíveis numa única janela (moradores × baselines).
LIMITE_DESVIO_JANELA = 80


def _reset_db() -> None:
    db = ROOT / "db" / "hemera.db"
    for suf in ("", "-wal", "-shm"):
        p = Path(str(db) + suf)
        if p.exists():
            p.unlink()
    subprocess.run([sys.executable, str(ROOT / "scripts" / "init_db.py")],
                   cwd=str(ROOT), check=True, capture_output=True)


def _rodar_simulador(cenario: str, dias: int, passo: int, seed: int) -> float:
    t0 = time.monotonic()
    subprocess.run(
        [sys.executable, "-m", "simulador.simulador",
         "--cenario", cenario, "--dias", str(dias),
         "--velocidade", "0", "--passo", str(passo), "--seed", str(seed)],
        cwd=str(ROOT), check=True, capture_output=True,
    )
    return time.monotonic() - t0


def _telemetria() -> tuple:
    row = fetchone("SELECT ROUND(SUM(valor),4) AS s, COUNT(*) AS n FROM leituras")
    return (row["s"], row["n"])


def _fingerprint_reativo() -> tuple:
    iv = fetchone("SELECT COUNT(*) AS n FROM intervencoes")["n"]
    rec = tuple((r["tipo_reacao"], r["c"]) for r in fetchall(
        "SELECT tipo_reacao, COUNT(*) AS c FROM reacoes "
        "GROUP BY tipo_reacao ORDER BY tipo_reacao"))
    return (iv, rec)


def main() -> int:
    ap = argparse.ArgumentParser(description="Suíte de regressão do Hemera.")
    ap.add_argument("--cenario", default="luto")
    ap.add_argument("--dias", type=int, default=16)
    ap.add_argument("--passo", type=int, default=15)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--replay-passo", type=int, default=120)
    ap.add_argument("--replay-seed", type=int, default=7)
    args = ap.parse_args()

    resultados: list[tuple[str, bool, str]] = []

    # I1 — determinismo de telemetria (duas execuções idênticas).
    _reset_db()
    t1 = _rodar_simulador(args.cenario, args.dias, args.passo, args.seed)
    tele1 = _telemetria()
    _reset_db()
    t2 = _rodar_simulador(args.cenario, args.dias, args.passo, args.seed)
    tele2 = _telemetria()
    resultados.append((
        "I1 determinismo de telemetria (2 execuções idênticas)",
        tele1 == tele2,
        f"{tele1} vs {tele2}",
    ))

    # Replay cronológico: gera baselines + desvios + intervenções + reações.
    t0 = time.monotonic()
    resumo = replay(passo_min=args.replay_passo, seed=args.replay_seed)
    t_replay = time.monotonic() - t0

    fp1 = _fingerprint_reativo()

    # I2 — desvios sem duplicação (espalhados; sem pico numa única janela).
    d_ts = fetchone("SELECT COUNT(DISTINCT detectado_em) AS n FROM desvios_detectados")["n"]
    d_max = fetchone(
        "SELECT MAX(c) AS m FROM "
        "(SELECT COUNT(*) AS c FROM desvios_detectados GROUP BY detectado_em)"
    )["m"] or 0
    resultados.append((
        "I2 desvios sem duplicação (espalhados; sem pico numa única janela)",
        d_ts > 1 and d_max <= LIMITE_DESVIO_JANELA,
        f"timestamps_distintos={d_ts} max_por_janela={d_max} (limite {LIMITE_DESVIO_JANELA})",
    ))

    # I3 — baselines distintos entre moradores (fim do agregado replicado).
    div = fetchone(
        "SELECT COUNT(*) AS n FROM ("
        " SELECT comodo_id, metrica FROM baselines"
        " GROUP BY comodo_id, metrica"
        " HAVING COUNT(DISTINCT ROUND(valor_medio, 6)) > 1)"
    )["n"]
    resultados.append((
        "I3 baselines distintos entre moradores",
        div > 0,
        f"combinacoes_comodo_metrica_divergentes={div}",
    ))

    # I4 — baselines sem crescimento (1 linha por morador×cômodo×métrica).
    tot = fetchone("SELECT COUNT(*) AS n FROM baselines")["n"]
    uni = fetchone(
        "SELECT COUNT(*) AS n FROM "
        "(SELECT 1 FROM baselines GROUP BY morador_id, comodo_id, metrica, hora)"
    )["n"]
    resultados.append((
        "I4 baselines sem crescimento (chave única)",
        tot == uni,
        f"linhas={tot} chaves_unicas={uni}",
    ))

    # I5 — intervenções distribuídas em múltiplos dias.
    iv_dias = fetchone(
        "SELECT COUNT(DISTINCT substr(executada_em,1,10)) AS n FROM intervencoes"
    )["n"]
    resultados.append((
        "I5 intervencoes distribuidas em multiplos dias",
        iv_dias > 1,
        f"dias_distintos={iv_dias} total={resumo['intervencoes']}",
    ))

    # I6 — uma reação por intervenção.
    n_iv = fetchone("SELECT COUNT(*) AS n FROM intervencoes")["n"]
    n_re = fetchone("SELECT COUNT(*) AS n FROM reacoes")["n"]
    resultados.append((
        "I6 uma reacao por intervencao",
        n_iv == n_re,
        f"intervencoes={n_iv} reacoes={n_re}",
    ))

    # I7 — Q04 coerente (sensor 24 cadastrado e sem leitura).
    s24 = fetchone("SELECT COUNT(*) AS n FROM sensores WHERE id = 24")["n"]
    l24 = fetchone("SELECT COUNT(*) AS n FROM leituras WHERE sensor_id = 24")["n"]
    resultados.append((
        "I7 Q04 coerente (sensor 24 sem leitura)",
        s24 == 1 and l24 == 0,
        f"sensor24_existe={s24} leituras_sensor24={l24}",
    ))

    # I8 — replay reprodutível: segundo ciclo na mesma telemetria reproduz o fingerprint reativo.
    _reset_db()
    _rodar_simulador(args.cenario, args.dias, args.passo, args.seed)
    replay(passo_min=args.replay_passo, seed=args.replay_seed)
    fp2 = _fingerprint_reativo()
    resultados.append((
        "I8 replay reprodutivel (mesma seed ⇒ mesmo fingerprint reativo)",
        fp1 == fp2,
        f"fp1={fp1} fp2={fp2}",
    ))

    print("=" * 64)
    print(f"Cenario={args.cenario} dias={args.dias} passo={args.passo} "
          f"seed={args.seed} replay_passo={args.replay_passo}")
    print(f"Geracao: {t1:.2f}s / {t2:.2f}s | Replay: {t_replay:.2f}s | "
          f"resumo_replay={resumo}")
    print("-" * 64)
    todas_ok = True
    for nome, ok, detalhe in resultados:
        print(f"[{'OK  ' if ok else 'FALHA'}] {nome} :: {detalhe}")
        todas_ok = todas_ok and ok
    print("-" * 64)
    print("RESULTADO:", "PASS" if todas_ok else "FAIL")
    return 0 if todas_ok else 1


if __name__ == "__main__":
    sys.exit(main())
