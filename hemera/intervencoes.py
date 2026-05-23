"""Execução e registro de intervenções e acionamentos."""
import logging
from datetime import datetime, timedelta

from hemera.database import execute, fetchall, fetchone

log = logging.getLogger(__name__)

# Callback registrado pelo WebSocket para broadcasting
_ws_broadcast_callback = None


def registrar_ws_callback(cb) -> None:
    global _ws_broadcast_callback
    _ws_broadcast_callback = cb


def executar_intervencao(cena_id: int, morador_id: int,
                         comodo_id: int, desvio_id: int,
                         timestamp: str | None = None) -> int:
    """
    INSERT em intervencoes + acionamentos para cada dispositivo do cômodo na cena.
    Retorna intervencao_id.
    """
    agora = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with __import__("hemera.database", fromlist=["get_connection"]).get_connection() as conn:
        cur = conn.execute("""
            INSERT INTO intervencoes (desvio_id, cena_id, morador_id, comodo_id, executada_em, status)
            VALUES (?, ?, ?, ?, ?, 'executada')
        """, (desvio_id, cena_id, morador_id, comodo_id, agora))
        intervencao_id = cur.lastrowid

        # Dispositivos do cômodo que correspondem à cena
        acoes = conn.execute("""
            SELECT cd.tipo_dispositivo_id, cd.acao_id, cd.intensidade, d.id AS dispositivo_id
            FROM cena_dispositivo cd
            JOIN dispositivos d ON d.tipo_dispositivo_id = cd.tipo_dispositivo_id
                               AND d.comodo_id = ?
                               AND d.ativo = 1
            WHERE cd.cena_id = ?
        """, (comodo_id, cena_id)).fetchall()

        for a in acoes:
            conn.execute("""
                INSERT INTO acionamentos (intervencao_id, dispositivo_id, acao_id, intensidade, acionado_em)
                VALUES (?, ?, ?, ?, ?)
            """, (intervencao_id, a["dispositivo_id"], a["acao_id"], a["intensidade"], agora))

    log.info("Intervenção %d: cena=%d morador=%d cômodo=%d",
             intervencao_id, cena_id, morador_id, comodo_id)

    if _ws_broadcast_callback:
        _ws_broadcast_callback({
            "tipo": "intervencao",
            "intervencao_id": intervencao_id,
            "cena_id": cena_id,
            "morador_id": morador_id,
            "comodo_id": comodo_id,
            "executada_em": agora,
        })

    return intervencao_id


def verificar_e_criar_bloqueio(morador_id: int, cena_id: int, timestamp: str | None = None) -> None:
    """Após 3 reações canceladas do mesmo morador na mesma cena, cria bloqueio de 7 dias."""
    row = fetchone("""
        SELECT COUNT(*) AS n
        FROM reacoes r
        JOIN intervencoes i ON r.intervencao_id = i.id
        WHERE i.morador_id = ? AND i.cena_id = ? AND r.tipo_reacao = 'cancelada'
    """, (morador_id, cena_id))
    if not row or row["n"] < 3:
        return
    agora = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    existente = fetchone("""
        SELECT id FROM bloqueios_temporarios
        WHERE morador_id = ? AND cena_id = ? AND ate > ?
    """, (morador_id, cena_id, agora))
    if existente:
        return
    ate = (datetime.fromisoformat(agora) + timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
    execute(
        "INSERT INTO bloqueios_temporarios (morador_id, cena_id, ate) VALUES (?,?,?)",
        (morador_id, cena_id, ate)
    )
    log.info("Bloqueio criado: morador=%d cena=%d ate=%s", morador_id, cena_id, ate)


def cancelar_intervencao(intervencao_id: int) -> None:
    """Registra status=cancelada, cria reação e verifica bloqueio após 3 cancelamentos."""
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    row = fetchone("SELECT morador_id, cena_id FROM intervencoes WHERE id=?", (intervencao_id,))
    execute(
        "UPDATE intervencoes SET status='cancelada' WHERE id=?",
        (intervencao_id,)
    )
    execute(
        "INSERT INTO reacoes (intervencao_id, tipo_reacao, registrada_em) VALUES (?,?,?)",
        (intervencao_id, "cancelada", agora)
    )
    if row:
        verificar_e_criar_bloqueio(row["morador_id"], row["cena_id"])


def cancelar_intervencao_simulada(intervencao_id: int, timestamp: str) -> None:
    """Cancela intervenção usando timestamp simulado (não datetime.now)."""
    row = fetchone("SELECT morador_id, cena_id FROM intervencoes WHERE id=?", (intervencao_id,))
    execute(
        "UPDATE intervencoes SET status='cancelada' WHERE id=?",
        (intervencao_id,)
    )
    execute(
        "INSERT INTO reacoes (intervencao_id, tipo_reacao, registrada_em) VALUES (?,?,?)",
        (intervencao_id, "cancelada", timestamp)
    )
    if row:
        verificar_e_criar_bloqueio(row["morador_id"], row["cena_id"], timestamp)


def registrar_reacao(intervencao_id: int, tipo: str, timestamp: str | None = None) -> None:
    """Registra reação para uma intervenção."""
    agora = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    execute(
        "INSERT INTO reacoes (intervencao_id, tipo_reacao, registrada_em) VALUES (?,?,?)",
        (intervencao_id, tipo, agora)
    )


def ajustar_peso(morador_id: int, cena_id: int, delta: float) -> None:
    """Ajusta peso de aprendizado; INSERT se não existir, UPDATE se existir."""
    existente = fetchone(
        "SELECT id, peso FROM aprendizado_pesos WHERE morador_id=? AND cena_id=?",
        (morador_id, cena_id)
    )
    agora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if existente:
        novo_peso = max(0.0, existente["peso"] + delta)
        execute(
            "UPDATE aprendizado_pesos SET peso=?, atualizado_em=? WHERE id=?",
            (novo_peso, agora, existente["id"])
        )
    else:
        execute(
            "INSERT INTO aprendizado_pesos (morador_id, cena_id, peso, atualizado_em) VALUES (?,?,?,?)",
            (morador_id, cena_id, max(0.0, 1.0 + delta), agora)
        )
