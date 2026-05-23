"""WebSocket endpoint para eventos em tempo real."""
import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

log = logging.getLogger(__name__)
router = APIRouter()

_clientes: set[WebSocket] = set()


async def broadcast(mensagem: dict) -> None:
    """Envia mensagem para todos os clientes conectados."""
    mortos: list[WebSocket] = []
    for ws in list(_clientes):
        try:
            await ws.send_text(json.dumps(mensagem, default=str))
        except Exception:
            mortos.append(ws)
    for ws in mortos:
        _clientes.discard(ws)


def broadcast_sync(mensagem: dict) -> None:
    """Wrapper síncrono para chamar a partir do motor."""
    loop = None
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        return
    if loop.is_running():
        asyncio.ensure_future(broadcast(mensagem))


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    _clientes.add(ws)
    log.info("Cliente WS conectado. Total: %d", len(_clientes))
    try:
        while True:
            # Mantém conexão viva esperando mensagens (ping/pong)
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _clientes.discard(ws)
        log.info("Cliente WS desconectado. Total: %d", len(_clientes))
