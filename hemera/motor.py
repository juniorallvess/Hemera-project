"""Motor de detecção de desvios e disparo de intervenções."""
import asyncio
import logging
import math
import random
import time
from datetime import datetime, timedelta

from hemera.baseline import salvar_baseline
from hemera.config import MOTOR_INTERVAL_SECONDS
from hemera.database import fetchall, fetchone
from hemera.intervencoes import (ajustar_peso, executar_intervencao,
                                  registrar_reacao, verificar_e_criar_bloqueio,
                                  cancelar_intervencao_simulada)

log = logging.getLogger(__name__)

SIGMA_THRESHOLD = 2.0    # desvio > 2σ dispara detecção
JANELA_ULTIMA_HORA = 60  # minutos
PROB_CANCELAMENTO = 0.15 # 15% das intervenções são canceladas pelo morador
# Em simulação batch o relógio simulado congela; avaliar após N segundos reais
AVALIACAO_TIMEOUT_REAL = 8

# Intervenções aguardando avaliação de reação
# intervencao_id -> {morador_id, cena_id, comodo_id, desvio_id, avaliar_apos}
_pendentes: dict[int, dict] = {}


def _tempo_simulado_atual() -> str | None:
    """Retorna o timestamp mais recente das leituras (tempo simulado)."""
    row = fetchone("SELECT MAX(registrado_em) AS t FROM leituras")
    return row["t"] if row else None


def _stats_ultima_hora(comodo_id: int, tipo: str,
                        ref: str | None = None) -> tuple[float, int] | None:
    """
    Retorna (média, n_amostras) das leituras do cômodo×tipo na hora anterior a ref.
    Se ref=None, usa MAX(registrado_em).
    """
    if ref is None:
        ref = _tempo_simulado_atual()
    if not ref:
        return None
    row = fetchone("""
        SELECT AVG(l.valor) AS media, COUNT(*) AS n
        FROM leituras l
        JOIN sensores s   ON l.sensor_id = s.id
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        WHERE s.comodo_id = ? AND ts.codigo = ?
          AND l.registrado_em >= DATETIME(?, '-60 minutes')
          AND l.registrado_em <= ?
    """, (comodo_id, tipo, ref, ref))
    if not row or row["media"] is None or row["n"] == 0:
        return None
    return (row["media"], row["n"])


def detectar_desvios() -> list[int]:
    """
    Compara média última hora vs baseline para cada morador×cômodo×métrica.
    INSERT em desvios_detectados quando intensidade > SIGMA_THRESHOLD.
    Retorna lista de desvio_ids inseridos.
    """
    moradores = fetchall("SELECT id FROM moradores")
    agora = _tempo_simulado_atual() or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    desvios_inseridos: list[int] = []

    for m in moradores:
        mid = m["id"]
        baselines = fetchall("""
            SELECT b.id, b.comodo_id, b.metrica, b.valor_medio, b.desvio_padrao
            FROM baselines b
            WHERE b.morador_id = ?
            ORDER BY b.calculado_em DESC
        """, (mid,))

        vistos: set[tuple] = set()
        for b in baselines:
            chave = (b["comodo_id"], b["metrica"])
            if chave in vistos:
                continue
            vistos.add(chave)

            stats = _stats_ultima_hora(b["comodo_id"], b["metrica"])
            if stats is None:
                continue
            media_atual, n_amostras = stats

            dp = b["desvio_padrao"] or 0.1
            # t-statistic: compara média observada vs baseline usando erro padrão
            se = dp / math.sqrt(max(n_amostras, 1))
            intensidade = abs(media_atual - b["valor_medio"]) / se

            if intensidade > SIGMA_THRESHOLD:
                with __import__("hemera.database", fromlist=["get_connection"]).get_connection() as conn:
                    cur = conn.execute("""
                        INSERT INTO desvios_detectados
                            (morador_id, comodo_id, baseline_id, intensidade, detectado_em)
                        VALUES (?, ?, ?, ?, ?)
                    """, (mid, b["comodo_id"], b["id"], intensidade, agora))
                    desvio_id = cur.lastrowid

                log.info("Desvio detectado id=%d morador=%d cômodo=%d métrica=%s σ=%.2f",
                         desvio_id, mid, b["comodo_id"], b["metrica"], intensidade)
                desvios_inseridos.append(desvio_id)

    return desvios_inseridos


def resolver_cena(morador_id: int, comodo_id: int) -> int | None:
    """
    Escolhe cena candidata: filtra bloqueios, ordena por peso decrescente.
    Retorna cena_id ou None.
    """
    agora = _tempo_simulado_atual() or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    row = fetchone("""
        SELECT c.id
        FROM cenas c
        LEFT JOIN aprendizado_pesos ap ON ap.cena_id = c.id AND ap.morador_id = ?
        LEFT JOIN bloqueios_temporarios bt ON bt.cena_id = c.id AND bt.morador_id = ?
            AND bt.ate > ?
        WHERE c.ativa = 1
          AND bt.id IS NULL
          AND EXISTS (
              SELECT 1 FROM cena_dispositivo cd
              JOIN dispositivos d ON d.tipo_dispositivo_id = cd.tipo_dispositivo_id
                                  AND d.comodo_id = ? AND d.ativo = 1
              WHERE cd.cena_id = c.id
          )
        ORDER BY COALESCE(ap.peso, 1.0) DESC
        LIMIT 1
    """, (morador_id, morador_id, agora, comodo_id))
    return row["id"] if row else None


def registrar_pendente(intervencao_id: int, morador_id: int, cena_id: int,
                       comodo_id: int, desvio_id: int, executada_em: str) -> None:
    """Registra intervenção para avaliação futura (10 min simulados ou 8s reais)."""
    avaliar_apos = (
        datetime.fromisoformat(executada_em) + timedelta(minutes=10)
    ).strftime("%Y-%m-%d %H:%M:%S")
    _pendentes[intervencao_id] = {
        "morador_id": morador_id,
        "cena_id": cena_id,
        "comodo_id": comodo_id,
        "desvio_id": desvio_id,
        "avaliar_apos": avaliar_apos,
        "criado_em_real": time.monotonic(),
    }


# Ciclo atual do motor (atualizado em loop_motor)
_ciclo_atual: int = 0


def avaliar_reacoes_pendentes() -> None:
    """
    Avalia intervenções cujo prazo de 10 min simulados já passou.
    Decide reação com base na persistência do desvio:
    - Se status='cancelada' → ajusta peso -0.2 + verifica bloqueio
    - Se desvio reduziu → 'aceite_implicito' + ajuste peso +0.1
    - Se desvio persiste → 'ignorada'
    """
    agora_sim = _tempo_simulado_atual()
    if not agora_sim:
        return

    concluidas = []
    agora_real = time.monotonic()
    for interv_id, info in _pendentes.items():
        tempo_sim_ok = agora_sim >= info["avaliar_apos"]
        tempo_real_ok = (agora_real - info.get("criado_em_real", 0)) >= AVALIACAO_TIMEOUT_REAL
        if not (tempo_sim_ok or tempo_real_ok):
            continue

        interv = fetchone("SELECT status FROM intervencoes WHERE id=?", (interv_id,))
        if not interv:
            concluidas.append(interv_id)
            continue

        if interv["status"] == "cancelada":
            # Reação já foi registrada em cancelar_intervencao_simulada
            ajustar_peso(info["morador_id"], info["cena_id"], -0.2)
            verificar_e_criar_bloqueio(info["morador_id"], info["cena_id"], agora_sim)
        else:
            # Verifica se desvio reduziu após intervenção
            desvio = fetchone(
                "SELECT baseline_id, intensidade FROM desvios_detectados WHERE id=?",
                (info["desvio_id"],)
            )
            tipo_reacao = _decidir_reacao(info, desvio)
            registrar_reacao(interv_id, tipo_reacao, agora_sim)
            if tipo_reacao == "aceite_implicito":
                ajustar_peso(info["morador_id"], info["cena_id"], +0.1)

        concluidas.append(interv_id)

    for interv_id in concluidas:
        del _pendentes[interv_id]


def _decidir_reacao(info: dict, desvio: dict | None) -> str:
    """Decide tipo de reação com base na comparação desvio original vs atual.

    Avalia leituras na janela de 10-70 min após a intervenção (avaliar_apos),
    não no tempo simulado corrente, para evitar distorção em simulações em batch.
    Se desvio persiste, usa probabilidade inversamente proporcional à intensidade:
    desvios leves (próximos a 2σ) têm maior resposta a intervenções.
    """
    if not desvio:
        return "aceite_implicito"

    baseline = fetchone(
        "SELECT valor_medio, desvio_padrao, metrica FROM baselines WHERE id=?",
        (desvio["baseline_id"],)
    )
    if not baseline:
        return "aceite_implicito"

    # Usa avaliar_apos como referência temporal para evitar distorção batch
    ref_ts = info.get("avaliar_apos")
    stats = _stats_ultima_hora(info["comodo_id"], baseline["metrica"], ref_ts)
    if not stats:
        # Sem leituras no período — assume que intervenção foi aceita
        return "aceite_implicito"

    media_atual, n = stats
    dp = baseline["desvio_padrao"] or 0.1
    se = dp / math.sqrt(max(n, 1))
    intensidade_atual = abs(media_atual - baseline["valor_medio"]) / se

    if intensidade_atual < desvio["intensidade"] * 0.7:
        return "aceite_implicito"

    # Desvio persiste — desvios leves respondem melhor (prob decai com intensidade)
    prob_aceite = max(0.0, 0.85 - (desvio["intensidade"] - SIGMA_THRESHOLD) * 0.12)
    if random.random() < prob_aceite:
        return "aceite_implicito"

    return "ignorada"


async def loop_motor() -> None:
    """Task assíncrona: roda a cada MOTOR_INTERVAL_SECONDS."""
    # Aguarda DB estar pronto
    await asyncio.sleep(2)

    # Calcula baselines iniciais
    moradores = fetchall("SELECT id FROM moradores")
    for m in moradores:
        try:
            salvar_baseline(m["id"])
        except Exception as e:
            log.warning("Baseline inicial falhou morador=%d: %s", m["id"], e)

    global _ciclo_atual
    while True:
        try:
            _ciclo_atual += 1
            # Recalcula baseline a cada 100 ciclos (~8 min)
            if _ciclo_atual % 100 == 0:
                for m in moradores:
                    salvar_baseline(m["id"])

            # Avalia reações de intervenções anteriores
            avaliar_reacoes_pendentes()

            desvios = detectar_desvios()
            agora = _tempo_simulado_atual() or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            for desvio_id in desvios:
                desvio = fetchone(
                    "SELECT morador_id, comodo_id FROM desvios_detectados WHERE id=?",
                    (desvio_id,)
                )
                if not desvio:
                    continue
                cena_id = resolver_cena(desvio["morador_id"], desvio["comodo_id"])
                if cena_id:
                    intervencao_id = executar_intervencao(
                        cena_id, desvio["morador_id"],
                        desvio["comodo_id"], desvio_id, agora
                    )
                    # Registra para avaliação futura
                    registrar_pendente(
                        intervencao_id, desvio["morador_id"], cena_id,
                        desvio["comodo_id"], desvio_id, agora
                    )
                    # ~15% das intervenções são canceladas pelo morador (simulado)
                    # O cancelamento é agendado junto com o pendente — o status
                    # já é 'cancelada' quando avaliar_reacoes_pendentes verificar.
                    if random.random() < PROB_CANCELAMENTO:
                        cancelar_intervencao_simulada(intervencao_id, agora)
                        log.debug("Intervenção %d cancelada (simulado 15%%)", intervencao_id)
        except Exception as e:
            log.error("Erro no motor: %s", e)

        await asyncio.sleep(MOTOR_INTERVAL_SECONDS)
