"""Simulação ao vivo: moradores movem-se entre cômodos (presença via WS)."""
import asyncio
import logging
import random
from datetime import datetime

from hemera.database import fetchall, fetchone
from hemera.leitura_events import inserir_leitura_com_evento
from hemera.planta_layout import CENTROS_COMODO

log = logging.getLogger(__name__)

_estado: dict = {
    "rodando": False,
    "modo": None,
    "cenario": "luto",
    "velocidade": 1,
    "dia_simulado": 1,
    "tick": 0,
}
_task: asyncio.Task | None = None
_ws_broadcast = None


def registrar_ws_broadcast(cb) -> None:
    global _ws_broadcast
    _ws_broadcast = cb


def obter_estado() -> dict:
    return dict(_estado)


def _emitir_movimento(morador_id: int, comodo_id: int, comodo_nome: str) -> None:
    if not _ws_broadcast:
        return
    cx, cy = CENTROS_COMODO.get(comodo_nome, (400, 260))
    _ws_broadcast({
        "tipo": "morador_movimento",
        "morador_id": morador_id,
        "comodo_id": comodo_id,
        "comodo": comodo_nome,
        "x": cx,
        "y": cy,
    })


async def _loop_ao_vivo(intervalo: float) -> None:
    moradores = fetchall("SELECT id, nome FROM moradores")
    if not moradores:
        return

    while _estado["rodando"] and _estado["modo"] == "ao_vivo":
        m = random.choice(moradores)
        comodos = fetchall("SELECT id, nome FROM comodos WHERE nome != 'lavanderia'")
        if not comodos:
            await asyncio.sleep(intervalo)
            continue
        c = random.choice(comodos)

        sensor = fetchone("""
            SELECT s.id FROM sensores s
            JOIN tipos_sensor ts ON s.tipo_sensor_id = ts.id
            WHERE s.comodo_id = ? AND ts.codigo = 'presenca' AND s.ativo = 1
            LIMIT 1
        """, (c["id"],))

        if sensor:
            inserir_leitura_com_evento(sensor["id"], 1.0)
            _emitir_movimento(m["id"], c["id"], c["nome"])

        _estado["tick"] += 1
        _estado["dia_simulado"] = min(30, 1 + _estado["tick"] // 120)
        await asyncio.sleep(intervalo)


async def iniciar_ao_vivo(cenario: str = "luto", velocidade: int = 1) -> None:
    global _task
    await parar()
    _estado.update({
        "rodando": True,
        "modo": "ao_vivo",
        "cenario": cenario,
        "velocidade": max(1, min(velocidade, 60)),
        "dia_simulado": 1,
        "tick": 0,
    })
    intervalo = max(0.4, 3.0 / _estado["velocidade"])
    _task = asyncio.create_task(_loop_ao_vivo(intervalo))
    log.info("Simulação ao vivo iniciada (cenario=%s, intervalo=%.1fs)", cenario, intervalo)


async def parar() -> None:
    global _task
    _estado["rodando"] = False
    _estado["modo"] = None
    if _task and not _task.done():
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
    _task = None
