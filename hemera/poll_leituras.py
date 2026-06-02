"""Publica leituras novas (batch sim) via WebSocket."""
import asyncio
import logging

from hemera.database import fetchall

log = logging.getLogger(__name__)

_ultimo_id = 0
_ws_broadcast = None


def registrar_ws_broadcast(cb) -> None:
    global _ws_broadcast
    _ws_broadcast = cb


def _carregar_ultimo_id() -> None:
    global _ultimo_id
    from hemera.database import fetchone
    row = fetchone("SELECT COALESCE(MAX(id), 0) AS m FROM leituras")
    _ultimo_id = row["m"] if row else 0


async def loop_poll_leituras() -> None:
    global _ultimo_id
    _carregar_ultimo_id()
    await asyncio.sleep(3)

    while True:
        try:
            rows = fetchall("""
                SELECT l.id, l.sensor_id, l.valor, l.registrado_em,
                       ts.codigo AS sensor_tipo, c.nome AS comodo, c.id AS comodo_id
                FROM leituras l
                JOIN sensores s ON l.sensor_id = s.id
                JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
                JOIN comodos c ON s.comodo_id = c.id
                WHERE l.id > ?
                ORDER BY l.id
                LIMIT 200
            """, (_ultimo_id,))

            for r in rows:
                _ultimo_id = r["id"]
                if _ws_broadcast and r["valor"] and r["valor"] > 0:
                    _ws_broadcast({
                        "tipo": "leitura",
                        "sensor_id": r["sensor_id"],
                        "valor": r["valor"],
                        "registrado_em": r["registrado_em"],
                        "sensor_tipo": r["sensor_tipo"],
                        "comodo": r["comodo"],
                        "comodo_id": r["comodo_id"],
                    })
        except Exception as e:
            log.debug("poll leituras: %s", e)

        await asyncio.sleep(1.5)
