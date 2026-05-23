"""Broadcast de leituras via WebSocket."""
from datetime import datetime

from hemera.database import execute, fetchone

_ws_broadcast_callback = None


def registrar_ws_callback(cb) -> None:
    global _ws_broadcast_callback
    _ws_broadcast_callback = cb


def inserir_leitura_com_evento(sensor_id: int, valor: float, registrado_em: str | None = None) -> dict:
    ts = registrado_em or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    execute(
        "INSERT INTO leituras (sensor_id, valor, registrado_em) VALUES (?,?,?)",
        (sensor_id, valor, ts),
    )
    meta = fetchone("""
        SELECT s.id AS sensor_id, ts.codigo AS sensor_tipo, c.nome AS comodo, c.id AS comodo_id
        FROM sensores s
        JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
        JOIN comodos c ON s.comodo_id = c.id
        WHERE s.id = ?
    """, (sensor_id,))
    payload = {
        "tipo": "leitura",
        "sensor_id": sensor_id,
        "valor": valor,
        "registrado_em": ts,
        "sensor_tipo": meta["sensor_tipo"] if meta else None,
        "comodo": meta["comodo"] if meta else None,
        "comodo_id": meta["comodo_id"] if meta else None,
    }
    if _ws_broadcast_callback:
        _ws_broadcast_callback(payload)
    return payload
