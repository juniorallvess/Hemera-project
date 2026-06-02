"""Cálculo e persistência de baselines comportamentais."""
import logging
import math
from datetime import datetime, timedelta

from hemera.config import BASELINE_JANELA_DIAS
from hemera.database import execute, fetchall, fetchone

log = logging.getLogger(__name__)


def calcular_baseline(morador_id: int, janela_dias: int = BASELINE_JANELA_DIAS) -> list[dict]:
    """
    Agrega leituras dos últimos `janela_dias` dias por cômodo×tipo_sensor.
    Retorna lista de dicts {comodo_id, metrica, valor_medio, desvio_padrao}.
    """
    # Baseline sobre os primeiros N dias de dados (comportamento normal)
    ini_row = fetchone("SELECT MIN(registrado_em) AS t FROM leituras")
    ini = ini_row["t"] if ini_row and ini_row["t"] else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    desde = ini
    ate = (datetime.fromisoformat(ini) + timedelta(days=janela_dias)).strftime("%Y-%m-%d %H:%M:%S")

    # Presença: pondera cada leitura pela probabilidade de presença do morador
    # no cômodo×hora (padroes_comportamentais). Cômodos sem padrão saem fora.
    rows = fetchall("""
        SELECT
            s.comodo_id,
            ts.codigo AS metrica,
            CAST(strftime('%H', l.registrado_em) AS INTEGER) AS hora,
            SUM(pc.valor * l.valor) / SUM(pc.valor) AS media,
            SUM(pc.valor * l.valor * l.valor) / SUM(pc.valor)
                - (SUM(pc.valor * l.valor) / SUM(pc.valor))
                * (SUM(pc.valor * l.valor) / SUM(pc.valor)) AS variancia,
            COUNT(*) AS n
        FROM leituras l
        JOIN sensores s       ON l.sensor_id = s.id
        JOIN tipos_sensor ts  ON s.tipo_sensor_id = ts.id
        JOIN padroes_comportamentais pc
            ON pc.comodo_id     = s.comodo_id
           AND pc.morador_id    = ?
           AND pc.metrica       = 'presenca'
           AND pc.janela_inicio = strftime('%H', l.registrado_em) || ':00'
        WHERE l.registrado_em >= ?
          AND l.registrado_em < ?
          AND s.ativo = 1
        GROUP BY s.comodo_id, ts.codigo, hora
        HAVING SUM(pc.valor) > 0
    """, (morador_id, desde, ate))

    resultado = []
    for r in rows:
        variancia = max(0.0, r["variancia"] or 0.0)
        resultado.append({
            "comodo_id":     r["comodo_id"],
            "metrica":       r["metrica"],
            "hora":          r["hora"],
            "valor_medio":   r["media"],
            "desvio_padrao": math.sqrt(variancia),
        })
    return resultado


def salvar_baseline(morador_id: int, janela_dias: int = BASELINE_JANELA_DIAS) -> int:
    """
    Calcula e persiste baseline. Retorna número de linhas inseridas.
    """
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    baselines = calcular_baseline(morador_id, janela_dias)

    for b in baselines:
        execute("""
            INSERT INTO baselines (morador_id, comodo_id, metrica, hora, valor_medio, desvio_padrao, calculado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(morador_id, comodo_id, metrica, hora) DO UPDATE SET
                valor_medio   = excluded.valor_medio,
                desvio_padrao = excluded.desvio_padrao,
                calculado_em  = excluded.calculado_em
        """, (morador_id, b["comodo_id"], b["metrica"], b["hora"],
              b["valor_medio"], b["desvio_padrao"], agora))

    log.debug("Baseline salvo: morador=%d linhas=%d", morador_id, len(baselines))
    return len(baselines)


def baseline_mais_recente(morador_id: int, comodo_id: int, metrica: str) -> dict | None:
    """Retorna o baseline mais recente para morador×cômodo×métrica."""
    return fetchone("""
        SELECT id, valor_medio, desvio_padrao
        FROM baselines
        WHERE morador_id = ? AND comodo_id = ? AND metrica = ?
        ORDER BY calculado_em DESC
        LIMIT 1
    """, (morador_id, comodo_id, metrica))
